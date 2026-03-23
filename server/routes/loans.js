const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db, getSetting } = require('../db');
const { addMonthsToDateString, diffWholeMonths, getTodayDateString } = require('../date-utils');
const { PENALTY_INTEREST_RATE, buildPenaltySnapshot, splitRepaymentAmount } = require('../loan-metrics');
const { requireRole } = require('../middleware/auth');
const { logActivity } = require('../activity-log');

function describeLoanFields(existing, nextValues) {
  const labels = {
    amount: 'amount',
    interest_rate: 'interest rate',
    term_months: 'term length',
    start_date: 'start date',
    purpose: 'purpose',
    penalty_rate: 'penalty rate',
    status: 'status',
  };

  return Object.keys(labels)
    .filter((field) => String(existing[field] ?? '') !== String(nextValues[field] ?? ''))
    .map((field) => labels[field]);
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'loan-docs'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `loan-${req.params.id}-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

// EMI calculation helper
function calculateEMI(principal, annualRate, termMonths) {
  const r = annualRate / 12 / 100; // monthly interest rate
  if (r === 0) {
    return principal / termMonths;
  }
  const emi = (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return Math.round(emi * 100) / 100;
}

// GET /api/loans - list all loans (members see only their own)
router.get('/', async (req, res) => {
  try {
    const { status, member_id } = req.query;

    let query = `
      SELECT l.*, m.name AS member_name,
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS total_paid,
        l.total_amount - COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS remaining_balance
      FROM loans l
      JOIN members m ON l.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    // Members can only see their own loans
    if (req.user.role === 'member') {
      query += ' AND l.member_id = ?';
      params.push(req.user.member_id);
    } else if (member_id) {
      query += ' AND l.member_id = ?';
      params.push(member_id);
    }

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.created_at DESC';

    const rows = db.prepare(query).all(...params);
    const loans = await Promise.all(rows.map(async (loan) => {
      const penaltySnapshot = await buildPenaltySnapshot(loan);
      return {
        ...loan,
        remaining_principal: penaltySnapshot.remaining_principal,
        effective_interest_rate: penaltySnapshot.effective_interest_rate,
        penalty_rate_active: penaltySnapshot.penalty_rate_active,
        months_since_balance_reduction: penaltySnapshot.months_since_balance_reduction,
        last_balance_reduction_date: penaltySnapshot.last_balance_reduction_date,
      };
    }));

    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// GET /api/loans/:id - get loan details with repayments and documents
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare(`
      SELECT l.*, m.name AS member_name,
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS total_paid
      FROM loans l
      JOIN members m ON l.member_id = m.id
      WHERE l.id = ?
    `).get(id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Members can only view their own loans
    if (req.user.role === 'member' && loan.member_id !== req.user.member_id) {
      return res.status(403).json({ error: 'You can only view your own loans' });
    }

    const repayments = db.prepare(
      'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC'
    ).all(id);

    const documents = db.prepare(
      'SELECT * FROM loan_documents WHERE loan_id = ? ORDER BY uploaded_at DESC'
    ).all(id);

    loan.remaining_balance = loan.total_amount - loan.total_paid;

    const penaltySnapshot = await buildPenaltySnapshot(loan);

    res.json({
      ...loan,
      repayments,
      documents,
      remaining_principal: penaltySnapshot.remaining_principal,
      effective_interest_rate: penaltySnapshot.effective_interest_rate,
      penalty_rate_active: penaltySnapshot.penalty_rate_active,
      penalty_interest_rate: penaltySnapshot.penalty_interest_rate,
      months_since_balance_reduction: penaltySnapshot.months_since_balance_reduction,
      last_balance_reduction_date: penaltySnapshot.last_balance_reduction_date,
    });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

// POST /api/loans - create new loan or member loan request
router.post('/', requireRole('admin', 'manager', 'member'), async (req, res) => {
  try {
    const { member_id, amount, interest_rate, term_months, start_date, purpose, penalty_rate } = req.body;
    const isMemberRequest = req.user.role === 'member';
    const resolvedMemberId = isMemberRequest ? req.user.member_id : member_id;

    if (isMemberRequest && !resolvedMemberId) {
      return res.status(400).json({ error: 'Your account is not linked to a member profile' });
    }

    if (!resolvedMemberId || !amount || !interest_rate || !term_months || !start_date) {
      return res.status(400).json({ error: 'member_id, amount, interest_rate, term_months, and start_date are required' });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(resolvedMemberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const monthly_payment = calculateEMI(amount, interest_rate, term_months);
    const total_amount = Math.round(monthly_payment * term_months * 100) / 100;
    const total_interest = Math.round((total_amount - amount) * 100) / 100;

    // Calculate end date
    const end_date = await addMonthsToDateString(start_date, term_months);

    const defaultPenaltyRate = PENALTY_INTEREST_RATE;

    const result = db.prepare(`
      INSERT INTO loans (member_id, amount, interest_rate, term_months, start_date, end_date,
        purpose, penalty_rate, monthly_payment, total_interest, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resolvedMemberId, amount, interest_rate, term_months, start_date, end_date,
      purpose || null, penalty_rate || parseFloat(defaultPenaltyRate),
      monthly_payment, total_interest, total_amount
    );

    const loan = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(result.lastInsertRowid);
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

// PUT /api/loans/:id - update loan (admin/manager only)
router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, interest_rate, term_months, start_date, purpose, penalty_rate, status } = req.body;

    const existing = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const newAmount = amount || existing.amount;
    const newRate = interest_rate || existing.interest_rate;
    const newTerm = term_months || existing.term_months;
    const newStart = start_date || existing.start_date;
    const nextValues = {
      amount: newAmount,
      interest_rate: newRate,
      term_months: newTerm,
      start_date: newStart,
      purpose: purpose !== undefined ? purpose : existing.purpose,
      penalty_rate: penalty_rate || existing.penalty_rate,
      status: status || existing.status,
    };

    const monthly_payment = calculateEMI(newAmount, newRate, newTerm);
    const total_amount = Math.round(monthly_payment * newTerm * 100) / 100;
    const total_interest = Math.round((total_amount - newAmount) * 100) / 100;

    const end_date = await addMonthsToDateString(newStart, newTerm);

    db.prepare(`
      UPDATE loans SET amount = ?, interest_rate = ?, term_months = ?, start_date = ?,
        end_date = ?, purpose = ?, penalty_rate = ?, monthly_payment = ?,
        total_interest = ?, total_amount = ?, status = ?
      WHERE id = ?
    `).run(
      newAmount, newRate, newTerm, newStart, end_date,
      nextValues.purpose,
      nextValues.penalty_rate,
      monthly_payment, total_interest, total_amount,
      nextValues.status,
      id
    );

    const loan = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(id);

    const changedFields = describeLoanFields(existing, nextValues);
    if (changedFields.length > 0) {
      logActivity({
        req,
        category: 'loan',
        action: 'updated',
        title: 'Loan updated',
        description: `Updated loan #${loan.id} for ${loan.member_name}. Changed: ${changedFields.join(', ')}.`,
        entityType: 'loan',
        entityId: loan.id,
        amount: loan.amount,
        activityDate: loan.start_date,
        metadata: {
          member_name: loan.member_name,
          changed_fields: changedFields,
        },
      });
    }

    res.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

// PUT /api/loans/:id/approve - approve loan (admin/manager only)
router.put('/:id/approve', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending loans can be approved' });
    }

    const approved_date = await getTodayDateString(loan.start_date);

    db.prepare(`
      UPDATE loans SET status = 'active', approved_date = ?, approved_by = ?
      WHERE id = ?
    `).run(approved_date, approved_by || null, id);

    const updated = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(id);

    logActivity({
      req,
      category: 'loan',
      action: 'approved',
      title: 'Loan approved',
      description: `Approved loan #${updated.id} for ${updated.member_name}.`,
      entityType: 'loan',
      entityId: updated.id,
      amount: updated.amount,
      activityDate: approved_date,
      metadata: {
        member_name: updated.member_name,
        approved_by: approved_by || null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// PUT /api/loans/:id/reject - reject pending loan (admin/manager only)
router.put('/:id/reject', requireRole('admin', 'manager'), (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending loans can be rejected' });
    }

    db.prepare("UPDATE loans SET status = 'rejected' WHERE id = ?").run(id);

    const updated = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(id);

    logActivity({
      req,
      category: 'loan',
      action: 'rejected',
      title: 'Loan rejected',
      description: `Rejected loan #${updated.id} for ${updated.member_name}.`,
      entityType: 'loan',
      entityId: updated.id,
      amount: updated.amount,
      activityDate: updated.start_date,
      metadata: {
        member_name: updated.member_name,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error rejecting loan:', error);
    res.status(500).json({ error: 'Failed to reject loan' });
  }
});

// PUT /api/loans/:id/complete - mark loan completed (admin/manager only)
router.put('/:id/complete', requireRole('admin', 'manager'), (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    db.prepare("UPDATE loans SET status = 'completed' WHERE id = ?").run(id);

    const updated = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(id);

    logActivity({
      req,
      category: 'loan',
      action: 'completed',
      title: 'Loan marked completed',
      description: `Marked loan #${updated.id} for ${updated.member_name} as completed.`,
      entityType: 'loan',
      entityId: updated.id,
      amount: updated.amount,
      activityDate: updated.end_date || updated.start_date,
      metadata: {
        member_name: updated.member_name,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error completing loan:', error);
    res.status(500).json({ error: 'Failed to complete loan' });
  }
});

// POST /api/loans/:id/repayment - add repayment (admin/manager only)
router.post('/:id/repayment', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, notes } = req.body;

    if (!amount || !date) {
      return res.status(400).json({ error: 'amount and date are required' });
    }

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const { interestPortion, penaltyPortion, principalPortion, snapshot } = await splitRepaymentAmount(
      loan,
      amount,
      date
    );

    const result = db.prepare(`
      INSERT INTO loan_repayments (loan_id, amount, principal, interest, penalty, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, amount, principalPortion, interestPortion, penaltyPortion, date, notes || null);

    // Mark the loan complete once the principal has been cleared.
    const remainingPrincipalAfterPayment = Math.max(0, snapshot.remaining_principal - principalPortion);
    if (remainingPrincipalAfterPayment <= 0) {
      db.prepare("UPDATE loans SET status = 'completed' WHERE id = ?").run(id);
    }

    const repayment = db.prepare('SELECT * FROM loan_repayments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...repayment,
      penalty_applied: penaltyPortion,
      effective_interest_rate: snapshot.effective_interest_rate,
      penalty_rate_active: snapshot.penalty_rate_active,
      months_since_balance_reduction: snapshot.months_since_balance_reduction,
    });
  } catch (error) {
    console.error('Error adding repayment:', error);
    res.status(500).json({ error: 'Failed to add repayment' });
  }
});

// GET /api/loans/:id/schedule - generate amortization schedule
router.get('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Members can only view their own loan schedule
    if (req.user.role === 'member' && loan.member_id !== req.user.member_id) {
      return res.status(403).json({ error: 'You can only view your own loan schedule' });
    }

    const schedule = [];
    const monthlyRate = loan.interest_rate / 12 / 100;
    let balance = loan.amount;
    const baseDate = loan.approved_date || loan.start_date;

    for (let i = 1; i <= loan.term_months; i++) {
      const interestPayment = Math.round(balance * monthlyRate * 100) / 100;
      const principalPayment = Math.round((loan.monthly_payment - interestPayment) * 100) / 100;
      balance = Math.round((balance - principalPayment) * 100) / 100;

      // Prevent floating-point issues on last payment
      if (i === loan.term_months) {
        balance = 0;
      }

      schedule.push({
        month: i,
        due_date: await addMonthsToDateString(baseDate, i),
        payment: loan.monthly_payment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(balance, 0),
      });
    }

    // Get actual repayments to compare
    const repayments = db.prepare(
      'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY date ASC'
    ).all(id);

    res.json({ loan, schedule, repayments });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ error: 'Failed to generate amortization schedule' });
  }
});

// POST /api/loans/:id/documents - upload document (admin/manager only)
router.post('/:id/documents', requireRole('admin', 'manager'), upload.single('document'), (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = db.prepare(`
      INSERT INTO loan_documents (loan_id, filename, original_name, file_path, file_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      req.file.filename,
      req.file.originalname,
      `/uploads/loan-docs/${req.file.filename}`,
      req.file.mimetype
    );

    const doc = db.prepare('SELECT * FROM loan_documents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(doc);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/loans/:id/penalty-check - check for overdue payments and calculate penalties
router.get('/:id/penalty-check', async (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active') {
      return res.json({ overdue: false, message: 'Loan is not active' });
    }

    const snapshot = await buildPenaltySnapshot(loan);
    res.json({
      overdue: snapshot.penalty_rate_active,
      remaining_principal: snapshot.remaining_principal,
      months_since_balance_reduction: snapshot.months_since_balance_reduction,
      calculated_penalty: snapshot.calculated_penalty_interest,
      existing_unpaid_penalties: snapshot.existing_unpaid_penalties,
      effective_interest_rate: snapshot.effective_interest_rate,
      penalty_interest_rate: snapshot.penalty_interest_rate,
      last_balance_reduction_date: snapshot.last_balance_reduction_date,
    });
  } catch (error) {
    console.error('Error checking penalties:', error);
    res.status(500).json({ error: 'Failed to check penalties' });
  }
});

module.exports = router;
