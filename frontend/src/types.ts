
export interface AIResult {
    clear:    number   // 0.0 – 1.0
    humans:   number
    obstacle: number
    ms:       number   // inference time
}

export type LabelKey = 'clear' | 'humans' | 'obstacle'

export interface AlertConfig {
    label:     LabelKey
    threshold: number   // 0 – 100 (%)
    enabled:   boolean
}

export interface AppConfig {
    ip:              string
    snapshotMs:      number   // camera refresh interval
    aiMs:            number   // AI fetch interval
    alerts:          AlertConfig[]
}

export interface DataPoint {
    time:     number   // Date.now()
    clear:    number
    humans:   number
    obstacle: number
}