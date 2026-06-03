// ═══════════════════════════════════════════════
// ui.ts — DOM update functions
// ═══════════════════════════════════════════════

import type { AIResult, AppConfig, LabelKey } from './types'

const STATUS_STYLES: Record<LabelKey, { color: string; bg: string; border: string }> = {
    clear:    { color: '#00c896', bg: 'rgba(0,200,150,.1)',  border: 'rgba(0,200,150,.3)'  },
    humans:   { color: '#00aaff', bg: 'rgba(0,170,255,.1)',  border: 'rgba(0,170,255,.3)'  },
    obstacle: { color: '#ff2244', bg: 'rgba(255,34,68,.1)',  border: 'rgba(255,34,68,.3)'  },
}

const LABEL_RU: Record<LabelKey, string> = {
    clear: 'СВОБОДНО', humans: 'ЧЕЛОВЕК', obstacle: 'ПРЕПЯТСТВИЕ',
}

function el<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null
}

function pct(v: number): string { return Math.round(v * 100) + '%' }

export function updateBars(result: AIResult): void {
    const set = (bar: string, val: string, v: number) => {
        const b = el(bar); const t = el(val)
        if (b) b.style.width = pct(v)
        if (t) t.textContent = pct(v)
    }
    set('bar-clear',    'val-clear',    result.clear)
    set('bar-humans',   'val-humans',   result.humans)
    set('bar-obstacle', 'val-obstacle', result.obstacle)
}

export function updateStatus(result: AIResult): LabelKey {
    const vals: Record<LabelKey, number> = {
        clear: result.clear, humans: result.humans, obstacle: result.obstacle,
    }
    const best = (Object.entries(vals) as [LabelKey, number][])
        .reduce((a, b) => b[1] > a[1] ? b : a)
    const lbl = best[0]
    const s   = STATUS_STYLES[lbl]

    const sb = el('status-big')
    if (sb) {
        sb.textContent = LABEL_RU[lbl] + ' ' + pct(best[1])
        sb.style.color      = s.color
        sb.style.background = s.bg
        sb.style.border     = `1px solid ${s.border}`
    }

    const badge = el('ai-badge')
    if (badge) {
        badge.textContent = LABEL_RU[lbl] + ' ' + pct(best[1])
        badge.style.color       = s.color
        badge.style.background  = s.bg
        badge.style.borderColor = s.border
        badge.style.display     = 'block'
    }

    return lbl
}

export function updateTelemetry(ping: number, ms: number): void {
    const set = (id: string, v: string) => { const e = el(id); if (e) e.textContent = v }
    set('tele-ping',    String(ping))
    set('tele-ai',      String(ms))
    set('ping-badge',   `PING: ${ping} мс`)
    set('ai-ms-badge',  `${ms} мс`)
}

export function updateCountdown(remain: number): void {
    const e = el('countdown')
    if (e) e.textContent = 'Следующий анализ: ' + (remain / 1000).toFixed(1) + ' с'
}

export function setOnline(ok: boolean): void {
    const pill = el('ai-pill')
    const txt  = el('ai-pill-txt')
    if (pill) pill.className = 'pill ' + (ok ? 'on' : 'off')
    if (txt)  txt.textContent = ok ? 'AI: ОНЛАЙН' : 'AI: OFFLINE'
}

export function setCamOnline(ok: boolean): void {
    const img      = el('cam-img')
    const noSignal = el('no-signal')
    if (ok) {
        if (img) img.style.display = 'block'
        if (noSignal) noSignal.style.display = 'none'
    } else {
        if (img) img.style.display = 'none'
        if (noSignal) noSignal.style.display = 'flex'
    }
}

export function renderAlertSettings(cfg: AppConfig, onChange: (cfg: AppConfig) => void): void {
    const container = el('alert-settings')
    if (!container) return

    container.innerHTML = cfg.alerts.map((a, i) => `
    <div class="alert-row">
      <label class="alert-toggle">
        <input type="checkbox" data-i="${i}" ${a.enabled ? 'checked' : ''}/>
        <span style="color:${a.label==='obstacle'?'var(--red)':a.label==='humans'?'var(--blue)':'var(--accent)'}">${a.label.toUpperCase()}</span>
      </label>
      <div class="alert-threshold">
        <input type="range" min="50" max="100" step="5" value="${a.threshold}" data-i="${i}"/>
        <span class="thr-val" id="thr-${i}">${a.threshold}%</span>
      </div>
    </div>
  `).join('')

    container.querySelectorAll('input[type=checkbox]').forEach(input => {
        input.addEventListener('change', e => {
            const i = parseInt((e.target as HTMLInputElement).dataset.i!)
            cfg.alerts[i].enabled = (e.target as HTMLInputElement).checked
            onChange(cfg)
        })
    })
    container.querySelectorAll('input[type=range]').forEach(input => {
        input.addEventListener('input', e => {
            const i   = parseInt((e.target as HTMLInputElement).dataset.i!)
            const val = parseInt((e.target as HTMLInputElement).value)
            cfg.alerts[i].threshold = val
            const span = document.getElementById(`thr-${i}`)
            if (span) span.textContent = val + '%'
            onChange(cfg)
        })
    })
}