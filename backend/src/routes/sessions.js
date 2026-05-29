const express = require('express')
const router  = express.Router()
const db      = require('../../db/database')

router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 20
    const rows = db.all(
        'SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?',
        [limit]
    )
    res.json({ ok: true, data: rows })
})

router.get('/:id', (req, res) => {
    const session = db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id])
    if (!session) return res.status(404).json({ ok: false, error: 'Not found' })
    const inferences = db.all('SELECT * FROM inference_log WHERE session_id = ? ORDER BY timestamp DESC LIMIT 100', [req.params.id])
    const sensors    = db.all('SELECT * FROM sensor_log    WHERE session_id = ? ORDER BY timestamp DESC LIMIT 100', [req.params.id])
    const alerts     = db.all('SELECT * FROM alert_log     WHERE session_id = ? ORDER BY timestamp DESC', [req.params.id])
    res.json({ ok: true, data: { session, inferences, sensors, alerts } })
})

router.post('/', (req, res) => {
    const { esp32_ip, notes } = req.body
    const result  = db.run(
        "INSERT INTO sessions (esp32_ip, notes, start_time) VALUES (?, ?, datetime('now'))",
        [esp32_ip || null, notes || null]
    )
    const session = db.get('SELECT * FROM sessions WHERE id = ?', [result.lastInsertRowid])
    res.json({ ok: true, data: session })
})

router.patch('/:id/end', (req, res) => {
    db.run("UPDATE sessions SET end_time = datetime('now') WHERE id = ?", [req.params.id])
    const session = db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id])
    res.json({ ok: true, data: session })
})

module.exports = router