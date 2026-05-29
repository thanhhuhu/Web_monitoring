// ═══════════════════════════════════════════════
// db/database.js — sql.js (không cần compile)
// ═══════════════════════════════════════════════

const path = require('path')
const fs   = require('fs')
const initSqlJs = require('sql.js')

const DB_PATH = path.join(__dirname, 'data.db')

let db = null

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT    NOT NULL DEFAULT (datetime('now')),
    end_time   TEXT,
    esp32_ip   TEXT,
    notes      TEXT
  );

  CREATE TABLE IF NOT EXISTS inference_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp    TEXT NOT NULL DEFAULT (datetime('now')),
    session_id   INTEGER,
    clear_pct    REAL NOT NULL,
    humans_pct   REAL NOT NULL,
    obstacle_pct REAL NOT NULL,
    label        TEXT NOT NULL,
    confidence   REAL NOT NULL,
    inference_ms INTEGER
  );

  CREATE TABLE IF NOT EXISTS sensor_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
    session_id  INTEGER,
    distance_cm REAL NOT NULL,
    zone        TEXT NOT NULL,
    mode        TEXT NOT NULL DEFAULT 'M'
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     TEXT NOT NULL DEFAULT (datetime('now')),
    session_id    INTEGER,
    label         TEXT NOT NULL,
    value_pct     REAL NOT NULL,
    threshold_pct REAL NOT NULL
  );
`

// Lưu DB ra file mỗi khi có thay đổi
function persist() {
    const data = db.export()
    fs.writeFileSync(DB_PATH, Buffer.from(data))
}

// Wrap để auto-persist sau mỗi write
function run(sql, params = []) {
    db.run(sql, params)
    persist()
    // Lấy lastInsertRowid
    const row = db.exec('SELECT last_insert_rowid() as id')
    return { lastInsertRowid: row[0]?.values[0][0] ?? null }
}

function get(sql, params = []) {
    const result = db.exec(sql, params)
    if (!result.length) return null
    const { columns, values } = result[0]
    if (!values.length) return null
    return Object.fromEntries(columns.map((c, i) => [c, values[0][i]]))
}

function all(sql, params = []) {
    const result = db.exec(sql, params)
    if (!result.length) return []
    const { columns, values } = result[0]
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

async function init() {
    const SQL = await initSqlJs()
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH)
        db = new SQL.Database(fileBuffer)
    } else {
        db = new SQL.Database()
    }
    db.run(SCHEMA)
    persist()
    console.log('✅ Database ready:', DB_PATH)
}

module.exports = { init, run, get, all, persist }