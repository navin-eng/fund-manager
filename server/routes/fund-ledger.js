const express = require('express');
const router = express.Router();
const { buildFundLedgerRows, summarizeFundLedgerRows } = require('../accounting');

// GET /api/fund-ledger — list all with optional search/filter
router.get('/', (req, res) => {
  try {
    const { q, type, limit } = req.query;
    const rows = buildFundLedgerRows();
    const filteredRows = rows.filter((row) => {
      if (q && !String(row.particulars || '').toLowerCase().includes(String(q).toLowerCase())) {
        return false;
      }

      if (type && row.type !== type) {
        return false;
      }

      return true;
    });

    const limitedRows = limit ? filteredRows.slice(0, Number.parseInt(limit, 10)) : filteredRows;
    res.json({ rows: limitedRows, total: filteredRows.length, showing: limitedRows.length });
  } catch (error) {
    console.error('Error fetching fund ledger:', error);
    res.status(500).json({ error: 'Failed to fetch fund ledger' });
  }
});

// GET /api/fund-ledger/summary
router.get('/summary', (req, res) => {
  try {
    const stats = summarizeFundLedgerRows(buildFundLedgerRows());
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// POST /api/fund-ledger
router.post('/', (req, res) => {
  res.status(405).json({ error: 'Ledger entries are generated automatically from transactions' });
});

// PUT /api/fund-ledger/:id
router.put('/:id', (req, res) => {
  res.status(405).json({ error: 'Ledger entries are generated automatically from transactions' });
});

// DELETE /api/fund-ledger/:id
router.delete('/:id', (req, res) => {
  res.status(405).json({ error: 'Ledger entries are generated automatically from transactions' });
});

module.exports = router;
