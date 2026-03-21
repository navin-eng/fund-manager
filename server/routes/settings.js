const express = require('express');
const settingsRouter = express.Router();
const adjustmentsRouter = express.Router();
const { db, getSettings, updateSetting, getSetting } = require('../db');

// GET /api/settings - get all settings
settingsRouter.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - update settings (accepts object of key-value pairs)
settingsRouter.put('/', (req, res) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Request body must be an object of key-value pairs' });
    }

    const results = [];
    for (const [key, value] of Object.entries(updates)) {
      const result = updateSetting(key, String(value));
      results.push(result);
    }

    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/settings/fiscal-year - get current fiscal year start/end dates
settingsRouter.get('/fiscal-year', (req, res) => {
  try {
    const startMonth = parseInt(getSetting('fiscal_year_start') || '1', 10);
    const startDay = parseInt(getSetting('fiscal_year_start_day') || '1', 10);

    const now = new Date();
    let yearStart, yearEnd;

    // Determine if we're in the current or next fiscal year
    const currentYearFiscalStart = new Date(now.getFullYear(), startMonth - 1, startDay);

    if (now >= currentYearFiscalStart) {
      yearStart = currentYearFiscalStart;
      yearEnd = new Date(now.getFullYear() + 1, startMonth - 1, startDay);
      yearEnd.setDate(yearEnd.getDate() - 1);
    } else {
      yearStart = new Date(now.getFullYear() - 1, startMonth - 1, startDay);
      yearEnd = new Date(now.getFullYear(), startMonth - 1, startDay);
      yearEnd.setDate(yearEnd.getDate() - 1);
    }

    res.json({
      fiscal_year_start: yearStart.toISOString().split('T')[0],
      fiscal_year_end: yearEnd.toISOString().split('T')[0],
      start_month: startMonth,
      start_day: startDay,
    });
  } catch (error) {
    console.error('Error fetching fiscal year:', error);
    res.status(500).json({ error: 'Failed to fetch fiscal year' });
  }
});

// POST /api/balance-adjustments - create balance adjustment
adjustmentsRouter.post('/', (req, res) => {
  try {
    const { amount, reason, type, date, adjusted_by } = req.body;

    if (!amount || !reason || !type || !date) {
      return res.status(400).json({ error: 'amount, reason, type, and date are required' });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Type must be credit or debit' });
    }

    const result = db.prepare(
      'INSERT INTO balance_adjustments (amount, reason, type, date, adjusted_by) VALUES (?, ?, ?, ?, ?)'
    ).run(amount, reason, type, date, adjusted_by || null);

    const adjustment = db.prepare('SELECT * FROM balance_adjustments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(adjustment);
  } catch (error) {
    console.error('Error creating balance adjustment:', error);
    res.status(500).json({ error: 'Failed to create balance adjustment' });
  }
});

// GET /api/balance-adjustments - list all adjustments
adjustmentsRouter.get('/', (req, res) => {
  try {
    const adjustments = db.prepare(
      'SELECT * FROM balance_adjustments ORDER BY date DESC'
    ).all();
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching balance adjustments:', error);
    res.status(500).json({ error: 'Failed to fetch balance adjustments' });
  }
});

module.exports = { settingsRouter, adjustmentsRouter };
