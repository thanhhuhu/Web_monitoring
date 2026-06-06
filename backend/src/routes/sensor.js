//sensor.js
const express    = require('express')
const router     = express.Router()
const { Sensor } = require('../../db/database')

function getZone(d) {
    if (d >= 999) return 'out'
    if (d < 25)   return 'danger'
    if (d < 40)   return 'warn'
    return 'ok'
}

router.post('/', async (req, res) => {
    try {
        const { session_id, distance_cm, mode } = req.body
        if (distance_cm === undefined) return res.status(400).json({ ok: false, error: 'distance_cm required' })
        const doc = await Sensor.create({
            session_id: session_id || null,
            distance_cm, zone: getZone(distance_cm), mode: mode || 'M',
        })
        res.json({ ok: true, id: doc._id })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.get('/', async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit) || 100
        const filter = {}
        if (req.query.session_id) filter.session_id = req.query.session_id
        if (req.query.zone)       filter.zone       = req.query.zone
        const docs = await Sensor.find(filter).sort({ timestamp: -1 }).limit(limit)
        res.json({ ok: true, data: docs })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.get('/stats', async (req, res) => {
    try {
        const totals = await Sensor.aggregate([
            { $match: { distance_cm: { $lt: 999 } } },
            { $group: { _id: null, total: { $sum: 1 },
                    min_cm: { $min: '$distance_cm' }, max_cm: { $max: '$distance_cm' }, avg_cm: { $avg: '$distance_cm' } }}
        ])
        const byZone = await Sensor.aggregate([
            { $group: { _id: '$zone', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { zone: '$_id', count: 1, _id: 0 } }
        ])
        res.json({ ok: true, data: { totals: totals[0] || {}, byZone } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

module.exports = router