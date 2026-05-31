const express   = require('express')
const router    = express.Router()
const { Alert } = require('../../db/database')

router.post('/', async (req, res) => {
    try {
        const { session_id, label, value_pct, threshold_pct } = req.body
        if (!label || value_pct === undefined) return res.status(400).json({ ok: false, error: 'Missing fields' })
        const doc = await Alert.create({ session_id: session_id || null, label, value_pct, threshold_pct })
        res.json({ ok: true, id: doc._id })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.get('/', async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit) || 50
        const filter = {}
        if (req.query.session_id) filter.session_id = req.query.session_id
        if (req.query.label)      filter.label      = req.query.label
        const docs = await Alert.find(filter).sort({ timestamp: -1 }).limit(limit)
        res.json({ ok: true, data: docs })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

module.exports = router