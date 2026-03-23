const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { buildDistributionDataset } = require('../accounting');

// GET /api/distributions
router.get('/', (req, res) => {
  try {
    const { rows } = buildDistributionDataset();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch distributions' });
  }
});

// GET /api/distributions/summary — grouped rounds
router.get('/summary', (req, res) => {
  try {
    const { rounds } = buildDistributionDataset();
    res.json(rounds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch distribution summary' });
  }
});

// POST /api/distributions
router.post('/', (req, res) => {
  try {
    const { date, particulars, debit, credit, balance } = req.body;
    if (!date || !particulars) {
      return res.status(400).json({ error: 'date and particulars are required' });
    }
    const result = db.prepare(
      'INSERT INTO distributions (date, particulars, debit, credit, balance) VALUES (?, ?, ?, ?, ?)'
    ).run(date, particulars, debit || null, credit || null, balance || 0);
    res.status(201).json(db.prepare('SELECT * FROM distributions WHERE id = ?').get(result.lastInsertRowid));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create distribution' });
  }
});

// DELETE /api/distributions/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM distributions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    db.prepare('DELETE FROM distributions WHERE id = ?').run(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
