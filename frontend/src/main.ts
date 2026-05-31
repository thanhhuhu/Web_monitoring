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
import type { DataPoint }                              from './types'

const cfg      = loadConfig()
let lastAiTime = 0
let aiInterval = cfg.aiMs
let camTimer:  ReturnType<typeof setInterval>
let aiTimer:   ReturnType<typeof setInterval>
let cdTimer:   ReturnType<typeof setInterval>

let aiChart: RealtimeChart

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
            aiChart.push({ time: Date.now(), clear: result.clear, humans: result.humans, obstacle: result.obstacle } as DataPoint)
        }
        checkAlerts(result, cfg.alerts, (lbl, val, thr) => {
            showAlertBanner(lbl, val, thr)
            addLog('log-body', `⚠ ${lbl.toUpperCase()} ${Math.round(val)}% ≥ ${thr}%`)
        })
        addLog('log-body', `AI: ${label.toUpperCase()} ${Math.round(result[label] * 100)}% | ${ping}ms`)
    } catch {
        setOnline(false)
        addLog('log-body', `Connection error: ${cfg.ip}`)
    }
}

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
    addLog('log-body', `Connecting to ${cfg.ip}...`)
    startTimers()
}

document.addEventListener('DOMContentLoaded', () => {
    aiChart = new RealtimeChart('realtime-chart')

    const ipInput = document.getElementById('ip-input') as HTMLInputElement
    if (ipInput) ipInput.value = cfg.ip

    document.getElementById('connect-btn')?.addEventListener('click', reconnect)

    document.getElementById('capture-btn')?.addEventListener('click', async () => {
        const btn  = document.getElementById('capture-btn')!
        const orig = btn.textContent
        btn.textContent = '⏳'; btn.setAttribute('disabled', 'true')
        try {
            const f = await captureAndDownload(cfg.ip)
            addLog('log-body', `📷 Snapshot: ${f}`)
            btn.textContent = '✓'
        } catch { btn.textContent = orig }
        setTimeout(() => { btn.textContent = orig; btn.removeAttribute('disabled') }, 2000)
    })

    renderAlertSettings(cfg, () => saveConfig(cfg))
    addLog('log-body', 'System ready')
    addLog('log-body', `IP: ${cfg.ip}`)
    startTimers()
})