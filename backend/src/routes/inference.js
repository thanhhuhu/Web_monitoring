const express      = require('express')
const router       = express.Router()
const { Inference } = require('../../db/database')

router.post('/', async (req, res) => {
    try {
        const { session_id, clear, humans, obstacle, label, confidence, inference_ms } = req.body
        if (clear === undefined) return res.status(400).json({ ok: false, error: 'Missing fields' })
        const doc = await Inference.create({
            session_id: session_id || null,
            clear_pct: clear, humans_pct: humans, obstacle_pct: obstacle,
            label: label || 'unknown',
            confidence: confidence || Math.max(clear, humans, obstacle),
            inference_ms: inference_ms || null,
        })
        res.json({ ok: true, id: doc._id })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.get('/', async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit) || 50
        const filter = {}
        if (req.query.session_id) filter.session_id = req.query.session_id
        if (req.query.label)      filter.label      = req.query.label
        const docs = await Inference.find(filter).sort({ timestamp: -1 }).limit(limit)
        res.json({ ok: true, data: docs, count: docs.length })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.get('/stats', async (req, res) => {
    try {
        const totals = await Inference.aggregate([{ $group: {
                _id: null, total: { $sum: 1 },
                avg_clear: { $avg: '$clear_pct' }, avg_humans: { $avg: '$humans_pct' },
                avg_obstacle: { $avg: '$obstacle_pct' }, avg_ms: { $avg: '$inference_ms' },
            }}])
        const byLabel = await Inference.aggregate([
            { $group: { _id: '$label', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { label: '$_id', count: 1, _id: 0 } }
        ])
        res.json({ ok: true, data: { totals: totals[0] || {}, byLabel } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

module.exports = router