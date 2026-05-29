// ═══════════════════════════════════════════════
// chart.ts — Realtime line chart (Chart.js)
// ═══════════════════════════════════════════════

import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js'
import type { DataPoint } from './types.ts'

Chart.register(
    LineController, LineElement, PointElement,
    LinearScale, CategoryScale, Filler, Tooltip, Legend,
)

const MAX_POINTS = 60

export class RealtimeChart {
    private chart: Chart
    private data: DataPoint[] = []

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Свободно',
                        data: [],
                        borderColor: '#00c896',
                        backgroundColor: '#00c89620',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.4,
                    },
                    {
                        label: 'Человек',
                        data: [],
                        borderColor: '#00aaff',
                        backgroundColor: '#00aaff20',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.4,
                    },
                    {
                        label: 'Препятствие',
                        data: [],
                        borderColor: '#ff0033',
                        backgroundColor: '#ff003320',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: {
                            color: '#c8d8e0',
                            font: { family: 'Share Tech Mono', size: 10 },
                            boxWidth: 12,
                        },
                    },
                    tooltip: {
                        backgroundColor: '#0d1117',
                        borderColor: 'rgba(0,200,150,.3)',
                        borderWidth: 1,
                        titleColor: '#00c896',
                        bodyColor: '#c8d8e0',
                        callbacks: {
                            label: (ctx) =>
                                `${ctx.dataset.label}: ${Math.round((ctx.parsed.y as number) * 100)}%`,
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#4a6070',
                            font: { family: 'Share Tech Mono', size: 9 },
                            maxTicksLimit: 6,
                            maxRotation: 0,
                        },
                        grid: { color: 'rgba(0,200,150,.05)' },
                    },
                    y: {
                        min: 0,
                        max: 1,
                        ticks: {
                            color: '#4a6070',
                            font: { family: 'Share Tech Mono', size: 9 },
                            callback: (v) => `${Math.round((v as number) * 100)}%`,
                            maxTicksLimit: 5,
                        },
                        grid: { color: 'rgba(0,200,150,.05)' },
                    },
                },
            },
        })
    }

    push(point: DataPoint): void {
        this.data.push(point)
        if (this.data.length > MAX_POINTS) this.data.shift()

        // Dùng label thời gian đơn giản thay vì TimeScale
        const labels = this.data.map(p =>
            new Date(p.time).toLocaleTimeString('ru', { hour12: false })
        )

        this.chart.data.labels = labels
        this.chart.data.datasets[0].data = this.data.map(p => p.clear)
        this.chart.data.datasets[1].data = this.data.map(p => p.humans)
        this.chart.data.datasets[2].data = this.data.map(p => p.obstacle)
        this.chart.update('none')
    }

    clear(): void {
        this.data = []
        this.chart.data.labels = []
        this.chart.data.datasets.forEach(ds => { ds.data = [] })
        this.chart.update('none')
    }
}