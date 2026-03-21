const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/fund-ledger — list all with optional search/filter
router.get('/', (req, res) => {
  try {
    const { q, type, limit } = req.query;
    let query = 'SELECT * FROM fund_ledger WHERE 1=1';
    const params = [];

    if (q) {
      query += ' AND LOWER(particulars) LIKE ?';
      params.push(`%${q.toLowerCase()}%`);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY id ASC';
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const rows = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) AS c FROM fund_ledger').get().c;
    res.json({ rows, total, showing: rows.length });
  } catch (error) {
    console.error('Error fetching fund ledger:', error);
    res.status(500).json({ error: 'Failed to fetch fund ledger' });
  }
});

// GET /api/fund-ledger/summary
router.get('/summary', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total_entries,
        COALESCE(SUM(debit), 0) AS total_debit,
        COALESCE(SUM(credit), 0) AS total_credit,
        (SELECT balance FROM fund_ledger ORDER BY id DESC LIMIT 1) AS current_balance,
        (SELECT date FROM fund_ledger ORDER BY id DESC LIMIT 1) AS last_date
      FROM fund_ledger
    `).get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// POST /api/fund-ledger
router.post('/', (req, res) => {
  try {
    const { date, particulars, debit, credit, balance, type } = req.body;
    if (!date || !particulars) {
      return res.status(400).json({ error: 'date and particulars are required' });
    }
    const result = db.prepare(
      'INSERT INTO fund_ledger (date, particulars, debit, credit, balance, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(date, particulars, debit || null, credit || null, balance || 0, type || null);
    const entry = db.prepare('SELECT * FROM fund_ledger WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// PUT /api/fund-ledger/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, particulars, debit, credit, balance, type } = req.body;
    const existing = db.prepare('SELECT * FROM fund_ledger WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    db.prepare(`
      UPDATE fund_ledger SET date=?, particulars=?, debit=?, credit=?, balance=?, type=? WHERE id=?
    `).run(
      date || existing.date, particulars || existing.particulars,
      debit !== undefined ? debit : existing.debit,
      credit !== undefined ? credit : existing.credit,
      balance !== undefined ? balance : existing.balance,
      type !== undefined ? type : existing.type, id
    );
    res.json(db.prepare('SELECT * FROM fund_ledger WHERE id = ?').get(id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE /api/fund-ledger/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM fund_ledger WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    db.prepare('DELETE FROM fund_ledger WHERE id = ?').run(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
