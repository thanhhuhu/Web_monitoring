//session.js
const express = require('express')
const router  = express.Router()
const { Session, Inference, Sensor, Alert } = require('../../db/database')

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20
        const rows  = await Session.find().sort({ start_time: -1 }).limit(limit)
        res.json({ ok: true, data: rows })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.get('/:id', async (req, res) => {
    try {
        const session    = await Session.findById(req.params.id)
        if (!session) return res.status(404).json({ ok: false, error: 'Not found' })
        const inferences = await Inference.find({ session_id: req.params.id }).sort({ timestamp: -1 }).limit(100)
        const sensors    = await Sensor.find({ session_id: req.params.id }).sort({ timestamp: -1 }).limit(100)
        const alerts     = await Alert.find({ session_id: req.params.id }).sort({ timestamp: -1 })
        res.json({ ok: true, data: { session, inferences, sensors, alerts } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.post('/', async (req, res) => {
    try {
        const session = await Session.create({ esp32_ip: req.body.esp32_ip || null, notes: req.body.notes || null })
        res.json({ ok: true, data: session })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.patch('/:id/end', async (req, res) => {
    try {
        const session = await Session.findByIdAndUpdate(req.params.id, { end_time: new Date() }, { new: true })
        res.json({ ok: true, data: session })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

module.exports = router