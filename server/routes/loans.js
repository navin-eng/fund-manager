const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db, getSetting } = require('../db');

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

// GET /api/loans - list all loans
router.get('/', (req, res) => {
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

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (member_id) {
      query += ' AND l.member_id = ?';
      params.push(member_id);
    }

    query += ' ORDER BY l.created_at DESC';

    const loans = db.prepare(query).all(...params);
    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// GET /api/loans/:id - get loan details with repayments and documents
router.get('/:id', (req, res) => {
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

    const repayments = db.prepare(
      'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC'
    ).all(id);

    const documents = db.prepare(
      'SELECT * FROM loan_documents WHERE loan_id = ? ORDER BY uploaded_at DESC'
    ).all(id);

    loan.remaining_balance = loan.total_amount - loan.total_paid;

    res.json({ ...loan, repayments, documents });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

// POST /api/loans - create new loan application
router.post('/', (req, res) => {
  try {
    const { member_id, amount, interest_rate, term_months, start_date, purpose, penalty_rate } = req.body;

    if (!member_id || !amount || !interest_rate || !term_months || !start_date) {
      return res.status(400).json({ error: 'member_id, amount, interest_rate, term_months, and start_date are required' });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const monthly_payment = calculateEMI(amount, interest_rate, term_months);
    const total_amount = Math.round(monthly_payment * term_months * 100) / 100;
    const total_interest = Math.round((total_amount - amount) * 100) / 100;

    // Calculate end date
    const startDt = new Date(start_date);
    startDt.setMonth(startDt.getMonth() + term_months);
    const end_date = startDt.toISOString().split('T')[0];

    const defaultPenaltyRate = getSetting('default_penalty_rate') || '2';

    const result = db.prepare(`
      INSERT INTO loans (member_id, amount, interest_rate, term_months, start_date, end_date,
        purpose, penalty_rate, monthly_payment, total_interest, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      member_id, amount, interest_rate, term_months, start_date, end_date,
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

// PUT /api/loans/:id - update loan
router.put('/:id', (req, res) => {
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

    const monthly_payment = calculateEMI(newAmount, newRate, newTerm);
    const total_amount = Math.round(monthly_payment * newTerm * 100) / 100;
    const total_interest = Math.round((total_amount - newAmount) * 100) / 100;

    const startDt = new Date(newStart);
    startDt.setMonth(startDt.getMonth() + newTerm);
    const end_date = startDt.toISOString().split('T')[0];

    db.prepare(`
      UPDATE loans SET amount = ?, interest_rate = ?, term_months = ?, start_date = ?,
        end_date = ?, purpose = ?, penalty_rate = ?, monthly_payment = ?,
        total_interest = ?, total_amount = ?, status = ?
      WHERE id = ?
    `).run(
      newAmount, newRate, newTerm, newStart, end_date,
      purpose !== undefined ? purpose : existing.purpose,
      penalty_rate || existing.penalty_rate,
      monthly_payment, total_interest, total_amount,
      status || existing.status,
      id
    );

    const loan = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(id);
    res.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

// PUT /api/loans/:id/approve - approve loan
router.put('/:id/approve', (req, res) => {
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

    const approved_date = new Date().toISOString().split('T')[0];

    db.prepare(`
      UPDATE loans SET status = 'active', approved_date = ?, approved_by = ?
      WHERE id = ?
    `).run(approved_date, approved_by || null, id);

    const updated = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// PUT /api/loans/:id/complete - mark loan completed
router.put('/:id/complete', (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    db.prepare("UPDATE loans SET status = 'completed' WHERE id = ?").run(id);

    const updated = db.prepare('SELECT l.*, m.name AS member_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error completing loan:', error);
    res.status(500).json({ error: 'Failed to complete loan' });
  }
});

// POST /api/loans/:id/repayment - add repayment
router.post('/:id/repayment', (req, res) => {
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

    // Calculate principal and interest split based on remaining balance
    const totalPaid = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM loan_repayments WHERE loan_id = ?'
    ).get(id).total;

    const totalPrincipalPaid = db.prepare(
      'SELECT COALESCE(SUM(principal), 0) AS total FROM loan_repayments WHERE loan_id = ?'
    ).get(id).total;

    const remainingPrincipal = loan.amount - totalPrincipalPaid;
    const monthlyRate = loan.interest_rate / 12 / 100;

    // Interest portion for this payment
    let interestPortion = Math.round(remainingPrincipal * monthlyRate * 100) / 100;
    let principalPortion = Math.round((amount - interestPortion) * 100) / 100;
    let penalty = 0;

    // If principal portion goes negative, all goes to interest
    if (principalPortion < 0) {
      interestPortion = amount;
      principalPortion = 0;
    }

    // Check for overdue payment and apply penalty
    const lastRepayment = db.prepare(
      'SELECT date FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC LIMIT 1'
    ).get(id);

    const loanStartDate = new Date(loan.approved_date || loan.start_date);
    const paymentDate = new Date(date);
    const lastPaymentDate = lastRepayment ? new Date(lastRepayment.date) : loanStartDate;

    // Calculate months since last payment
    const monthsSinceLastPayment =
      (paymentDate.getFullYear() - lastPaymentDate.getFullYear()) * 12 +
      (paymentDate.getMonth() - lastPaymentDate.getMonth());

    if (monthsSinceLastPayment > 1) {
      // Overdue: apply penalty on overdue months
      const overdueMonths = monthsSinceLastPayment - 1;
      const penaltyRate = loan.penalty_rate / 100;
      penalty = Math.round(remainingPrincipal * penaltyRate * overdueMonths / 12 * 100) / 100;

      // Record penalty
      db.prepare(
        "INSERT INTO penalties (loan_id, amount, reason, date, status) VALUES (?, ?, ?, ?, 'unpaid')"
      ).run(id, penalty, `Overdue penalty for ${overdueMonths} month(s)`, date);
    }

    const result = db.prepare(`
      INSERT INTO loan_repayments (loan_id, amount, principal, interest, penalty, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, amount, principalPortion, interestPortion, penalty, date, notes || null);

    // Check if loan is fully paid
    const newTotalPaid = totalPaid + amount;
    if (newTotalPaid >= loan.total_amount) {
      db.prepare("UPDATE loans SET status = 'completed' WHERE id = ?").run(id);
    }

    const repayment = db.prepare('SELECT * FROM loan_repayments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...repayment, penalty_applied: penalty });
  } catch (error) {
    console.error('Error adding repayment:', error);
    res.status(500).json({ error: 'Failed to add repayment' });
  }
});

// GET /api/loans/:id/schedule - generate amortization schedule
router.get('/:id/schedule', (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const schedule = [];
    const monthlyRate = loan.interest_rate / 12 / 100;
    let balance = loan.amount;
    const startDate = new Date(loan.approved_date || loan.start_date);

    for (let i = 1; i <= loan.term_months; i++) {
      const interestPayment = Math.round(balance * monthlyRate * 100) / 100;
      const principalPayment = Math.round((loan.monthly_payment - interestPayment) * 100) / 100;
      balance = Math.round((balance - principalPayment) * 100) / 100;

      // Prevent floating-point issues on last payment
      if (i === loan.term_months) {
        balance = 0;
      }

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        month: i,
        due_date: dueDate.toISOString().split('T')[0],
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

// POST /api/loans/:id/documents - upload document
router.post('/:id/documents', upload.single('document'), (req, res) => {
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
router.get('/:id/penalty-check', (req, res) => {
  try {
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active') {
      return res.json({ overdue: false, message: 'Loan is not active' });
    }

    const repayments = db.prepare(
      'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC'
    ).all(id);

    const totalPrincipalPaid = db.prepare(
      'SELECT COALESCE(SUM(principal), 0) AS total FROM loan_repayments WHERE loan_id = ?'
    ).get(id).total;

    const remainingPrincipal = loan.amount - totalPrincipalPaid;
    const repaymentCount = repayments.length;

    // Determine how many payments should have been made by now
    const loanStart = new Date(loan.approved_date || loan.start_date);
    const now = new Date();
    const expectedPayments = Math.floor(
      (now.getFullYear() - loanStart.getFullYear()) * 12 +
      (now.getMonth() - loanStart.getMonth())
    );

    const missedPayments = Math.max(0, expectedPayments - repaymentCount);
    const isOverdue = missedPayments > 0;

    let penaltyAmount = 0;
    if (isOverdue) {
      const penaltyRate = loan.penalty_rate / 100;
      penaltyAmount = Math.round(remainingPrincipal * penaltyRate * missedPayments / 12 * 100) / 100;
    }

    // Get existing unpaid penalties
    const unpaidPenalties = db.prepare(
      "SELECT * FROM penalties WHERE loan_id = ? AND status = 'unpaid'"
    ).all(id);

    const totalUnpaidPenalties = unpaidPenalties.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      overdue: isOverdue,
      missed_payments: missedPayments,
      remaining_principal: remainingPrincipal,
      calculated_penalty: penaltyAmount,
      existing_unpaid_penalties: totalUnpaidPenalties,
      penalty_details: unpaidPenalties,
    });
  } catch (error) {
    console.error('Error checking penalties:', error);
    res.status(500).json({ error: 'Failed to check penalties' });
  }
});

module.exports = router;
