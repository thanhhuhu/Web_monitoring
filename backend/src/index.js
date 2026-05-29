const express   = require('express')
const cors      = require('cors')
const morgan    = require('morgan')
const db        = require('../db/database')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Khởi động DB trước rồi mới start server
db.init().then(() => {
    app.use('/api/sessions',  require('./routes/sessions'))
    app.use('/api/inference', require('./routes/inference'))
    app.use('/api/sensor',    require('./routes/sensor'))
    app.use('/api/alerts',    require('./routes/alerts'))
    app.use('/api/stats',     require('./routes/stats'))

    app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

    app.use((req, res) => res.status(404).json({ ok: false, error: `Route ${req.path} not found` }))

    app.listen(PORT, () => {
        console.log(`\n🚀 Backend: http://localhost:${PORT}`)
        console.log(`✅ GET  /health`)
        console.log(`✅ GET  /api/stats`)
        console.log(`✅ POST /api/sessions`)
        console.log(`✅ POST /api/inference`)
        console.log(`✅ POST /api/sensor`)
        console.log(`✅ POST /api/alerts\n`)
    })
}).catch(err => {
    console.error('❌ DB init failed:', err)
    process.exit(1)
})