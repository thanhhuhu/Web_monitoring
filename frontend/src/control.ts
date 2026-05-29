// ═══════════════════════════════════════════════
// control.ts — Keyboard & button control
// ═══════════════════════════════════════════════

import type { BluetoothManager } from './bluetooth.ts'

const KEY_MAP: Record<string, string> = {
    ArrowUp: 'F', KeyW: 'F',
    ArrowDown: 'B', KeyS: 'B',
    ArrowLeft: 'L', KeyA: 'L',
    ArrowRight: 'R', KeyD: 'R',
}

export class ControlManager {
    private bt: BluetoothManager
    private pressed = new Set<string>()

    constructor(bt: BluetoothManager) {
        this.bt = bt
        this.bindKeys()
    }

    private bindKeys(): void {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') { e.preventDefault(); void this.bt.send('S'); return }
            if (e.key  === '1')    { void this.bt.send('M'); return }
            if (e.key  === '2')    { void this.bt.send('A'); return }
            const cmd = KEY_MAP[e.code]
            if (cmd && !this.pressed.has(e.code)) {
                this.pressed.add(e.code)
                this.bt.startHold(cmd)
                this.setButtonActive(cmd, true)
            }
        })

        document.addEventListener('keyup', (e) => {
            if (this.pressed.has(e.code)) {
                this.pressed.delete(e.code)
                const cmd = KEY_MAP[e.code]
                if (cmd) this.setButtonActive(cmd, false)
                if (this.pressed.size === 0) this.bt.stopHold()
            }
        })
    }

    // Bind nút D-pad trong HTML
    bindButton(id: string, cmd: string): void {
        const el = document.getElementById(id)
        if (!el) return
        const start = () => { this.bt.startHold(cmd); el.classList.add('active') }
        const stop  = () => { this.bt.stopHold();      el.classList.remove('active') }
        el.addEventListener('mousedown',  start)
        el.addEventListener('touchstart', start, { passive: true })
        el.addEventListener('mouseup',    stop)
        el.addEventListener('touchend',   stop)
        el.addEventListener('mouseleave', stop)
    }

    bindStopButton(id: string): void {
        const el = document.getElementById(id)
        if (!el) return
        el.addEventListener('mousedown',  () => void this.bt.send('S'))
        el.addEventListener('touchstart', () => void this.bt.send('S'), { passive: true })
    }

    bindModeButton(id: string, cmd: 'M' | 'A'): void {
        document.getElementById(id)?.addEventListener('click', () => void this.bt.send(cmd))
    }

    private setButtonActive(cmd: string, active: boolean): void {
        const el = document.getElementById('dpad-' + cmd)
        if (active) el?.classList.add('active')
        else        el?.classList.remove('active')
    }
}