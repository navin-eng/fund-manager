const express = require('express');
const router = express.Router();
const { buildIncomeDataset } = require('../accounting');

// GET /api/income/periods — list all periods with totals
router.get('/periods', (req, res) => {
  try {
    const { periods } = buildIncomeDataset();
    res.json(periods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income periods' });
  }
});

// GET /api/income/periods/:id/entries
router.get('/periods/:id/entries', (req, res) => {
  try {
    const { periods, entriesByPeriod } = buildIncomeDataset();
    const period = periods.find((entry) => String(entry.id) === String(req.params.id));
    if (!period) return res.status(404).json({ error: 'Period not found' });

    const entries = entriesByPeriod.get(period.id) || [];

    res.json({ period, entries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST /api/income/periods — create period
router.post('/periods', (req, res) => {
  res.status(405).json({ error: 'Income periods are generated automatically from recorded income transactions' });
});

// POST /api/income/entries — add entry
router.post('/entries', (req, res) => {
  res.status(405).json({ error: 'Income entries are generated automatically from recorded income transactions' });
});

// DELETE /api/income/entries/:id
router.delete('/entries/:id', (req, res) => {
  res.status(405).json({ error: 'Income entries are generated automatically from recorded income transactions' });
});

module.exports = router;
