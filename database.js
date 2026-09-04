const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Railway, use /data for persistent storage if available
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'textbook.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ==================== SCHEMA ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schools (
    semel       TEXT PRIMARY KEY,
    semel2      TEXT,
    name        TEXT,
    status      TEXT,
    level       TEXT,
    neighborhood TEXT,
    curriculum  TEXT,
    phone       TEXT,
    email       TEXT,
    principal   TEXT,
    principal_phone TEXT,
    principal_email TEXT,
    grades_json TEXT,
    total       INTEGER DEFAULT 0,
    manual      INTEGER DEFAULT 0,
    excluded    INTEGER DEFAULT 0,
    year        TEXT,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS form_responses (
    semel         TEXT,
    year          TEXT,
    form_school   TEXT,
    form_principal TEXT,
    form_phone    TEXT,
    form_email    TEXT,
    form_rep      TEXT,
    form_rep_phone TEXT,
    form_rep_email TEXT,
    grades_json   TEXT,
    total         INTEGER DEFAULT 0,
    date          TEXT,
    raw_date      TEXT,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (semel, year)
  );

  CREATE TABLE IF NOT EXISTS mavat (
    semel       TEXT,
    year        TEXT,
    name        TEXT,
    grades_json TEXT,
    total       INTEGER DEFAULT 0,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (semel, year)
  );

  CREATE TABLE IF NOT EXISTS years (
    year        TEXT PRIMARY KEY,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active   INTEGER DEFAULT 0
  );
`);

// ==================== HELPERS ====================

function getState(key) {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch(e) { return row.value; }
}

function setState(key, value) {
  db.prepare('INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
    .run(key, JSON.stringify(value));
}

function getYears() {
  return db.prepare('SELECT year, is_active FROM years ORDER BY created_at DESC').all();
}

function getActiveYear() {
  const row = db.prepare('SELECT year FROM years WHERE is_active = 1').get();
  return row ? row.year : null;
}

function setActiveYear(year) {
  db.prepare('UPDATE years SET is_active = 0').run();
  db.prepare('INSERT OR REPLACE INTO years (year, is_active) VALUES (?, 1)').run(year);
}

function getSchools(year) {
  return db.prepare('SELECT * FROM schools WHERE year = ?').all(year).map(r => ({
    ...r,
    grades: r.grades_json ? JSON.parse(r.grades_json) : {},
    manual: !!r.manual,
    excluded: !!r.excluded,
  }));
}

function upsertSchools(schools, year) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO schools
    (semel,semel2,name,status,level,neighborhood,curriculum,phone,email,
     principal,principal_phone,principal_email,grades_json,total,manual,excluded,year,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `);
  const insert = db.transaction((schools) => {
    for (const s of schools) {
      stmt.run(s.semel,s.semel2||'',s.name||'',s.status||'',s.level||'',
        s.neighborhood||'',s.curriculum||'',s.phone||'',s.email||'',
        s.principal||'',s.principalPhone||'',s.principalEmail||'',
        JSON.stringify(s.grades||{}),s.total||0,s.manual?1:0,s.excluded?1:0,year);
    }
  });
  insert(schools);
}

function getFormResponses(year) {
  return db.prepare('SELECT * FROM form_responses WHERE year = ?').all(year).map(r => ({
    ...r, grades: r.grades_json ? JSON.parse(r.grades_json) : {},
  }));
}

function upsertFormResponses(responses, year) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO form_responses
    (semel,year,form_school,form_principal,form_phone,form_email,
     form_rep,form_rep_phone,form_rep_email,grades_json,total,date,raw_date,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `);
  const insert = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(r.semel,year,r.formSchoolName||'',r.formPrincipal||'',
        r.formPhone||'',r.formEmail||'',r.formRep||'',r.formRepPhone||'',
        r.formRepEmail||'',JSON.stringify(r.grades||{}),r.total||0,
        r.date||'',r.rawDate||'');
    }
  });
  insert(responses);
}

function getMavat(year) {
  return db.prepare('SELECT * FROM mavat WHERE year = ?').all(year).map(r => ({
    ...r, grades: r.grades_json ? JSON.parse(r.grades_json) : {},
  }));
}

function upsertMavat(rows, year) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO mavat (semel,year,name,grades_json,total,updated_at)
    VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
  `);
  const insert = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(r.semel,year,r.name||'',JSON.stringify(r.grades||{}),r.total||0);
    }
  });
  insert(rows);
}

module.exports = {
  db, getState, setState, getYears, getActiveYear, setActiveYear,
  getSchools, upsertSchools, getFormResponses, upsertFormResponses,
  getMavat, upsertMavat,
};
