
const MAX_LINES = 8

export function addLog(containerId: string, msg: string): void {
    const el = document.getElementById(containerId)
    if (!el) return
    const t = new Date().toLocaleTimeString('vi', { hour12: false })
    const line = document.createElement('div')
    line.className = 'log-line'
    line.textContent = `► [${t}] ${msg}`
    el.appendChild(line)
    while (el.children.length > MAX_LINES) el.removeChild(el.firstChild!)
    // Highlight last line
    Array.from(el.children).forEach((c, i, arr) => {
        ;(c as HTMLElement).style.opacity = i === arr.length - 1 ? '1' : '0.5'
        ;(c as HTMLElement).style.color = i === arr.length - 1 ? 'var(--accent)' : 'var(--muted)'
    })
}