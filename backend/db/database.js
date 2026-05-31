const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://nguyendinhthanh2002_db_user:lechau0612@cluster0.reuoo1y.mongodb.net/?appName=Cluster0'

// ── Schemas ───────────────────────────────────

const SessionSchema = new mongoose.Schema({
    start_time: { type: Date, default: Date.now },
    end_time:   { type: Date, default: null },
    esp32_ip:   { type: String, default: null },
    notes:      { type: String, default: null },
}, { collection: 'sessions' })

const InferenceSchema = new mongoose.Schema({
    timestamp:    { type: Date, default: Date.now },
    session_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    clear_pct:    { type: Number, required: true },
    humans_pct:   { type: Number, required: true },
    obstacle_pct: { type: Number, required: true },
    label:        { type: String, required: true },
    confidence:   { type: Number, required: true },
    inference_ms: { type: Number, default: null },
}, { collection: 'inference_log' })

const SensorSchema = new mongoose.Schema({
    timestamp:   { type: Date, default: Date.now },
    session_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    distance_cm: { type: Number, required: true },
    zone:        { type: String, enum: ['ok','warn','danger','out'], required: true },
    mode:        { type: String, enum: ['M','A'], default: 'M' },
}, { collection: 'sensor_log' })

const AlertSchema = new mongoose.Schema({
    timestamp:     { type: Date, default: Date.now },
    session_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    label:         { type: String, required: true },
    value_pct:     { type: Number, required: true },
    threshold_pct: { type: Number, required: true },
}, { collection: 'alert_log' })

// ── Models ────────────────────────────────────
const Session   = mongoose.model('Session',   SessionSchema)
const Inference = mongoose.model('Inference', InferenceSchema)
const Sensor    = mongoose.model('Sensor',    SensorSchema)
const Alert     = mongoose.model('Alert',     AlertSchema)

// ── Connect ───────────────────────────────────
async function connect() {
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connected:', MONGO_URI)
}

module.exports = { connect, Session, Inference, Sensor, Alert }