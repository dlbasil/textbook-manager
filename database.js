const path = require('path');
const fs   = require('fs');

// sql.js = pure JavaScript SQLite, no native compilation needed
const initSqlJs = require('sql.js');

const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = path.join(dataDir, 'textbook.db');

let db; // sql.js Database instance

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  createSchema();
  return db;
}

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS years (
      year       TEXT PRIMARY KEY,
      is_active  INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS school_data (
      semel      TEXT,
      year       TEXT,
      data_json  TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (semel, year)
    );
    CREATE TABLE IF NOT EXISTS form_data (
      semel      TEXT,
      year       TEXT,
      data_json  TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (semel, year)
    );
    CREATE TABLE IF NOT EXISTS mavat_data (
      semel      TEXT,
      year       TEXT,
      data_json  TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (semel, year)
    );
  `);
  persist();
}

// ==================== HELPERS ====================
function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ==================== API ====================
function getState(key) {
  const row = get('SELECT value FROM app_state WHERE key = ?', [key]);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch(e) { return row.value; }
}

function setState(key, value) {
  run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}

function getYears() {
  return all('SELECT year, is_active FROM years ORDER BY created_at DESC');
}

function getActiveYear() {
  const row = get('SELECT year FROM years WHERE is_active = 1');
  return row ? row.year : null;
}

function setActiveYear(year) {
  run('UPDATE years SET is_active = 0');
  run('INSERT OR REPLACE INTO years (year, is_active) VALUES (?, 1)', [year]);
}

function getSchools(year) {
  return all('SELECT data_json FROM school_data WHERE year = ?', [year])
    .map(r => JSON.parse(r.data_json));
}

function upsertSchools(schools, year) {
  for (const s of schools) {
    run('INSERT OR REPLACE INTO school_data (semel, year, data_json) VALUES (?, ?, ?)',
      [s.semel, year, JSON.stringify(s)]);
  }
}

function getFormResponses(year) {
  return all('SELECT data_json FROM form_data WHERE year = ?', [year])
    .map(r => JSON.parse(r.data_json));
}

function upsertFormResponses(responses, year) {
  for (const r of responses) {
    run('INSERT OR REPLACE INTO form_data (semel, year, data_json) VALUES (?, ?, ?)',
      [r.semel, year, JSON.stringify(r)]);
  }
}

function getMavat(year) {
  return all('SELECT data_json FROM mavat_data WHERE year = ?', [year])
    .map(r => JSON.parse(r.data_json));
}

function upsertMavat(rows, year) {
  for (const r of rows) {
    run('INSERT OR REPLACE INTO mavat_data (semel, year, data_json) VALUES (?, ?, ?)',
      [r.semel, year, JSON.stringify(r)]);
  }
}

module.exports = {
  initDb, getState, setState, getYears, getActiveYear, setActiveYear,
  getSchools, upsertSchools, getFormResponses, upsertFormResponses,
  getMavat, upsertMavat,
};
