const express = require('express')
const router  = express.Router()
const db      = require('../../db/database')

router.post('/', (req, res) => {
    const { session_id, label, value_pct, threshold_pct } = req.body
    if (!label || value_pct === undefined) return res.status(400).json({ ok: false, error: 'Missing fields' })
    const result = db.run(
        "INSERT INTO alert_log (session_id, label, value_pct, threshold_pct, timestamp) VALUES (?, ?, ?, ?, datetime('now'))",
        [session_id || null, label, value_pct, threshold_pct]
    )
    res.json({ ok: true, id: result.lastInsertRowid })
})

router.get('/', (req, res) => {
    const limit      = parseInt(req.query.limit) || 50
    const session_id = req.query.session_id
    let query = 'SELECT * FROM alert_log WHERE 1=1'
    const args = []
    if (session_id) { query += ' AND session_id = ?'; args.push(session_id) }
    query += ' ORDER BY timestamp DESC LIMIT ?'
    args.push(limit)
    res.json({ ok: true, data: db.all(query, args) })
})

module.exports = router