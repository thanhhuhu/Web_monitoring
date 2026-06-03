// bluetooth.ts — nhận data HC-SR04 từ HC-05 5A
// Format: "D:25.3,M:A\n"

const SVC  = '0000ffe0-0000-1000-8000-00805f9b34fb'
const CHAR = '0000ffe1-0000-1000-8000-00805f9b34fb'

export interface SensorData {
    distance: number    // cm, 999 = không có tín hiệu
    mode:     'M' | 'A'
    raw:      string
}

type SensorCallback     = (data: SensorData) => void
type ConnectionCallback = (connected: boolean, name?: string) => void

export class BluetoothReceiver {
    private device:         BluetoothDevice | null = null
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null
    private connected     = false
    private buf           = ''
    private reconnTimer:  ReturnType<typeof setTimeout> | null = null
    private onSensor:     SensorCallback
    private onConnection: ConnectionCallback

    constructor(onSensor: SensorCallback, onConnection: ConnectionCallback) {
        this.onSensor     = onSensor
        this.onConnection = onConnection
    }

    get isConnected(): boolean { return this.connected }

    async connect(): Promise<void> {
        this.device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [SVC],
        })
        this.device.addEventListener('gattserverdisconnected', () => this.handleDisconnect(true))
        await this.connectGATT()
    }

    disconnect(): void {
        this.stopFlag  = true
        this.connected = false
        this.reader?.cancel().catch(() => {})
        this.reader = null
        this.port?.close().catch(() => {})
        this.port = null
        this.onConnection(false)
    }

    private async readLoop(): Promise<void> {
        if (!this.port?.readable) return

        const decoder = new TextDecoderStream()
        this.port.readable.pipeTo(decoder.writable).catch(() => {})
        this.reader = decoder.readable.getReader()

        try {
            while (this.connected) {
                const { value, done } = await this.reader.read()
                if (done || this.stopFlag) break
                if (value) {
                    this.buf += value
                    const lines = this.buf.split('\n')
                    this.buf = lines.pop() ?? ''
                    lines.forEach(line => this.parseLine(line.trim()))
                }
            }
        } catch {
            // port bị ngắt
        } finally {
            this.reader = null
            if (this.connected && !this.stopFlag) {
                this.onConnection(false)
                // ✅ Auto reconnect sau 3s
                this.scheduleReconnect()
            }
        }
    }

    private async scheduleReconnect(): Promise<void> {
        if (this.stopFlag || !this.port) return
        await new Promise(r => setTimeout(r, 3000))
        if (this.stopFlag) return

        try {
            // Mở lại port cũ — không cần user chọn lại
            await this.port.open({ baudRate: 9600 })
            this.connected = true
            this.onConnection(true, 'HC-05')
            this.readLoop()
        } catch {
            // Thử lại lần nữa
            this.scheduleReconnect()
        }
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

    private handleRawData(value: DataView): void {
        this.buf += new TextDecoder().decode(value)
        const lines = this.buf.split('\n')
        this.buf = lines.pop() ?? ''
        lines.forEach(line => this.parseLine(line.trim()))
    }

    // Format: "D:25.3,M:A"
    private parseLine(line: string): void {
        if (!line) return
        const match = line.match(/D:([0-9.]+),M:([MA])/)
        if (!match) return
        this.onSensor({
            distance: parseFloat(match[1]),
            mode:     match[2] as 'M' | 'A',
            raw:      line,
        })
    }

    private handleDisconnect(tryReconnect = false): void {
        this.connected     = false
        this.characteristic = null
        this.onConnection(false)
        if (tryReconnect && this.device) {
            this.reconnTimer = setTimeout(async () => {
                try { await this.connectGATT() } catch { /* silent */ }
            }, 3000)
        }
    }
}