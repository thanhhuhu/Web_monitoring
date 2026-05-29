// ═══════════════════════════════════════════════
// main.ts — AI Monitor + HC-SR04 via BT receive
// Điện thoại: Serial BT Terminal → HC-05 #1 (điều khiển)
// Máy tính:   Web → HC-05 #2 (nhận dữ liệu cảm biến)
// ═══════════════════════════════════════════════

import { loadConfig, saveConfig }                      from './config.ts'
import { fetchAI, getSnapshotUrl, captureAndDownload } from './api.ts'
import { RealtimeChart }                               from './chart.ts'
import { checkAlerts, showAlertBanner }                from './alerts.ts'
import { addLog }                                      from './logger.ts'
import {
    updateBars, updateStatus, updateTelemetry,
    updateCountdown, setOnline, setCamOnline,
    renderAlertSettings,
}                                                      from './ui.ts'
import { BluetoothReceiver }                           from './bluetooth.ts'
import { SensorState, getZone }                        from './sensor.ts'
import type { DataPoint }                              from './types.ts'
import { startSession, saveInference, saveSensor, saveAlert } from './backendAPI.ts'
// Boot: tạo session
const sessionId = await startSession(cfg.ip)

// Sau pollAI():
await saveInference(sessionId, result.clear, result.humans, result.obstacle, label, result.ms)

// Sau nhận BT sensor:
await saveSensor(sessionId, data.distance, data.mode)

// Trong checkAlerts callback:
await saveAlert(sessionId, lbl, val, thr)
// ── Config ─────────────────────────────────────
let cfg        = loadConfig()
let lastAiTime = 0
let aiInterval = cfg.aiMs
let camTimer:  ReturnType<typeof setInterval>
let aiTimer:   ReturnType<typeof setInterval>
let cdTimer:   ReturnType<typeof setInterval>

// ── AI Chart ───────────────────────────────────
const aiChart = new RealtimeChart('realtime-chart')

// ── BT Receiver (HC-05 #2) ─────────────────────
const sensorState = new SensorState()
const btReceiver  = new BluetoothReceiver(
    (data) => {
        sensorState.update(data.distance)
        updateSensorUI(data.distance, data.mode)
    },
    (ok, name) => {
        setBTStatus(ok, name)
        addLog('log-body', ok
            ? `📡 BT подключён: ${name ?? 'HC-05'}`
            : '📡 BT отключён — переподключение...')
    }
)

// ── Camera ─────────────────────────────────────
function refreshCam(): void {
    const img = new Image()
    img.onload = () => {
        const el = document.getElementById('cam-img') as HTMLImageElement
        el.src = img.src; setCamOnline(true)
    }
    img.onerror = () => setCamOnline(false)
    img.src = getSnapshotUrl(cfg.ip)
    const t = document.getElementById('cam-time')
    if (t) t.textContent = new Date().toLocaleTimeString('ru', { hour12: false })
}

// ── AI fetch ───────────────────────────────────
async function pollAI(): Promise<void> {
    const t0 = Date.now()
    try {
        const result = await fetchAI(cfg.ip)
        const ping   = Date.now() - t0
        setOnline(true); lastAiTime = Date.now(); aiInterval = result.ms + 800
        updateBars(result)
        const label = updateStatus(result)
        updateTelemetry(ping, result.ms)
        aiChart.push({ time: Date.now(), clear: result.clear, humans: result.humans, obstacle: result.obstacle } as DataPoint)
        checkAlerts(result, cfg.alerts, (lbl, val, thr) => {
            showAlertBanner(lbl, val, thr)
            addLog('log-body', `⚠ ${lbl.toUpperCase()} ${Math.round(val)}% ≥ ${thr}%`)
        })
        addLog('log-body', `ИИ: ${label.toUpperCase()} ${Math.round(result[label] * 100)}% | ${ping}мс`)
    } catch {
        setOnline(false)
        addLog('log-body', `Ошибка: ${cfg.ip}`)
    }
}

// ── Sensor UI ──────────────────────────────────
const ZONE_STYLE = {
    ok:     { color:'#00c896', bg:'rgba(0,200,150,.1)', bd:'rgba(0,200,150,.3)', text:'✓ СВОБОДНО'  },
    warn:   { color:'#ffaa00', bg:'rgba(255,170,0,.1)', bd:'rgba(255,170,0,.3)', text:'! ЗАМЕДЛИТЬ' },
    danger: { color:'#ff2244', bg:'rgba(255,34,68,.1)', bd:'rgba(255,34,68,.3)', text:'⚠ СТОП!'     },
    out:    { color:'#3a5060', bg:'rgba(74,96,112,.05)',bd:'rgba(74,96,112,.2)', text:'ВНЕ ЗОНЫ'    },
}

function updateSensorUI(dist: number, mode: 'M' | 'A'): void {
    const zone = getZone(dist)
    const s    = ZONE_STYLE[zone]

    const setEl = (id: string, v: string) => {
        const e = document.getElementById(id); if (e) e.textContent = v
    }
    const setStyle = (id: string, styles: Partial<CSSStyleDeclaration>) => {
        const e = document.getElementById(id) as HTMLElement | null
        if (e) Object.assign(e.style, styles)
    }

    // Số lớn
    setEl('sensor-dist', dist >= 999 ? '---' : dist.toFixed(1))
    setStyle('sensor-dist', { color: s.color })
    const dEl = document.getElementById('sensor-dist')
    if (dEl) dEl.className = 'sensor-num ' + zone

    // Badge và status
    setEl('sensor-badge', dist >= 999 ? '-- см' : dist.toFixed(1) + ' см')
    setEl('sensor-status', s.text)
    setStyle('sensor-status', { color: s.color, background: s.bg, borderColor: s.bd })

    // Gauge
    const gauge = document.getElementById('sensor-gauge')
    if (gauge) {
        gauge.style.width      = Math.min(100, (Math.min(dist, 100) / 100) * 100) + '%'
        gauge.style.background = s.color
    }

    // Stats
    setEl('stat-min', isFinite(sensorState.min) ? sensorState.min.toFixed(1) : '--')
    setEl('stat-avg', sensorState.avg > 0 ? sensorState.avg.toFixed(1) : '--')
    setEl('stat-max', sensorState.max > 0 ? sensorState.max.toFixed(1) : '--')

    // Mode
    const mb = document.getElementById('car-mode-badge')
    if (mb) {
        mb.textContent = mode === 'A' ? 'АВТО (A)' : 'РУЧНОЙ (M)'
        mb.className   = 'mode-badge mode-' + mode
    }

    // Sensor chart
    drawSensorChart()
}

function drawSensorChart(): void {
    const canvas = document.getElementById('sensor-chart') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W; canvas.height = H
    ctx.clearRect(0, 0, W, H)
    const hist = sensorState.chartHistory.filter(v => v >= 0)
    if (hist.length < 2) return
    const maxD = Math.max(100, ...hist)

    // Vùng nền
    const yStop = H - (25 / maxD) * H
    const ySlow = H - (40 / maxD) * H
    ctx.fillStyle = 'rgba(255,34,68,.07)';  ctx.fillRect(0, yStop, W, H - yStop)
    ctx.fillStyle = 'rgba(255,170,0,.05)'; ctx.fillRect(0, ySlow, W, yStop - ySlow)
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = 'rgba(255,34,68,.25)';  ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, yStop); ctx.lineTo(W, yStop); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,170,0,.25)'
    ctx.beginPath(); ctx.moveTo(0, ySlow); ctx.lineTo(W, ySlow); ctx.stroke()
    ctx.setLineDash([])

    // Line
    ctx.strokeStyle = '#00c896'; ctx.lineWidth = 2
    ctx.beginPath()
    hist.forEach((v, i) => {
        const x = (i / (hist.length - 1)) * W
        const y = H - (v / maxD) * H
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Điểm cuối
    const last = hist[hist.length - 1]
    const lx = W - 4, ly = H - (last / maxD) * H
    ctx.fillStyle = last < 25 ? '#ff2244' : last < 40 ? '#ffaa00' : '#00c896'
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill()
}

// ── BT status UI ───────────────────────────────
function setBTStatus(ok: boolean, name?: string): void {
    const pill = document.getElementById('bt-pill')
    const txt  = document.getElementById('bt-pill-txt')
    const btn  = document.getElementById('bt-connect-btn')
    if (pill) pill.className = 'pill ' + (ok ? 'bt-on' : 'off')
    if (txt)  txt.textContent = ok ? `BT: ${name ?? 'HC-05'}` : 'BT: OFFLINE'
    if (btn) {
        btn.textContent = ok ? '🔌 ОТКЛ. BT' : '📡 ПОДКЛ. BT'
        ;(btn as HTMLElement).style.borderColor = ok ? 'var(--red)' : 'var(--blue)'
        ;(btn as HTMLElement).style.color       = ok ? 'var(--red)' : 'var(--blue)'
    }
}

// ── Timers ─────────────────────────────────────
function startTimers(): void {
    clearInterval(camTimer); clearInterval(aiTimer); clearInterval(cdTimer)
    refreshCam(); pollAI()
    camTimer = setInterval(refreshCam, cfg.snapshotMs)
    aiTimer  = setInterval(pollAI, cfg.aiMs)
    cdTimer  = setInterval(() => {
        const remain = Math.max(0, aiInterval - (Date.now() - lastAiTime))
        updateCountdown(remain)
    }, 300)
}

function reconnect(): void {
    const input = document.getElementById('ip-input') as HTMLInputElement
    cfg.ip = input.value.trim(); saveConfig(cfg)
    aiChart.clear()
    addLog('log-body', `Подключение к ${cfg.ip}...`)
    startTimers()
}

// ── Boot ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const ipInput = document.getElementById('ip-input') as HTMLInputElement
    if (ipInput) ipInput.value = cfg.ip

    document.getElementById('connect-btn')?.addEventListener('click', reconnect)

    document.getElementById('capture-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('capture-btn')!
        const orig = btn.textContent
        btn.textContent = '⏳'; btn.setAttribute('disabled', 'true')
        try {
            const f = await captureAndDownload(cfg.ip)
            addLog('log-body', `📷 Снимок: ${f}`)
            btn.textContent = '✓'
        } catch { btn.textContent = orig }
        setTimeout(() => { btn.textContent = orig; btn.removeAttribute('disabled') }, 2000)
    })

    document.getElementById('bt-connect-btn')?.addEventListener('click', async () => {
        if (btReceiver.isConnected) {
            btReceiver.disconnect()
        } else {
            try {
                addLog('log-body', 'Подключение BT...')
                await btReceiver.connect()
            } catch (e) {
                addLog('log-body', 'Ошибка BT: ' + (e as Error).message)
            }
        }
    })

    renderAlertSettings(cfg, () => saveConfig(cfg))
    addLog('log-body', 'Система инициализирована...')
    addLog('log-body', `Подключение к ${cfg.ip}`)
    startTimers()
})