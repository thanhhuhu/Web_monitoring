const express = require('express')
const router  = express.Router()
const db      = require('../../db/database')

router.get('/', (req, res) => {
    const sessions   = db.get('SELECT COUNT(*) AS count FROM sessions')
    const inference  = db.get(`
    SELECT COUNT(*) AS total, ROUND(AVG(inference_ms),0) AS avg_ms,
           SUM(CASE WHEN label='clear'    THEN 1 ELSE 0 END) AS clear_count,
           SUM(CASE WHEN label='humans'   THEN 1 ELSE 0 END) AS humans_count,
           SUM(CASE WHEN label='obstacle' THEN 1 ELSE 0 END) AS obstacle_count
    FROM inference_log
  `)
    const sensor     = db.get(`
    SELECT COUNT(*) AS total, ROUND(AVG(distance_cm),1) AS avg_cm, ROUND(MIN(distance_cm),1) AS min_cm,
           SUM(CASE WHEN zone='danger' THEN 1 ELSE 0 END) AS danger_count,
           SUM(CASE WHEN zone='warn'   THEN 1 ELSE 0 END) AS warn_count
    FROM sensor_log WHERE distance_cm < 999
  `)
    const alerts        = db.get('SELECT COUNT(*) AS total FROM alert_log')
    const lastSession   = db.get('SELECT * FROM sessions ORDER BY start_time DESC LIMIT 1')
    const recentInf     = db.all('SELECT timestamp, clear_pct, humans_pct, obstacle_pct, label FROM inference_log ORDER BY timestamp DESC LIMIT 20')
    const recentSensor  = db.all('SELECT timestamp, distance_cm, zone FROM sensor_log ORDER BY timestamp DESC LIMIT 50')

    res.json({
        ok: true,
        data: { sessions: sessions?.count || 0, inference, sensor, alerts: alerts?.total || 0, lastSession, recentInference: recentInf.reverse(), recentSensor: recentSensor.reverse() }
    })
})

module.exports = router