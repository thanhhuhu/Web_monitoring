const express = require('express')
const router  = express.Router()
const db      = require('../../db/database')

function getZone(d) {
    if (d >= 999) return 'out'
    if (d < 25)   return 'danger'
    if (d < 40)   return 'warn'
    return 'ok'
}

router.post('/', (req, res) => {
    const { session_id, distance_cm, mode } = req.body
    if (distance_cm === undefined) return res.status(400).json({ ok: false, error: 'distance_cm required' })
    const result = db.run(
        "INSERT INTO sensor_log (session_id, distance_cm, zone, mode, timestamp) VALUES (?, ?, ?, ?, datetime('now'))",
        [session_id || null, distance_cm, getZone(distance_cm), mode || 'M']
    )
    res.json({ ok: true, id: result.lastInsertRowid })
})

router.get('/', (req, res) => {
    const limit      = parseInt(req.query.limit) || 100
    const session_id = req.query.session_id
    const zone       = req.query.zone
    let query = 'SELECT * FROM sensor_log WHERE 1=1'
    const args = []
    if (session_id) { query += ' AND session_id = ?'; args.push(session_id) }
    if (zone)       { query += ' AND zone = ?';       args.push(zone) }
    query += ' ORDER BY timestamp DESC LIMIT ?'
    args.push(limit)
    res.json({ ok: true, data: db.all(query, args) })
})

router.get('/stats', (req, res) => {
    const totals = db.get(`
    SELECT COUNT(*) AS total,
           ROUND(MIN(distance_cm),1) AS min_cm,
           ROUND(MAX(distance_cm),1) AS max_cm,
           ROUND(AVG(distance_cm),1) AS avg_cm
    FROM sensor_log WHERE distance_cm < 999
  `)
    const byZone = db.all('SELECT zone, COUNT(*) AS count FROM sensor_log GROUP BY zone ORDER BY count DESC')
    res.json({ ok: true, data: { totals, byZone } })
})

module.exports = router