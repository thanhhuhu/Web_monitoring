// ═══════════════════════════════════════════════
// api.ts — ESP32-CAM API calls
// ═══════════════════════════════════════════════

import type { AIResult } from './types.ts'

export async function fetchAI(ip: string): Promise<AIResult> {
    const res = await fetch(`http://${ip}/ai`, {
        signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<AIResult>
}

export function getSnapshotUrl(ip: string): string {
    return `http://${ip}/snapshot?t=${Date.now()}`
}

export async function captureAndDownload(ip: string): Promise<string> {
    const url = `http://${ip}/snapshot?t=${Date.now()}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)

    const t = new Date()
    const filename = `capture_${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}${String(t.getDate()).padStart(2,'0')}_${String(t.getHours()).padStart(2,'0')}${String(t.getMinutes()).padStart(2,'0')}${String(t.getSeconds()).padStart(2,'0')}.jpg`

    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objUrl)

    return filename
}