const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { diffWholeMonths, getDateRange, getTodayDateString } = require('../date-utils');

// GET /api/reports/summary
router.get('/summary', async (req, res) => {
  try {
    const { period, date } = req.query;
    const range = await getDateRange(period || 'monthly', date);

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

    // Net fund balance: all savings + all repayments - all disbursed loans + adjustments
    const allDeposits = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE type = 'deposit'"
    ).get().total;
    const allWithdrawals = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE type = 'withdrawal'"
    ).get().total;
    const allRepayments = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM loan_repayments'
    ).get().total;
    const allDisbursed = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM loans WHERE status IN ('active', 'completed')"
    ).get().total;
    const creditAdjustments = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'credit'"
    ).get().total;
    const debitAdjustments = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'debit'"
    ).get().total;

    const netFundBalance = (allDeposits - allWithdrawals) + allRepayments - allDisbursed + creditAdjustments - debitAdjustments;

    const memberCount = db.prepare(
      "SELECT COUNT(*) AS count FROM members WHERE status = 'active'"
    ).get().count;

    const newMembers = db.prepare(
      "SELECT COUNT(*) AS count FROM members WHERE joined_date BETWEEN ? AND ? AND status = 'active'"
    ).get(range.start, range.end).count;

    const activeLoansCount = db.prepare(
      "SELECT COUNT(*) AS count FROM loans WHERE status = 'active'"
    ).get().count;

    res.json({
      period: period || 'monthly',
      date_range: range,
      total_savings: totalSavings,
      total_loans_disbursed: totalLoansDisbursed,
      total_repayments: totalRepayments,
      total_interest_earned: totalInterestEarned,
      total_penalties: totalPenalties,
      net_fund_balance: netFundBalance,
      member_count: memberCount,
      new_members: newMembers,
      active_loans_count: activeLoansCount,
    });
  } catch (error) {
    console.error('Error fetching report summary:', error);
    res.status(500).json({ error: 'Failed to fetch report summary' });
  }
});

// GET /api/reports/member-savings - savings by member for period
router.get('/member-savings', async (req, res) => {
  try {
    const { period, date } = req.query;
    const range = await getDateRange(period || 'monthly', date);

    const memberSavings = db.prepare(`
      SELECT
        m.id AS member_id,
        m.name AS member_name,
        COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE 0 END), 0) AS deposits,
        COALESCE(SUM(CASE WHEN s.type = 'withdrawal' THEN s.amount ELSE 0 END), 0) AS withdrawals,
        COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE -s.amount END), 0) AS net
      FROM members m
      LEFT JOIN savings s ON s.member_id = m.id AND s.date BETWEEN ? AND ?
      WHERE m.status = 'active'
      GROUP BY m.id
      ORDER BY m.name ASC
    `).all(range.start, range.end);

    res.json({ period: period || 'monthly', date_range: range, members: memberSavings });
  } catch (error) {
    console.error('Error fetching member savings report:', error);
    res.status(500).json({ error: 'Failed to fetch member savings report' });
  }
});

// GET /api/reports/loan-portfolio - loan status breakdown
router.get('/loan-portfolio', (req, res) => {
  try {
    const statusBreakdown = db.prepare(`
      SELECT
        status,
        COUNT(*) AS count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(total_interest), 0) AS total_interest
      FROM loans
      GROUP BY status
    `).all();

    const totalOutstanding = db.prepare(`
      SELECT COALESCE(SUM(l.total_amount - COALESCE(
        (SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0
      )), 0) AS total
      FROM loans l
      WHERE l.status = 'active'
    `).get().total;

    const averageLoanSize = db.prepare(
      'SELECT COALESCE(AVG(amount), 0) AS avg_amount FROM loans'
    ).get().avg_amount;

    res.json({
      status_breakdown: statusBreakdown,
      total_outstanding: totalOutstanding,
      average_loan_size: Math.round(averageLoanSize * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching loan portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch loan portfolio' });
  }
});

// GET /api/reports/income-statement - interest income, penalties, expenses for period
router.get('/income-statement', async (req, res) => {
  try {
    const { period, date } = req.query;
    const range = await getDateRange(period || 'monthly', date);

    const interestIncome = db.prepare(
      'SELECT COALESCE(SUM(interest), 0) AS total FROM loan_repayments WHERE date BETWEEN ? AND ?'
    ).get(range.start, range.end).total;

    const penaltyIncome = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM penalties WHERE date BETWEEN ? AND ?'
    ).get(range.start, range.end).total;

    const totalIncome = interestIncome + penaltyIncome;

    // Expenses from debit adjustments
    const expenses = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'debit' AND date BETWEEN ? AND ?"
    ).get(range.start, range.end).total;

    const netIncome = totalIncome - expenses;

    res.json({
      period: period || 'monthly',
      date_range: range,
      interest_income: interestIncome,
      penalty_income: penaltyIncome,
      total_income: totalIncome,
      expenses,
      net_income: netIncome,
    });
  } catch (error) {
    console.error('Error fetching income statement:', error);
    res.status(500).json({ error: 'Failed to fetch income statement' });
  }
});

// GET /api/reports/balance-sheet - assets, liabilities, fund balance
router.get('/balance-sheet', (req, res) => {
  try {
    // Assets: outstanding loans (total loan amount - repayments for active loans)
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

    const totalAssets = outstandingLoans + unpaidPenalties;

    // Liabilities: member savings (net deposits)
    const memberSavings = db.prepare(
      "SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS total FROM savings"
    ).get().total;

    const totalLiabilities = memberSavings;

    // Fund balance: total interest earned + total penalties collected + adjustments - expenses
    const totalInterestEarned = db.prepare(
      'SELECT COALESCE(SUM(interest), 0) AS total FROM loan_repayments'
    ).get().total;

    const totalPenaltiesCollected = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM penalties WHERE status = 'paid'"
    ).get().total;

    const creditAdjustments = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'credit'"
    ).get().total;

    const debitAdjustments = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE type = 'debit'"
    ).get().total;

    const fundBalance = totalInterestEarned + totalPenaltiesCollected + creditAdjustments - debitAdjustments;

    res.json({
      assets: {
        outstanding_loans: outstandingLoans,
        unpaid_penalties: unpaidPenalties,
        total: totalAssets,
      },
      liabilities: {
        member_savings: memberSavings,
        total: totalLiabilities,
      },
      fund_balance: fundBalance,
    });
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet' });
  }
});

// GET /api/reports/overdue-loans - list of overdue loans with penalty amounts
router.get('/overdue-loans', async (req, res) => {
  try {
    const activeLoans = db.prepare(`
      SELECT l.*, m.name AS member_name,
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.loan_id = l.id), 0) AS total_paid,
        (SELECT COUNT(*) FROM loan_repayments lr WHERE lr.loan_id = l.id) AS repayment_count
      FROM loans l
      JOIN members m ON l.member_id = m.id
      WHERE l.status = 'active'
    `).all();

    const today = await getTodayDateString(activeLoans[0]?.approved_date || activeLoans[0]?.start_date);
    const overdueLoans = [];

    for (const loan of activeLoans) {
      const expectedPayments = Math.floor(
        diffWholeMonths(loan.approved_date || loan.start_date, today)
      );

      const missedPayments = Math.max(0, expectedPayments - loan.repayment_count);

      if (missedPayments > 0) {
        const totalPrincipalPaid = db.prepare(
          'SELECT COALESCE(SUM(principal), 0) AS total FROM loan_repayments WHERE loan_id = ?'
        ).get(loan.id).total;

        const remainingPrincipal = loan.amount - totalPrincipalPaid;
        const penaltyRate = loan.penalty_rate / 100;
        const penaltyAmount = Math.round(remainingPrincipal * penaltyRate * missedPayments / 12 * 100) / 100;

        const unpaidPenalties = db.prepare(
          "SELECT COALESCE(SUM(amount), 0) AS total FROM penalties WHERE loan_id = ? AND status = 'unpaid'"
        ).get(loan.id).total;

        overdueLoans.push({
          ...loan,
          missed_payments: missedPayments,
          remaining_principal: remainingPrincipal,
          calculated_penalty: penaltyAmount,
          existing_unpaid_penalties: unpaidPenalties,
          remaining_balance: loan.total_amount - loan.total_paid,
        });
      }
    }

    res.json(overdueLoans);
  } catch (error) {
    console.error('Error fetching overdue loans:', error);
    res.status(500).json({ error: 'Failed to fetch overdue loans' });
  }
});

module.exports = router;
