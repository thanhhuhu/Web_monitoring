// ═══════════════════════════════════════════════
// bluetooth.ts — Chỉ NHẬN dữ liệu từ HC-05 #2
// Không gửi lệnh — ổn định hơn nhiều
// ═══════════════════════════════════════════════

const SVC  = '0000ffe0-0000-1000-8000-00805f9b34fb'
const CHAR = '0000ffe1-0000-1000-8000-00805f9b34fb'

export interface SensorData {
    distance: number   // cm, 999 = ngoài tầm
    mode:     'M' | 'A'
}

type DataCallback       = (data: SensorData) => void
type ConnectionCallback = (connected: boolean, name?: string) => void

export class BluetoothReceiver {
    private device:         BluetoothDevice | null = null
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null
    private connected     = false
    private buf           = ''
    private reconnTimer:  ReturnType<typeof setTimeout> | null = null
    private onData:       DataCallback
    private onConnection: ConnectionCallback

    constructor(onData: DataCallback, onConnection: ConnectionCallback) {
        this.onData       = onData
        this.onConnection = onConnection
    }

    get isConnected(): boolean { return this.connected }

    async connect(): Promise<void> {
        this.device = await navigator.bluetooth.requestDevice({
            filters:          [{ name: 'HC-05' }],
            optionalServices: [SVC],
        })
        this.device.addEventListener('gattserverdisconnected', () => {
            this.handleDisconnect(true)
        })
        await this.connectGATT()
    }

    private async connectGATT(): Promise<void> {
        if (!this.device) return
        const server  = await this.device.gatt!.connect()
        const service = await server.getPrimaryService(SVC)
        this.characteristic = await service.getCharacteristic(CHAR)
        await this.characteristic.startNotifications()
        this.characteristic.addEventListener(
            'characteristicvaluechanged',
            (e) => this.handleRawData((e.target as BluetoothRemoteGATTCharacteristic).value!)
        )
        this.connected = true
        this.onConnection(true, this.device.name)
    }

    disconnect(): void {
        if (this.reconnTimer) { clearTimeout(this.reconnTimer); this.reconnTimer = null }
        this.connected = false
        if (this.device?.gatt?.connected) this.device.gatt.disconnect()
        this.onConnection(false)
    }

    private handleRawData(value: DataView): void {
        this.buf += new TextDecoder().decode(value)
        const lines = this.buf.split('\n')
        this.buf = lines.pop() ?? ''
        lines.forEach(line => this.parseLine(line.trim()))
    }

    private parseLine(line: string): void {
        if (!line.startsWith('D:')) return
        const parts: Record<string, string> = {}
        line.split(',').forEach(p => {
            const [k, v] = p.split(':')
            if (k && v !== undefined) parts[k] = v
        })
        const distance = parseFloat(parts['D'] ?? '999')
        const mode     = (parts['M'] === 'A' ? 'A' : 'M') as 'M' | 'A'
        if (!isNaN(distance)) this.onData({ distance, mode })
    }

    private handleDisconnect(tryReconnect = false): void {
        this.connected = false
        this.characteristic = null
        this.onConnection(false)
        if (tryReconnect && this.device) {
            this.reconnTimer = setTimeout(async () => {
                try { await this.connectGATT() } catch { /* silent */ }
            }, 3000)
        }
    }
}