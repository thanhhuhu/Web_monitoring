// ═══════════════════════════════════════════════
// sensor.ts — HC-SR04 state & stats
// ═══════════════════════════════════════════════

import type { SensorData } from './bluetooth.ts'

export interface SensorStats {
    min: number
    max: number
    avg: number
    count: number
}

export type DistZone = 'danger' | 'warn' | 'ok' | 'out'

export function getZone(dist: number): DistZone {
    if (dist >= 999) return 'out'
    if (dist < 25)   return 'danger'
    if (dist < 40)   return 'warn'
    return 'ok'
}

export class SensorState {
    private _stats: SensorStats = { min: Infinity, max: 0, avg: 0, count: 0 }
    private _sum = 0
    private history: number[] = []
    readonly MAX_HISTORY = 50

    update(data: SensorData): void {
        const d = data.distance
        this.history.push(d >= 999 ? -1 : d)
        if (this.history.length > this.MAX_HISTORY) this.history.shift()

        if (d < 999) {
            this._stats.min = Math.min(this._stats.min, d)
            this._stats.max = Math.max(this._stats.max, d)
            this._sum += d
            this._stats.count++
            this._stats.avg = this._sum / this._stats.count
        }
    }

    get stats(): SensorStats { return this._stats }
    get chartHistory(): number[] { return this.history }
}