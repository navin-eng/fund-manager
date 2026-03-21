const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/income/periods — list all periods with totals
router.get('/periods', (req, res) => {
  try {
    const periods = db.prepare(`
      SELECT ip.*,
        (SELECT COUNT(*) FROM income_entries ie WHERE ie.period_id = ip.id) AS entry_count,
        (SELECT COALESCE(MAX(balance), 0) FROM income_entries ie WHERE ie.period_id = ip.id) AS period_total
      FROM income_periods ip
      ORDER BY ip.period_index ASC
    `).all();
    res.json(periods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income periods' });
  }
});

// GET /api/income/periods/:id/entries
router.get('/periods/:id/entries', (req, res) => {
  try {
    const period = db.prepare('SELECT * FROM income_periods WHERE id = ?').get(req.params.id);
    if (!period) return res.status(404).json({ error: 'Period not found' });

    const entries = db.prepare(
      'SELECT * FROM income_entries WHERE period_id = ? ORDER BY id ASC'
    ).all(req.params.id);

    res.json({ period, entries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST /api/income/periods — create period
router.post('/periods', (req, res) => {
  try {
    const { period_index, title_np } = req.body;
    if (!title_np) return res.status(400).json({ error: 'title_np is required' });
    const idx = period_index !== undefined ? period_index :
      (db.prepare('SELECT COALESCE(MAX(period_index), -1) + 1 AS next FROM income_periods').get().next);
    const result = db.prepare(
      'INSERT INTO income_periods (period_index, title_np) VALUES (?, ?)'
    ).run(idx, title_np);
    res.status(201).json(db.prepare('SELECT * FROM income_periods WHERE id = ?').get(result.lastInsertRowid));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create period' });
  }
});

// POST /api/income/entries — add entry
router.post('/entries', (req, res) => {
  try {
    const { period_id, date, particulars, amount, balance } = req.body;
    if (!period_id || !particulars || amount == null) {
      return res.status(400).json({ error: 'period_id, particulars, and amount are required' });
    }
    const result = db.prepare(
      'INSERT INTO income_entries (period_id, date, particulars, amount, balance) VALUES (?, ?, ?, ?, ?)'
    ).run(period_id, date || null, particulars, amount, balance || amount);
    res.status(201).json(db.prepare('SELECT * FROM income_entries WHERE id = ?').get(result.lastInsertRowid));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// DELETE /api/income/entries/:id
router.delete('/entries/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM income_entries WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    db.prepare('DELETE FROM income_entries WHERE id = ?').run(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
