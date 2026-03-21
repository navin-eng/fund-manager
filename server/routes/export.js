const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { db } = require('../db');
const { addMonthsToDateString, getDateRange } = require('../date-utils');

// Helper: format date for filenames
function fileDate() {
  return new Date().toISOString().split('T')[0];
}

// Helper: send workbook as download
function sendWorkbook(res, wb, filename) {
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

// GET /api/export/members - Export all members to Excel
router.get('/members', (req, res) => {
  try {
    const members = db.prepare(`
      SELECT
        m.id AS "Member ID",
        m.name AS "Name",
        m.email AS "Email",
        m.phone AS "Phone",
        m.address AS "Address",
        m.joined_date AS "Joined Date",
        m.status AS "Status",
        m.emergency_contact AS "Emergency Contact",
        COALESCE((SELECT SUM(CASE WHEN s.type='deposit' THEN s.amount ELSE -s.amount END) FROM savings s WHERE s.member_id = m.id), 0) AS "Total Savings",
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.status = 'active'), 0) AS "Active Loans"
      FROM members m
      ORDER BY m.name ASC
    `).all();

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(members);

    ws['!cols'] = [
      { wch: 10 }, // Member ID
      { wch: 25 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Address
      { wch: 12 }, // Joined Date
      { wch: 10 }, // Status
      { wch: 20 }, // Emergency Contact
      { wch: 15 }, // Total Savings
      { wch: 12 }, // Active Loans
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    sendWorkbook(res, wb, `members_${fileDate()}.xlsx`);
  } catch (error) {
    console.error('Error exporting members:', error);
    res.status(500).json({ error: 'Failed to export members' });
  }
});

// GET /api/export/savings - Export savings transactions
router.get('/savings', (req, res) => {
  try {
    const { member_id, date_from, date_to } = req.query;

    let query = `
      SELECT
        s.id AS "Transaction ID",
        m.name AS "Member Name",
        s.type AS "Type",
        s.amount AS "Amount",
        s.date AS "Date",
        s.notes AS "Notes"
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

    query += ' ORDER BY s.date DESC';

    const savings = db.prepare(query).all(...params);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(savings);

    ws['!cols'] = [
      { wch: 15 }, // Transaction ID
      { wch: 25 }, // Member Name
      { wch: 12 }, // Type
      { wch: 15 }, // Amount
      { wch: 12 }, // Date
      { wch: 30 }, // Notes
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Savings');
    sendWorkbook(res, wb, `savings_${fileDate()}.xlsx`);
  } catch (error) {
    console.error('Error exporting savings:', error);
    res.status(500).json({ error: 'Failed to export savings' });
  }
});

// GET /api/export/loans - Export loans data
router.get('/loans', (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        l.id AS "Loan ID",
        m.name AS "Member Name",
        l.amount AS "Principal Amount",
        l.interest_rate AS "Interest Rate (%)",
        l.term_months AS "Term (Months)",
        l.monthly_payment AS "Monthly Payment",
        l.total_interest AS "Total Interest",
        l.total_amount AS "Total Amount",
        l.start_date AS "Start Date",
        l.end_date AS "End Date",
        l.approved_date AS "Approved Date",
        l.status AS "Status",
        l.purpose AS "Purpose",
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS "Total Paid",
        l.total_amount - COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS "Remaining Balance"
      FROM loans l
      JOIN members m ON l.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.created_at DESC';

    const loans = db.prepare(query).all(...params);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(loans);

    ws['!cols'] = [
      { wch: 10 }, // Loan ID
      { wch: 25 }, // Member Name
      { wch: 15 }, // Principal
      { wch: 15 }, // Interest Rate
      { wch: 14 }, // Term
      { wch: 16 }, // Monthly Payment
      { wch: 14 }, // Total Interest
      { wch: 14 }, // Total Amount
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 13 }, // Approved Date
      { wch: 10 }, // Status
      { wch: 25 }, // Purpose
      { wch: 12 }, // Total Paid
      { wch: 16 }, // Remaining Balance
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    sendWorkbook(res, wb, `loans_${fileDate()}.xlsx`);
  } catch (error) {
    console.error('Error exporting loans:', error);
    res.status(500).json({ error: 'Failed to export loans' });
  }
});

// GET /api/export/report - Export full report with multiple sheets
router.get('/report', async (req, res) => {
  try {
    const { period, date } = req.query;
    const range = await getDateRange(period || 'monthly', date);
    const wb = XLSX.utils.book_new();

    // --- Summary Sheet ---
    const totalSavings = db.prepare(
      "SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END), 0) AS total FROM savings WHERE date BETWEEN ? AND ?"
    ).get(range.start, range.end).total;

    const totalLoansDisbursed = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM loans WHERE approved_date BETWEEN ? AND ? AND status IN ('active', 'completed')"
    ).get(range.start, range.end).total;

    const totalRepayments = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM loan_repayments WHERE date BETWEEN ? AND ?'
    ).get(range.start, range.end).total;

    const totalInterestEarned = db.prepare(
      'SELECT COALESCE(SUM(interest), 0) AS total FROM loan_repayments WHERE date BETWEEN ? AND ?'
    ).get(range.start, range.end).total;

    const totalPenalties = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM penalties WHERE date BETWEEN ? AND ?'
    ).get(range.start, range.end).total;

    const memberCount = db.prepare(
      "SELECT COUNT(*) AS count FROM members WHERE status = 'active'"
    ).get().count;

    const activeLoansCount = db.prepare(
      "SELECT COUNT(*) AS count FROM loans WHERE status = 'active'"
    ).get().count;

    const summaryData = [
      { Metric: 'Report Period', Value: `${range.start} to ${range.end}` },
      { Metric: 'Period Type', Value: period || 'monthly' },
      { Metric: 'Active Members', Value: memberCount },
      { Metric: 'Active Loans', Value: activeLoansCount },
      { Metric: 'Total Savings (Period)', Value: totalSavings },
      { Metric: 'Total Loans Disbursed (Period)', Value: totalLoansDisbursed },
      { Metric: 'Total Repayments (Period)', Value: totalRepayments },
      { Metric: 'Interest Earned (Period)', Value: totalInterestEarned },
      { Metric: 'Penalties (Period)', Value: totalPenalties },
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // --- Member Savings Sheet ---
    const memberSavings = db.prepare(`
      SELECT
        m.name AS "Member Name",
        COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE 0 END), 0) AS "Deposits",
        COALESCE(SUM(CASE WHEN s.type = 'withdrawal' THEN s.amount ELSE 0 END), 0) AS "Withdrawals",
        COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE -s.amount END), 0) AS "Net Savings"
      FROM members m
      LEFT JOIN savings s ON s.member_id = m.id AND s.date BETWEEN ? AND ?
      WHERE m.status = 'active'
      GROUP BY m.id
      ORDER BY m.name ASC
    `).all(range.start, range.end);

    const wsMemberSavings = XLSX.utils.json_to_sheet(memberSavings);
    wsMemberSavings['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsMemberSavings, 'Member Savings');

    // --- Loan Portfolio Sheet ---
    const loanPortfolio = db.prepare(`
      SELECT
        l.id AS "Loan ID",
        m.name AS "Member Name",
        l.amount AS "Principal",
        l.interest_rate AS "Rate (%)",
        l.term_months AS "Term",
        l.status AS "Status",
        l.start_date AS "Start Date",
        l.monthly_payment AS "EMI",
        l.total_amount AS "Total Amount",
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS "Total Paid",
        l.total_amount - COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS "Balance"
      FROM loans l
      JOIN members m ON l.member_id = m.id
      ORDER BY l.status ASC, l.created_at DESC
    `).all();

    const wsLoans = XLSX.utils.json_to_sheet(loanPortfolio);
    wsLoans['!cols'] = [
      { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLoans, 'Loan Portfolio');

    // --- Income Statement Sheet ---
    const interestIncome = db.prepare(
      'SELECT COALESCE(SUM(interest), 0) AS total FROM loan_repayments WHERE date BETWEEN ? AND ?'
    ).get(range.start, range.end).total;

    const penaltyIncome = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM penalties WHERE date BETWEEN ? AND ?'
    ).get(range.start, range.end).total;

    const expenses = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'debit' AND date BETWEEN ? AND ?"
    ).get(range.start, range.end).total;

    const incomeData = [
      { Item: 'INCOME', Amount: '' },
      { Item: 'Interest Income', Amount: interestIncome },
      { Item: 'Penalty Income', Amount: penaltyIncome },
      { Item: 'Total Income', Amount: interestIncome + penaltyIncome },
      { Item: '', Amount: '' },
      { Item: 'EXPENSES', Amount: '' },
      { Item: 'Operating Expenses (Adjustments)', Amount: expenses },
      { Item: 'Total Expenses', Amount: expenses },
      { Item: '', Amount: '' },
      { Item: 'NET INCOME', Amount: (interestIncome + penaltyIncome) - expenses },
    ];

    const wsIncome = XLSX.utils.json_to_sheet(incomeData);
    wsIncome['!cols'] = [{ wch: 35 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Income Statement');

    // --- Balance Sheet ---
    const outstandingLoans = db.prepare(`
      SELECT COALESCE(SUM(l.total_amount - COALESCE(
        (SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0
      )), 0) AS total
      FROM loans l
      WHERE l.status = 'active'
    `).get().total;

    const unpaidPenalties = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM penalties WHERE status = 'unpaid'"
    ).get().total;

    const memberSavingsTotal = db.prepare(
      "SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS total FROM savings"
    ).get().total;

    const totalInterestAll = db.prepare(
      'SELECT COALESCE(SUM(interest), 0) AS total FROM loan_repayments'
    ).get().total;

    const totalPenaltiesCollected = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM penalties WHERE status = 'paid'"
    ).get().total;

    const creditAdj = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'credit'"
    ).get().total;

    const debitAdj = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'debit'"
    ).get().total;

    const fundBalance = totalInterestAll + totalPenaltiesCollected + creditAdj - debitAdj;

    const balanceData = [
      { Item: 'ASSETS', Amount: '' },
      { Item: 'Outstanding Loans', Amount: outstandingLoans },
      { Item: 'Unpaid Penalties', Amount: unpaidPenalties },
      { Item: 'Total Assets', Amount: outstandingLoans + unpaidPenalties },
      { Item: '', Amount: '' },
      { Item: 'LIABILITIES', Amount: '' },
      { Item: 'Member Savings', Amount: memberSavingsTotal },
      { Item: 'Total Liabilities', Amount: memberSavingsTotal },
      { Item: '', Amount: '' },
      { Item: 'FUND BALANCE', Amount: fundBalance },
    ];

    const wsBalance = XLSX.utils.json_to_sheet(balanceData);
    wsBalance['!cols'] = [{ wch: 30 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsBalance, 'Balance Sheet');

    sendWorkbook(res, wb, `full_report_${period || 'monthly'}_${fileDate()}.xlsx`);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// GET /api/export/member-statement/:id - Export individual member statement
router.get('/member-statement/:id', (req, res) => {
  try {
    const { id } = req.params;

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const wb = XLSX.utils.book_new();

    // Member Info
    const memberInfo = [
      { Field: 'Name', Value: member.name },
      { Field: 'Email', Value: member.email || '' },
      { Field: 'Phone', Value: member.phone || '' },
      { Field: 'Address', Value: member.address || '' },
      { Field: 'Joined Date', Value: member.joined_date },
      { Field: 'Status', Value: member.status },
    ];

    const wsInfo = XLSX.utils.json_to_sheet(memberInfo);
    wsInfo['!cols'] = [{ wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Member Info');

    // Savings Transactions
    const savings = db.prepare(`
      SELECT
        s.date AS "Date",
        s.type AS "Type",
        s.amount AS "Amount",
        s.notes AS "Notes"
      FROM savings s
      WHERE s.member_id = ?
      ORDER BY s.date DESC
    `).all(id);

    const totalDeposits = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE member_id = ? AND type = 'deposit'"
    ).get(id).total;

    const totalWithdrawals = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE member_id = ? AND type = 'withdrawal'"
    ).get(id).total;

    // Add summary rows at the end
    const savingsWithSummary = [
      ...savings,
      { Date: '', Type: '', Amount: '', Notes: '' },
      { Date: '', Type: 'Total Deposits', Amount: totalDeposits, Notes: '' },
      { Date: '', Type: 'Total Withdrawals', Amount: totalWithdrawals, Notes: '' },
      { Date: '', Type: 'Net Balance', Amount: totalDeposits - totalWithdrawals, Notes: '' },
    ];

    const wsSavings = XLSX.utils.json_to_sheet(savingsWithSummary);
    wsSavings['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSavings, 'Savings');

    // Loans
    const loans = db.prepare(`
      SELECT
        l.id AS "Loan ID",
        l.amount AS "Principal",
        l.interest_rate AS "Rate (%)",
        l.term_months AS "Term",
        l.monthly_payment AS "EMI",
        l.total_amount AS "Total Amount",
        l.start_date AS "Start Date",
        l.status AS "Status",
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS "Total Paid",
        l.total_amount - COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS "Balance"
      FROM loans l
      WHERE l.member_id = ?
      ORDER BY l.created_at DESC
    `).all(id);

    const wsLoans = XLSX.utils.json_to_sheet(loans.length > 0 ? loans : [{ 'No loans found': '' }]);
    wsLoans['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLoans, 'Loans');

    // Loan Repayments
    const repayments = db.prepare(`
      SELECT
        lr.date AS "Date",
        l.id AS "Loan ID",
        lr.amount AS "Amount",
        lr.principal AS "Principal",
        lr.interest AS "Interest",
        lr.penalty AS "Penalty",
        lr.notes AS "Notes"
      FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      WHERE l.member_id = ?
      ORDER BY lr.date DESC
    `).all(id);

    const wsRepayments = XLSX.utils.json_to_sheet(repayments.length > 0 ? repayments : [{ 'No repayments found': '' }]);
    wsRepayments['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRepayments, 'Repayments');

    const safeName = member.name.replace(/[^a-zA-Z0-9]/g, '_');
    sendWorkbook(res, wb, `member_statement_${safeName}_${fileDate()}.xlsx`);
  } catch (error) {
    console.error('Error exporting member statement:', error);
    res.status(500).json({ error: 'Failed to export member statement' });
  }
});

// GET /api/export/amortization/:loanId - Export loan amortization schedule
router.get('/amortization/:loanId', async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = db.prepare(`
      SELECT l.*, m.name AS member_name
      FROM loans l
      JOIN members m ON l.member_id = m.id
      WHERE l.id = ?
    `).get(loanId);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const wb = XLSX.utils.book_new();

    // Loan Summary
    const loanInfo = [
      { Field: 'Borrower', Value: loan.member_name },
      { Field: 'Loan ID', Value: loan.id },
      { Field: 'Principal Amount', Value: loan.amount },
      { Field: 'Interest Rate (%)', Value: loan.interest_rate },
      { Field: 'Term (Months)', Value: loan.term_months },
      { Field: 'Monthly Payment (EMI)', Value: loan.monthly_payment },
      { Field: 'Total Interest', Value: loan.total_interest },
      { Field: 'Total Amount', Value: loan.total_amount },
      { Field: 'Start Date', Value: loan.start_date },
      { Field: 'End Date', Value: loan.end_date },
      { Field: 'Status', Value: loan.status },
    ];

    const wsInfo = XLSX.utils.json_to_sheet(loanInfo);
    wsInfo['!cols'] = [{ wch: 22 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Loan Summary');

    // Amortization Schedule
    const schedule = [];
    const monthlyRate = loan.interest_rate / 12 / 100;
    let balance = loan.amount;
    const baseDate = loan.approved_date || loan.start_date;

    for (let i = 1; i <= loan.term_months; i++) {
      const interestPayment = Math.round(balance * monthlyRate * 100) / 100;
      const principalPayment = Math.round((loan.monthly_payment - interestPayment) * 100) / 100;
      balance = Math.round((balance - principalPayment) * 100) / 100;

      if (i === loan.term_months) {
        balance = 0;
      }

      schedule.push({
        'Month': i,
        'Due Date': await addMonthsToDateString(baseDate, i),
        'Payment': loan.monthly_payment,
        'Principal': principalPayment,
        'Interest': interestPayment,
        'Remaining Balance': Math.max(balance, 0),
      });
    }

    const wsSchedule = XLSX.utils.json_to_sheet(schedule);
    wsSchedule['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSchedule, 'Amortization Schedule');

    // Actual Repayments
    const repayments = db.prepare(`
      SELECT
        lr.date AS "Date",
        lr.amount AS "Amount",
        lr.principal AS "Principal",
        lr.interest AS "Interest",
        lr.penalty AS "Penalty",
        lr.notes AS "Notes"
      FROM loan_repayments lr
      WHERE lr.loan_id = ?
      ORDER BY lr.date ASC
    `).all(loanId);

    const wsRepayments = XLSX.utils.json_to_sheet(repayments.length > 0 ? repayments : [{ 'No repayments yet': '' }]);
    wsRepayments['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRepayments, 'Actual Repayments');

    const safeName = loan.member_name.replace(/[^a-zA-Z0-9]/g, '_');
    sendWorkbook(res, wb, `amortization_${safeName}_loan${loanId}_${fileDate()}.xlsx`);
  } catch (error) {
    console.error('Error exporting amortization schedule:', error);
    res.status(500).json({ error: 'Failed to export amortization schedule' });
  }
});

module.exports = router;
