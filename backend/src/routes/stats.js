//stats.js
const express = require('express')
const router  = express.Router()
const { Session, Inference, Sensor, Alert } = require('../../db/database')

router.get('/', async (req, res) => {
    try {
        const [sessionCount, inference, sensor, alertCount, lastSession, recentInf, recentSensor] =
            await Promise.all([
                Session.countDocuments(),
                Inference.aggregate([{ $group: {
                        _id: null, total: { $sum: 1 }, avg_ms: { $avg: '$inference_ms' },
                        clear_count:    { $sum: { $cond: [{ $eq: ['$label','clear']    }, 1, 0] } },
                        humans_count:   { $sum: { $cond: [{ $eq: ['$label','humans']   }, 1, 0] } },
                        obstacle_count: { $sum: { $cond: [{ $eq: ['$label','obstacle'] }, 1, 0] } },
                    }}]),
                Sensor.aggregate([
                    { $match: { distance_cm: { $lt: 999 } } },
                    { $group: { _id: null, total: { $sum: 1 },
                            avg_cm: { $avg: '$distance_cm' }, min_cm: { $min: '$distance_cm' },
                            danger_count: { $sum: { $cond: [{ $eq: ['$zone','danger'] }, 1, 0] } },
                            warn_count:   { $sum: { $cond: [{ $eq: ['$zone','warn']   }, 1, 0] } },
                        }}
                ]),
                Alert.countDocuments(),
                Session.findOne().sort({ start_time: -1 }),
                Inference.find().sort({ timestamp: -1 }).limit(20).select('timestamp clear_pct humans_pct obstacle_pct label'),
                Sensor.find().sort({ timestamp: -1 }).limit(50).select('timestamp distance_cm zone'),
            ])
        res.json({ ok: true, data: {
                sessions: sessionCount, inference: inference[0] || {},
                sensor: sensor[0] || {}, alerts: alertCount, lastSession,
                recentInference: recentInf.reverse(), recentSensor: recentSensor.reverse(),
            }})
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

module.exports = router