const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== API ROUTES ====================

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/years', (req, res) => {
  res.json({ years: db.getYears(), active: db.getActiveYear() });
});

app.post('/api/years', (req, res) => {
  const { year } = req.body;
  if (!year) return res.status(400).json({ error: 'year required' });
  db.setActiveYear(year);
  res.json({ ok: true, year });
});

app.get('/api/state/:year', (req, res) => {
  const { year } = req.params;
  const meta = db.getState('meta_' + year) || {};
  res.json({
    year,
    schools:       db.getSchools(year),
    formResponses: db.getFormResponses(year),
    mavat:         db.getMavat(year),
    ...meta,
  });
});

app.post('/api/state/:year', (req, res) => {
  const { year } = req.params;
  const { schools, formResponses, mavat, contacts, manualSchools, deletedSemels,
          csvBookHeader, orderRows, orderHeader, orderMerged } = req.body;
  if (schools)       db.upsertSchools(schools, year);
  if (formResponses) db.upsertFormResponses(formResponses, year);
  if (mavat)         db.upsertMavat(mavat, year);
  db.setState('meta_' + year, { contacts, manualSchools, deletedSemels,
    csvBookHeader, orderRows, orderHeader, orderMerged });
  db.setActiveYear(year);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Init DB then start server
db.initDb().then(() => {
  app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
