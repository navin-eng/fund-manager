const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/savings/summary - must be before /:id route
router.get('/summary', (req, res) => {
  try {
    const totalDeposits = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE type = 'deposit'"
    ).get().total;

    const totalWithdrawals = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE type = 'withdrawal'"
    ).get().total;

    const byMember = db.prepare(`
      SELECT
        m.id AS member_id,
        m.name AS member_name,
        COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE 0 END), 0) AS total_deposits,
        COALESCE(SUM(CASE WHEN s.type = 'withdrawal' THEN s.amount ELSE 0 END), 0) AS total_withdrawals,
        COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE -s.amount END), 0) AS net_savings
      FROM members m
      LEFT JOIN savings s ON s.member_id = m.id
      WHERE m.status = 'active'
      GROUP BY m.id
      ORDER BY m.name ASC
    `).all();

    res.json({
      total_deposits: totalDeposits,
      total_withdrawals: totalWithdrawals,
      net_savings: totalDeposits - totalWithdrawals,
      by_member: byMember,
    });
  } catch (error) {
    console.error('Error fetching savings summary:', error);
    res.status(500).json({ error: 'Failed to fetch savings summary' });
  }
});

// GET /api/savings - list all savings transactions
router.get('/', (req, res) => {
  try {
    const { member_id, date_from, date_to, type } = req.query;

    let query = `
      SELECT s.*, m.name AS member_name
      FROM savings s
      JOIN members m ON s.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (member_id) {
      query += ' AND s.member_id = ?';
      params.push(member_id);
    }
    if (date_from) {
      query += ' AND s.date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND s.date <= ?';
      params.push(date_to);
    }
    if (type) {
      query += ' AND s.type = ?';
      params.push(type);
    }

    query += ' ORDER BY s.date DESC, s.id DESC';

    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching savings:', error);
    res.status(500).json({ error: 'Failed to fetch savings transactions' });
  }
});

// POST /api/savings - create saving transaction
router.post('/', (req, res) => {
  try {
    const { member_id, amount, type, date, notes } = req.body;

    if (!member_id || !amount || !type || !date) {
      return res.status(400).json({ error: 'member_id, amount, type, and date are required' });
    }

    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ error: 'Type must be deposit or withdrawal' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (type === 'withdrawal') {
      const currentSavings = db.prepare(
        "SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS total FROM savings WHERE member_id = ?"
      ).get(member_id).total;

      if (currentSavings < amount) {
        return res.status(400).json({ error: 'Insufficient savings balance' });
      }
    }

    const result = db.prepare(
      'INSERT INTO savings (member_id, amount, type, date, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(member_id, amount, type, date, notes || null);

    const transaction = db.prepare('SELECT s.*, m.name AS member_name FROM savings s JOIN members m ON s.member_id = m.id WHERE s.id = ?').get(result.lastInsertRowid);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating saving transaction:', error);
    res.status(500).json({ error: 'Failed to create saving transaction' });
  }
});

// POST /api/savings/bulk - bulk create saving transactions
router.post('/bulk', (req, res) => {
  try {
    const transactions = req.body; // Expects an array: [{ member_id, amount, date, notes }]
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Expected an array of transactions' });
    }

    const type = 'deposit'; // Bulk saving is always deposit
    
    const insertStmt = db.prepare(
      'INSERT INTO savings (member_id, amount, type, date, notes) VALUES (?, ?, ?, ?, ?)'
    );

    const insertMany = db.transaction((txs) => {
      let insertedCount = 0;
      for (const tx of txs) {
        if (!tx.member_id || !tx.amount || !tx.date) continue;
        if (tx.amount <= 0) continue;
        
        insertStmt.run(tx.member_id, tx.amount, type, tx.date, tx.notes || 'Bulk Monthly Savings');
        insertedCount++;
      }
      return insertedCount;
    });

    const count = insertMany(transactions);
    
    res.status(201).json({ 
      success: true, 
      message: `Successfully added ${count} savings transactions` 
    });
  } catch (error) {
    console.error('Error creating bulk savings:', error);
    res.status(500).json({ error: 'Failed to create bulk savings' });
  }
});

// PUT /api/savings/:id - update transaction
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { member_id, amount, type, date, notes } = req.body;

    const existing = db.prepare('SELECT * FROM savings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.prepare(`
      UPDATE savings SET member_id = ?, amount = ?, type = ?, date = ?, notes = ?
      WHERE id = ?
    `).run(
      member_id || existing.member_id,
      amount || existing.amount,
      type || existing.type,
      date || existing.date,
      notes !== undefined ? notes : existing.notes,
      id
    );

    const transaction = db.prepare('SELECT s.*, m.name AS member_name FROM savings s JOIN members m ON s.member_id = m.id WHERE s.id = ?').get(id);
    res.json(transaction);
  } catch (error) {
    console.error('Error updating saving transaction:', error);
    res.status(500).json({ error: 'Failed to update saving transaction' });
  }
});

// DELETE /api/savings/:id - delete transaction
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM savings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.prepare('DELETE FROM savings WHERE id = ?').run(id);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting saving transaction:', error);
    res.status(500).json({ error: 'Failed to delete saving transaction' });
  }
});

module.exports = router;
