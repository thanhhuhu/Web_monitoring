
import type { AIResult, AlertConfig, LabelKey } from './types.ts'

// Cooldown để không spam alert liên tục
const ALERT_COOLDOWN_MS = 10_000
const lastAlertTime: Record<LabelKey, number> = {
    clear: 0, humans: 0, obstacle: 0,
}

const labelNames: Record<LabelKey, string> = {
    clear:    'СВОБОДНО',
    humans:   'ЧЕЛОВЕК',
    obstacle: 'ПРЕПЯТСТВИЕ',
}

export function checkAlerts(
    result: AIResult,
    configs: AlertConfig[],
    onAlert: (label: LabelKey, value: number, threshold: number) => void,
): void {
    const now = Date.now()
    for (const cfg of configs) {
        if (!cfg.enabled) continue
        const value = result[cfg.label] * 100
        if (value >= cfg.threshold && now - lastAlertTime[cfg.label] > ALERT_COOLDOWN_MS) {
            lastAlertTime[cfg.label] = now
            onAlert(cfg.label, value, cfg.threshold)
        }
    }
}

export function showAlertBanner(label: LabelKey, value: number, threshold: number): void {
    let banner = document.getElementById('alert-banner')
    if (!banner) {
        banner = document.createElement('div')
        banner.id = 'alert-banner'
        banner.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      z-index: 9999; font-family: 'Share Tech Mono', monospace;
      font-size: 14px; font-weight: bold; letter-spacing: 2px;
      padding: 10px 24px; border-radius: 4px;
      border: 1px solid; animation: bannerIn .3s ease;
      pointer-events: none;
    `
        document.body.appendChild(banner)
    }

    const colors: Record<LabelKey, { color: string; bg: string; border: string }> = {
        obstacle: { color: '#ff0033', bg: 'rgba(255,0,51,.15)',  border: '#ff0033' },
        humans:   { color: '#00aaff', bg: 'rgba(0,170,255,.15)', border: '#00aaff' },
        clear:    { color: '#00c896', bg: 'rgba(0,200,150,.15)', border: '#00c896' },
    }
    const c = colors[label]
    banner.style.color       = c.color
    banner.style.background  = c.bg
    banner.style.borderColor = c.border
    banner.textContent = `⚠ ${labelNames[label]} ${Math.round(value)}% ≥ ${threshold}%`
    banner.style.display = 'block'

    clearTimeout((banner as HTMLElement & { _t?: ReturnType<typeof setTimeout> })._t)
    ;(banner as HTMLElement & { _t?: ReturnType<typeof setTimeout> })._t =
        setTimeout(() => { banner!.style.display = 'none' }, 4000)
}