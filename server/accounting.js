const { db } = require('./db');

const FUNDED_LOAN_STATUSES = ['approved', 'active', 'completed', 'defaulted'];

function toAmount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toComparableTimestamp(value, fallbackDate) {
  if (!value) {
    return `${String(fallbackDate || '').slice(0, 10)}T00:00:00`;
  }

  const normalized = String(value).replace(' ', 'T');
  return normalized.length > 10 ? normalized : `${normalized}T00:00:00`;
}

function compareEntries(a, b) {
  return a.date.localeCompare(b.date)
    || a.timestamp.localeCompare(b.timestamp)
    || (a.sort_order || 0) - (b.sort_order || 0)
    || String(a.reference_id).localeCompare(String(b.reference_id));
}

function classifyAdjustment(reason, direction) {
  const normalized = String(reason || '').toLowerCase();

  if (direction === 'credit' && normalized.includes('bank') && normalized.includes('interest')) {
    return 'bk';
  }

  if (direction === 'credit' && normalized.includes('income')) {
    return 'int';
  }

  return 'adj';
}

function classifyDistributionParticulars(particulars) {
  const normalized = String(particulars || '').toLowerCase();

  if (normalized.includes('total income')) return 'income';
  if (normalized.includes('bonus')) return 'bonus';
  if (normalized.includes('reserve')) return 'reserve';
  return 'other';
}

function classifyReserveParticulars(particulars) {
  const normalized = String(particulars || '').toLowerCase();

  if (normalized.includes('from the income')) return 'allocation';
  if (normalized.includes('moved to income')) return 'release';
  return 'other';
}

function buildFundLedgerRows() {
  const rows = [];

  const savings = db.prepare(`
    SELECT s.id, s.date, s.amount, s.type, s.notes, s.created_at, m.name AS member_name
    FROM savings s
    JOIN members m ON m.id = s.member_id
  `).all();

  for (const saving of savings) {
    const isDeposit = saving.type === 'deposit';
    rows.push({
      date: saving.date,
      timestamp: toComparableTimestamp(saving.created_at, saving.date),
      particulars: isDeposit
        ? `Savings deposit from ${saving.member_name}`
        : `Savings withdrawal by ${saving.member_name}`,
      debit: isDeposit ? null : toAmount(saving.amount),
      credit: isDeposit ? toAmount(saving.amount) : null,
      type: isDeposit ? 'sav' : 'wd',
      source: 'savings',
      source_id: saving.id,
      reference_id: `saving-${saving.id}`,
      sort_order: 10,
      notes: saving.notes || null,
    });
  }

  const loans = db.prepare(`
    SELECT l.id,
      COALESCE(l.approved_date, l.start_date) AS event_date,
      l.amount,
      l.purpose,
      l.created_at,
      m.name AS member_name
    FROM loans l
    JOIN members m ON m.id = l.member_id
    WHERE l.status IN (${FUNDED_LOAN_STATUSES.map(() => '?').join(', ')})
  `).all(...FUNDED_LOAN_STATUSES);

  for (const loan of loans) {
    rows.push({
      date: loan.event_date,
      timestamp: toComparableTimestamp(loan.created_at, loan.event_date),
      particulars: `Loan disbursement to ${loan.member_name}${loan.purpose ? ` - ${loan.purpose}` : ''}`,
      debit: toAmount(loan.amount),
      credit: null,
      type: 'lo',
      source: 'loan',
      source_id: loan.id,
      reference_id: `loan-${loan.id}`,
      sort_order: 20,
      notes: loan.purpose || null,
    });
  }

  const repayments = db.prepare(`
    SELECT lr.id, lr.loan_id, lr.amount, lr.principal, lr.interest, lr.penalty, lr.date, lr.notes, lr.created_at,
      m.name AS member_name
    FROM loan_repayments lr
    JOIN loans l ON l.id = lr.loan_id
    JOIN members m ON m.id = l.member_id
  `).all();

  for (const repayment of repayments) {
    const repaymentDate = repayment.date;
    const repaymentTimestamp = toComparableTimestamp(repayment.created_at, repaymentDate);

    if (toAmount(repayment.principal) > 0) {
      rows.push({
        date: repaymentDate,
        timestamp: repaymentTimestamp,
        particulars: `Loan repayment from ${repayment.member_name}`,
        debit: null,
        credit: toAmount(repayment.principal),
        type: 'clr',
        source: 'loan_repayment',
        source_id: repayment.id,
        reference_id: `repayment-principal-${repayment.id}`,
        sort_order: 30,
        notes: repayment.notes || null,
      });
    }

    if (toAmount(repayment.interest) > 0) {
      rows.push({
        date: repaymentDate,
        timestamp: repaymentTimestamp,
        particulars: `Interest income from ${repayment.member_name}`,
        debit: null,
        credit: toAmount(repayment.interest),
        type: 'int',
        source: 'loan_repayment',
        source_id: repayment.id,
        reference_id: `repayment-interest-${repayment.id}`,
        sort_order: 31,
        notes: repayment.notes || null,
      });
    }

    if (toAmount(repayment.penalty) > 0) {
      rows.push({
        date: repaymentDate,
        timestamp: repaymentTimestamp,
        particulars: `Penalty interest from ${repayment.member_name}`,
        debit: null,
        credit: toAmount(repayment.penalty),
        type: 'pen',
        source: 'loan_repayment',
        source_id: repayment.id,
        reference_id: `repayment-penalty-${repayment.id}`,
        sort_order: 32,
        notes: repayment.notes || null,
      });
    }
  }

  const adjustments = db.prepare(`
    SELECT id, amount, reason, type, date, adjusted_by, created_at
    FROM balance_adjustments
  `).all();

  for (const adjustment of adjustments) {
    const amount = toAmount(adjustment.amount);
    rows.push({
      date: adjustment.date,
      timestamp: toComparableTimestamp(adjustment.created_at, adjustment.date),
      particulars: adjustment.reason || `${adjustment.type} adjustment`,
      debit: adjustment.type === 'debit' ? amount : null,
      credit: adjustment.type === 'credit' ? amount : null,
      type: classifyAdjustment(adjustment.reason, adjustment.type),
      source: 'adjustment',
      source_id: adjustment.id,
      reference_id: `adjustment-${adjustment.id}`,
      sort_order: 40,
      notes: adjustment.adjusted_by || null,
    });
  }

  const sortedRows = rows.sort(compareEntries);
  let runningBalance = 0;

  return sortedRows.map((row, index) => {
    runningBalance = roundCurrency(runningBalance + toAmount(row.credit) - toAmount(row.debit));

    return {
      id: index + 1,
      date: row.date,
      particulars: row.particulars,
      debit: row.debit,
      credit: row.credit,
      balance: runningBalance,
      type: row.type,
      source: row.source,
      source_id: row.source_id,
      notes: row.notes,
    };
  });
}

function summarizeFundLedgerRows(rows) {
  const totalDebit = rows.reduce((sum, row) => sum + toAmount(row.debit), 0);
  const totalCredit = rows.reduce((sum, row) => sum + toAmount(row.credit), 0);
  const lastEntry = rows[rows.length - 1] || null;

  return {
    total_entries: rows.length,
    total_debit: roundCurrency(totalDebit),
    total_credit: roundCurrency(totalCredit),
    current_balance: lastEntry ? roundCurrency(lastEntry.balance) : 0,
    last_date: lastEntry?.date || null,
  };
}

function buildIncomeDataset() {
  const rawEntries = [];

  const repayments = db.prepare(`
    SELECT lr.id, lr.date, lr.interest, lr.penalty, lr.notes, lr.created_at, m.name AS member_name
    FROM loan_repayments lr
    JOIN loans l ON l.id = lr.loan_id
    JOIN members m ON m.id = l.member_id
    WHERE COALESCE(lr.interest, 0) > 0 OR COALESCE(lr.penalty, 0) > 0
  `).all();

  for (const repayment of repayments) {
    if (toAmount(repayment.interest) > 0) {
      rawEntries.push({
        id: `interest-${repayment.id}`,
        date: repayment.date,
        timestamp: toComparableTimestamp(repayment.created_at, repayment.date),
        particulars: `Interest income from ${repayment.member_name}`,
        amount: toAmount(repayment.interest),
        entry_type: 'interest',
      });
    }

    if (toAmount(repayment.penalty) > 0) {
      rawEntries.push({
        id: `penalty-${repayment.id}`,
        date: repayment.date,
        timestamp: toComparableTimestamp(repayment.created_at, repayment.date),
        particulars: `Penalty income from ${repayment.member_name}`,
        amount: toAmount(repayment.penalty),
        entry_type: 'penalty',
      });
    }
  }

  const creditAdjustments = db.prepare(`
    SELECT id, date, amount, reason, created_at
    FROM balance_adjustments
    WHERE type = 'credit'
  `).all();

  for (const adjustment of creditAdjustments) {
    rawEntries.push({
      id: `credit-adjustment-${adjustment.id}`,
      date: adjustment.date,
      timestamp: toComparableTimestamp(adjustment.created_at, adjustment.date),
      particulars: adjustment.reason || 'Credit adjustment',
      amount: toAmount(adjustment.amount),
      entry_type: 'other_income',
    });
  }

  const sortedEntries = rawEntries.sort(compareEntries);
  const groupedPeriods = new Map();

  for (const entry of sortedEntries) {
    const periodKey = String(entry.date || '').slice(0, 7) || 'unknown';
    const periodId = `period-${periodKey}`;
    const existing = groupedPeriods.get(periodId) || {
      id: periodId,
      period_id: periodId,
      period_key: periodKey,
      title_np: `Income ${periodKey}`,
      period_index: groupedPeriods.size,
      entry_count: 0,
      period_total: 0,
      entries: [],
    };

    existing.period_total = roundCurrency(existing.period_total + entry.amount);
    existing.entry_count += 1;
    existing.entries.push({
      id: entry.id,
      period_id: periodId,
      date: entry.date,
      particulars: entry.particulars,
      amount: entry.amount,
      balance: existing.period_total,
      entry_type: entry.entry_type,
    });

    groupedPeriods.set(periodId, existing);
  }

  const periods = Array.from(groupedPeriods.values())
    .sort((a, b) => b.period_key.localeCompare(a.period_key))
    .map((period, index) => ({
      id: period.id,
      period_id: period.period_id,
      period_key: period.period_key,
      title_np: period.title_np,
      period_index: index,
      entry_count: period.entry_count,
      period_total: period.period_total,
    }));

  const entriesByPeriod = new Map(
    Array.from(groupedPeriods.values()).map((period) => [
      period.id,
      period.entries,
    ])
  );

  return { periods, entriesByPeriod };
}

function buildDistributionDataset() {
  const rows = db.prepare('SELECT * FROM distributions ORDER BY date ASC, id ASC').all()
    .map((row) => ({
      ...row,
      entry_type: classifyDistributionParticulars(row.particulars),
    }));

  const groupedRounds = new Map();

  for (const row of rows) {
    const key = row.date || `distribution-${groupedRounds.size + 1}`;
    const round = groupedRounds.get(key) || {
      round: 0,
      date: row.date,
      period: row.particulars,
      income: 0,
      bonus: 0,
      reserve: 0,
      other: 0,
    };

    if (row.entry_type === 'income') {
      round.income += toAmount(row.credit) || toAmount(row.debit);
      round.period = row.particulars;
    } else if (row.entry_type === 'bonus') {
      round.bonus += toAmount(row.debit) || toAmount(row.credit);
    } else if (row.entry_type === 'reserve') {
      round.reserve += toAmount(row.debit) || toAmount(row.credit);
    } else {
      round.other += toAmount(row.credit) - toAmount(row.debit);
    }

    groupedRounds.set(key, round);
  }

  const rounds = Array.from(groupedRounds.values())
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .map((round, index) => ({
      ...round,
      round: index + 1,
    }));

  return { rows, rounds };
}

function buildReserveDataset() {
  const rows = db.prepare('SELECT * FROM reserve_fund ORDER BY date ASC, id ASC').all()
    .map((row) => ({
      ...row,
      entry_type: classifyReserveParticulars(row.particulars),
    }));

  const summary = {
    current_balance: rows.length > 0 ? toAmount(rows[rows.length - 1].balance) : 0,
    total_credited: roundCurrency(rows.reduce((sum, row) => sum + toAmount(row.credit), 0)),
    total_debited: roundCurrency(rows.reduce((sum, row) => sum + toAmount(row.debit), 0)),
    total_entries: rows.length,
  };

  return { rows, summary };
}

module.exports = {
  buildDistributionDataset,
  buildFundLedgerRows,
  buildIncomeDataset,
  buildReserveDataset,
  summarizeFundLedgerRows,
};
