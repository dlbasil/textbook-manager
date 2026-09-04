const express = require('express');
const cors    = require('cors');
const path    = require('path');
const {
  getState, setState, getYears, getActiveYear, setActiveYear,
  getSchools, upsertSchools, getFormResponses, upsertFormResponses,
  getMavat, upsertMavat,
} = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== API ROUTES ====================

// Years
app.get('/api/years', (req, res) => {
  res.json({ years: getYears(), active: getActiveYear() });
});

app.post('/api/years', (req, res) => {
  const { year } = req.body;
  if (!year) return res.status(400).json({ error: 'year required' });
  setActiveYear(year);
  res.json({ ok: true, year });
});

// Full state save/load (replaces Drive JSON)
app.get('/api/state/:year', (req, res) => {
  const { year } = req.params;
  const schools   = getSchools(year);
  const responses = getFormResponses(year);
  const mavat     = getMavat(year);
  const meta      = getState('meta_' + year) || {};
  res.json({ year, schools, formResponses: responses, mavat, ...meta });
});

app.post('/api/state/:year', (req, res) => {
  const { year } = req.params;
  const { schools, formResponses, mavat, contacts, manualSchools, deletedSemels,
          csvBookHeader, orderRows, orderHeader, orderMerged } = req.body;

  if (schools)       upsertSchools(schools, year);
  if (formResponses) upsertFormResponses(formResponses, year);
  if (mavat)         upsertMavat(mavat, year);

  // Store misc state
  setState('meta_' + year, { contacts, manualSchools, deletedSemels,
    csvBookHeader, orderRows, orderHeader, orderMerged });

  setActiveYear(year);
  res.json({ ok: true });
});

// Schools CRUD
app.get('/api/schools/:year', (req, res) => {
  res.json(getSchools(req.params.year));
});

app.post('/api/schools/:year', (req, res) => {
  upsertSchools(req.body.schools || [], req.params.year);
  res.json({ ok: true });
});

// Form responses
app.get('/api/responses/:year', (req, res) => {
  res.json(getFormResponses(req.params.year));
});

app.post('/api/responses/:year', (req, res) => {
  upsertFormResponses(req.body.responses || [], req.params.year);
  res.json({ ok: true });
});

// Mavat
app.get('/api/mavat/:year', (req, res) => {
  res.json(getMavat(req.params.year));
});

app.post('/api/mavat/:year', (req, res) => {
  upsertMavat(req.body.mavat || [], req.params.year);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Textbook Manager running on port ${PORT}`);
});
