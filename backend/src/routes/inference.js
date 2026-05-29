const express = require('express')
const router  = express.Router()
const db      = require('../../db/database')

router.post('/', (req, res) => {
    const { session_id, clear, humans, obstacle, label, confidence, inference_ms } = req.body
    if (clear === undefined) return res.status(400).json({ ok: false, error: 'Missing fields' })
    const result = db.run(
        "INSERT INTO inference_log (session_id, clear_pct, humans_pct, obstacle_pct, label, confidence, inference_ms, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
        [session_id || null, clear, humans, obstacle, label || 'unknown', confidence || Math.max(clear, humans, obstacle), inference_ms || null]
    )
    res.json({ ok: true, id: result.lastInsertRowid })
})

router.get('/', (req, res) => {
    const limit      = parseInt(req.query.limit) || 50
    const session_id = req.query.session_id
    const label      = req.query.label
    let query = 'SELECT * FROM inference_log WHERE 1=1'
    const args = []
    if (session_id) { query += ' AND session_id = ?'; args.push(session_id) }
    if (label)      { query += ' AND label = ?';      args.push(label) }
    query += ' ORDER BY timestamp DESC LIMIT ?'
    args.push(limit)
    res.json({ ok: true, data: db.all(query, args) })
})

router.get('/stats', (req, res) => {
    const totals = db.get(`
    SELECT COUNT(*) AS total,
           ROUND(AVG(clear_pct)*100,1)    AS avg_clear,
           ROUND(AVG(humans_pct)*100,1)   AS avg_humans,
           ROUND(AVG(obstacle_pct)*100,1) AS avg_obstacle,
           ROUND(AVG(inference_ms),0)     AS avg_ms
    FROM inference_log
  `)
    const byLabel = db.all(`
    SELECT label, COUNT(*) AS count FROM inference_log GROUP BY label ORDER BY count DESC
  `)
    res.json({ ok: true, data: { totals, byLabel } })
})

module.exports = router