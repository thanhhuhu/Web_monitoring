import { loadConfig, saveConfig }                      from './config'
import { fetchAI, getSnapshotUrl, captureAndDownload } from './api'
import { RealtimeChart }                               from './chart'
import { checkAlerts, showAlertBanner }                from './alerts'
import { addLog }                                      from './logger'
import {
    updateBars, updateStatus, updateTelemetry,
    updateCountdown, setOnline, setCamOnline,
    renderAlertSettings,
}                                                      from './ui'
import { BluetoothReceiver, type SensorData }          from './bluetooth'
import type { DataPoint }                              from './types'

const cfg      = loadConfig()
const BACKEND  = 'http://localhost:3001'   // ← địa chỉ backend

let lastAiTime = 0
let aiInterval = cfg.aiMs
let camTimer:  ReturnType<typeof setInterval>
let aiTimer:   ReturnType<typeof setInterval>
let cdTimer:   ReturnType<typeof setInterval>

let aiChart: RealtimeChart

// ── Sensor state ───────────────────────────────
let sensorCount = 0

// ── Backend helpers ────────────────────────────
function postBackend(path: string, body: object): void {
    fetch(`${BACKEND}${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
    }).catch(() => {})   // silent — не блокируем UI при ошибке
}

// ── Sensor UI ──────────────────────────────────
function updateSensorUI(data: SensorData): void {
    const dist     = data.distance
    const isOut    = dist >= 999
    const isDanger = !isOut && dist <= 10
    const isWarn   = !isOut && dist <= 30

    const color  = isDanger ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--accent)'
    const status = isOut ? 'NO DATA' : isDanger ? '⚠ STOP!' : isWarn ? '! SLOW' : '✓ CLEAR'

    const el = (id: string) => document.getElementById(id)

    const distEl = el('sensor-dist')
    if (distEl) { distEl.textContent = isOut ? '---' : dist.toFixed(1); distEl.style.color = color }

    const stEl = el('sensor-status')
    if (stEl) {
        stEl.textContent       = status
        stEl.style.color       = color
        stEl.style.borderColor = color
    }

    const gauge = el('sensor-gauge')
    if (gauge) {
        const pct = isOut ? 0 : Math.min(100, (dist / 100) * 100)
        gauge.style.width      = pct + '%'
        gauge.style.background = color
    }

    const modeEl = el('sensor-mode')
    if (modeEl) modeEl.textContent = data.mode === 'A' ? 'AUTO' : 'MANUAL'

    sensorCount++
    const countEl = el('sensor-count')
    if (countEl) countEl.textContent = String(sensorCount)
}

// ── BT Receiver ────────────────────────────────
const btReceiver = new BluetoothReceiver(
    (data: SensorData) => {
        updateSensorUI(data)
        addLog('log-body', `BT: D=${data.distance.toFixed(1)}cm M=${data.mode}`)

        // ✅ Lưu sensor vào MongoDB (chỉ khi có tín hiệu thực)
        if (data.distance < 999) {
            postBackend('/api/sensor', {
                distance_cm: data.distance,
                mode:        data.mode,
            })
        }
    },
    (ok, name) => {
        const btn = document.getElementById('bt-connect-btn')
        if (btn) {
            btn.textContent = ok ? '🔌 DISCONNECT' : '📡 CONNECT BT'
            ;(btn as HTMLElement).style.borderColor = ok ? 'var(--red)' : 'var(--blue)'
            ;(btn as HTMLElement).style.color       = ok ? 'var(--red)' : 'var(--blue)'
        }
        addLog('log-body', ok ? `📡 BT connected: ${name ?? 'HC-05'}` : '📡 BT disconnected')
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

// ── AI polling ─────────────────────────────────
async function pollAI(): Promise<void> {
    const t0 = Date.now()
    try {
        const result = await fetchAI(cfg.ip)
        const ping   = Date.now() - t0
        setOnline(true); lastAiTime = Date.now(); aiInterval = result.ms + 800

        updateBars(result)
        const label = updateStatus(result)
        updateTelemetry(ping, result.ms)

        if (aiChart) {
            aiChart.push({
                time: Date.now(),
                clear: result.clear, humans: result.humans, obstacle: result.obstacle,
            } as DataPoint)
        }

        // ✅ Lưu inference vào MongoDB — sau khi có result và label
        postBackend('/api/inference', {
            clear:        result.clear,
            humans:       result.humans,
            obstacle:     result.obstacle,
            label:        label,
            confidence:   result[label as keyof typeof result] as number,
            inference_ms: result.ms,
        })

        checkAlerts(result, cfg.alerts, (lbl, val, thr) => {
            showAlertBanner(lbl, val, thr)
            addLog('log-body', `⚠ ${lbl.toUpperCase()} ${Math.round(val)}% ≥ ${thr}%`)

            // ✅ Lưu alert vào MongoDB
            postBackend('/api/alerts', {
                label:         lbl,
                value_pct:     Math.round(val),
                threshold_pct: thr,
            })
        })

        addLog('log-body', `ИИ: ${label.toUpperCase()} ${Math.round(result[label as keyof typeof result] as number * 100)}% | ${ping}мс`)
    } catch {
        setOnline(false)
        addLog('log-body', `Ошибка подключения: ${cfg.ip}`)
    }
}

// ── Timers ─────────────────────────────────────
function startTimers(): void {
    clearInterval(camTimer); clearInterval(aiTimer); clearInterval(cdTimer)
    refreshCam(); void pollAI()
    camTimer = setInterval(refreshCam, cfg.snapshotMs)
    aiTimer  = setInterval(() => void pollAI(), cfg.aiMs)
    cdTimer  = setInterval(() => {
        const remain = Math.max(0, aiInterval - (Date.now() - lastAiTime))
        updateCountdown(remain)
    }, 300)
}

function reconnect(): void {
    const input = document.getElementById('ip-input') as HTMLInputElement
    cfg.ip = input.value.trim(); saveConfig(cfg)
    if (aiChart) aiChart.clear()
    addLog('log-body', `Подключение к ${cfg.ip}...`)
    startTimers()
}

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    aiChart = new RealtimeChart('realtime-chart')

    const ipInput = document.getElementById('ip-input') as HTMLInputElement
    if (ipInput) ipInput.value = cfg.ip

    document.getElementById('connect-btn')?.addEventListener('click', reconnect)

    document.getElementById('bt-connect-btn')?.addEventListener('click', async () => {
        if (btReceiver.isConnected) {
            btReceiver.disconnect()
        } else {
            try {
                addLog('log-body', 'Connecting BT...')
                await btReceiver.connect()
            } catch (e) {
                addLog('log-body', 'BT error: ' + (e as Error).message)
            }
        }
    })

    document.getElementById('capture-btn')?.addEventListener('click', async () => {
        const btn  = document.getElementById('capture-btn')!
        const orig = btn.textContent
        btn.textContent = '⏳'; btn.setAttribute('disabled', 'true')
        try {
            const f = await captureAndDownload(cfg.ip)
            addLog('log-body', `📷 Снимок сохранён: ${f}`)
            btn.textContent = '✓'
        } catch { btn.textContent = orig }
        setTimeout(() => { btn.textContent = orig; btn.removeAttribute('disabled') }, 2000)
    })

    renderAlertSettings(cfg, () => saveConfig(cfg))
    addLog('log-body', 'Система инициализирована...')
    addLog('log-body', `IP: ${cfg.ip}`)
    startTimers()
})