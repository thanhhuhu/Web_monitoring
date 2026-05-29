// ═══════════════════════════════════════════════
// src/backendApi.ts — Gọi backend từ web TypeScript
// ═══════════════════════════════════════════════

const BACKEND = 'http://localhost:3001'

// ── Session ────────────────────────────────────
export async function startSession(esp32_ip: string): Promise<number> {
    const res  = await fetch(`${BACKEND}/api/sessions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ esp32_ip }),
    })
    const data = await res.json()
    return data.data.id as number
}

export async function endSession(sessionId: number): Promise<void> {
    await fetch(`${BACKEND}/api/sessions/${sessionId}/end`, { method: 'PATCH' })
}

// ── Inference ──────────────────────────────────
export async function saveInference(
    sessionId: number | null,
    clear: number, humans: number, obstacle: number,
    label: string, inference_ms: number
): Promise<void> {
    await fetch(`${BACKEND}/api/inference`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id:   sessionId,
            clear, humans, obstacle, label,
            confidence:   Math.max(clear, humans, obstacle),
            inference_ms,
        }),
    })
}

// ── Sensor ─────────────────────────────────────
export async function saveSensor(
    sessionId: number | null,
    distance_cm: number,
    mode: 'M' | 'A'
): Promise<void> {
    await fetch(`${BACKEND}/api/sensor`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, distance_cm, mode }),
    })
}

// ── Alert ──────────────────────────────────────
export async function saveAlert(
    sessionId: number | null,
    label: string, value_pct: number, threshold_pct: number
): Promise<void> {
    await fetch(`${BACKEND}/api/alerts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, label, value_pct, threshold_pct }),
    })
}

// ── Stats ──────────────────────────────────────
export async function fetchStats() {
    const res = await fetch(`${BACKEND}/api/stats`)
    return res.json()
}

export async function fetchSessions(limit = 20) {
    const res = await fetch(`${BACKEND}/api/sessions?limit=${limit}`)
    return res.json()
}