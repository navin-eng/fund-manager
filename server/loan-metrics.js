const { db } = require('./db');
const { diffWholeMonths, getTodayDateString } = require('./date-utils');

const PENALTY_INTEREST_RATE = 24;

function toAmount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getLoanRepaymentStats(loanId) {
  return db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) AS total_paid,
      COALESCE(SUM(COALESCE(principal, 0)), 0) AS principal_paid,
      COALESCE(SUM(COALESCE(interest, 0)), 0) AS interest_paid,
      COALESCE(SUM(COALESCE(penalty, 0)), 0) AS penalty_paid,
      COUNT(*) AS repayment_count,
      (SELECT date FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC, created_at DESC LIMIT 1) AS last_repayment_date,
      (SELECT created_at FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC, created_at DESC LIMIT 1) AS last_repayment_at,
      (SELECT date FROM loan_repayments WHERE loan_id = ? AND COALESCE(principal, 0) > 0 ORDER BY date DESC, created_at DESC LIMIT 1) AS last_balance_reduction_date,
      (SELECT created_at FROM loan_repayments WHERE loan_id = ? AND COALESCE(principal, 0) > 0 ORDER BY date DESC, created_at DESC LIMIT 1) AS last_balance_reduction_at
    FROM loan_repayments
    WHERE loan_id = ?
  `).get(loanId, loanId, loanId, loanId, loanId);
}

function getRemainingPrincipal(loan, stats = null) {
  const repaymentStats = stats || getLoanRepaymentStats(loan.id);
  return Math.max(0, roundCurrency(toAmount(loan.amount) - toAmount(repaymentStats.principal_paid)));
}

function getReferenceReductionDate(loan, stats = null) {
  const repaymentStats = stats || getLoanRepaymentStats(loan.id);
  return repaymentStats.last_balance_reduction_date || loan.approved_date || loan.start_date;
}

function getMonthsSinceBalanceReduction(loan, asOfDate, stats = null) {
  const referenceDate = getReferenceReductionDate(loan, stats);
  return Math.max(0, diffWholeMonths(referenceDate, asOfDate));
}

async function buildPenaltySnapshot(loan, asOfDate = null, providedStats = null) {
  const stats = providedStats || getLoanRepaymentStats(loan.id);
  const referenceDate = loan.approved_date || loan.start_date;
  const effectiveDate = asOfDate || await getTodayDateString(referenceDate);
  const remainingPrincipal = getRemainingPrincipal(loan, stats);
  const monthsSinceBalanceReduction = getMonthsSinceBalanceReduction(loan, effectiveDate, stats);
  const penaltyRateActive = remainingPrincipal > 0 && monthsSinceBalanceReduction >= 6;
  const baseInterestRate = toAmount(loan.interest_rate);
  const effectiveInterestRate = penaltyRateActive
    ? Math.max(baseInterestRate, PENALTY_INTEREST_RATE)
    : baseInterestRate;
  const baseInterestCharge = roundCurrency(remainingPrincipal * (baseInterestRate / 12 / 100));
  const totalInterestCharge = roundCurrency(remainingPrincipal * (effectiveInterestRate / 12 / 100));
  const penaltyInterestCharge = penaltyRateActive
    ? Math.max(0, roundCurrency(totalInterestCharge - baseInterestCharge))
    : 0;

  const unpaidPenaltyBalance = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM penalties
    WHERE loan_id = ? AND status = 'unpaid'
  `).get(loan.id).total;

  return {
    as_of_date: effectiveDate,
    repayment_count: toAmount(stats.repayment_count),
    total_paid: toAmount(stats.total_paid),
    principal_paid: toAmount(stats.principal_paid),
    interest_paid: toAmount(stats.interest_paid),
    penalty_paid: toAmount(stats.penalty_paid),
    last_repayment_date: stats.last_repayment_date || null,
    last_repayment_at: stats.last_repayment_at || null,
    last_balance_reduction_date: stats.last_balance_reduction_date || referenceDate,
    last_balance_reduction_at: stats.last_balance_reduction_at || null,
    remaining_principal: remainingPrincipal,
    months_since_balance_reduction: monthsSinceBalanceReduction,
    penalty_rate_active: penaltyRateActive,
    penalty_interest_rate: penaltyRateActive ? PENALTY_INTEREST_RATE : null,
    effective_interest_rate: effectiveInterestRate,
    base_interest_charge: baseInterestCharge,
    calculated_penalty_interest: penaltyInterestCharge,
    total_interest_charge: totalInterestCharge,
    existing_unpaid_penalties: toAmount(unpaidPenaltyBalance),
  };
}

async function splitRepaymentAmount(loan, amount, asOfDate = null, providedStats = null) {
  const snapshot = await buildPenaltySnapshot(loan, asOfDate, providedStats);
  const paymentAmount = roundCurrency(toAmount(amount));
  const baseInterest = snapshot.base_interest_charge;
  const penaltyInterest = snapshot.calculated_penalty_interest;

  let interestPortion = 0;
  let penaltyPortion = 0;
  let principalPortion = 0;

  if (paymentAmount <= baseInterest) {
    interestPortion = paymentAmount;
  } else if (paymentAmount <= baseInterest + penaltyInterest) {
    interestPortion = baseInterest;
    penaltyPortion = roundCurrency(paymentAmount - baseInterest);
  } else {
    interestPortion = baseInterest;
    penaltyPortion = penaltyInterest;
    principalPortion = roundCurrency(Math.min(
      snapshot.remaining_principal,
      paymentAmount - baseInterest - penaltyInterest
    ));
  }

  return {
    interestPortion: roundCurrency(interestPortion),
    penaltyPortion: roundCurrency(penaltyPortion),
    principalPortion: roundCurrency(principalPortion),
    snapshot,
  };
}

module.exports = {
  PENALTY_INTEREST_RATE,
  buildPenaltySnapshot,
  getLoanRepaymentStats,
  getMonthsSinceBalanceReduction,
  getRemainingPrincipal,
  splitRepaymentAmount,
};
