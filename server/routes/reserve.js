const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { buildReserveDataset } = require('../accounting');

// GET /api/reserve
router.get('/', (req, res) => {
  try {
    const { rows, summary } = buildReserveDataset();
    res.json({ rows, summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reserve fund' });
  }
});

// POST /api/reserve
router.post('/', (req, res) => {
  try {
    const { date, particulars, debit, credit, balance } = req.body;
    if (!date || !particulars) {
      return res.status(400).json({ error: 'date and particulars are required' });
    }
    const result = db.prepare(
      'INSERT INTO reserve_fund (date, particulars, debit, credit, balance) VALUES (?, ?, ?, ?, ?)'
    ).run(date, particulars, debit || null, credit || null, balance || 0);
    res.status(201).json(db.prepare('SELECT * FROM reserve_fund WHERE id = ?').get(result.lastInsertRowid));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// DELETE /api/reserve/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM reserve_fund WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    db.prepare('DELETE FROM reserve_fund WHERE id = ?').run(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
