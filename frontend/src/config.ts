// ═══════════════════════════════════════════════
// config.ts — App configuration & persistence
// ═══════════════════════════════════════════════

import type { AppConfig } from './types.ts'

const STORAGE_KEY = 'esp32_monitor_config'

export const defaultConfig: AppConfig = {
    ip:         '192.168.0.137',
    snapshotMs: 800,
    aiMs:       5000,
    alerts: [
        { label: 'obstacle', threshold: 80, enabled: true  },
        { label: 'humans',   threshold: 80, enabled: false },
        { label: 'clear',    threshold: 90, enabled: false },
    ],
}

export function loadConfig(): AppConfig {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...defaultConfig }
        return { ...defaultConfig, ...JSON.parse(raw) }
    } catch {
        return { ...defaultConfig }
    }
}

export function saveConfig(cfg: AppConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}