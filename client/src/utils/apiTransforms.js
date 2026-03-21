function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeLoan(loan) {
  if (!loan) return null;

  return {
    ...loan,
    id: loan.id ?? loan._id ?? null,
    memberId: loan.member_id ?? loan.memberId ?? null,
    memberName: loan.member_name ?? loan.memberName ?? loan.member?.name ?? '',
    interestRate: loan.interest_rate ?? loan.interestRate ?? null,
    startDate: loan.start_date ?? loan.startDate ?? null,
    approvedDate: loan.approved_date ?? loan.approvedDate ?? null,
    monthlyPayment: loan.monthly_payment ?? loan.monthlyPayment ?? null,
    totalInterest: loan.total_interest ?? loan.totalInterest ?? null,
    totalAmount: loan.total_amount ?? loan.totalAmount ?? null,
    remainingBalance: loan.remaining_balance ?? loan.remainingBalance ?? null,
  };
}

export function normalizeMember(member) {
  if (!member) return null;

  const savingsHistory = Array.isArray(member.savings_history)
    ? member.savings_history
    : Array.isArray(member.savingsHistory)
      ? member.savingsHistory
      : [];
  const normalizedLoans = Array.isArray(member.loans)
    ? member.loans.map(normalizeLoan).filter(Boolean)
    : [];

  const totalDeposits = member.total_deposits ?? member.totalDeposits ?? savingsHistory.reduce(
    (sum, txn) => sum + (txn.type === 'deposit' ? toNumber(txn.amount) : 0),
    0
  );
  const totalWithdrawals = member.total_withdrawals ?? member.totalWithdrawals ?? savingsHistory.reduce(
    (sum, txn) => sum + (txn.type === 'withdrawal' ? toNumber(txn.amount) : 0),
    0
  );
  const totalSavings = member.total_savings ?? member.totalSavings ?? (toNumber(totalDeposits) - toNumber(totalWithdrawals));
  const activeLoans = member.active_loans ?? member.activeLoans ?? normalizedLoans.filter(
    (loan) => loan.status === 'active' || loan.status === 'approved'
  ).length;

  return {
    ...member,
    id: member.id ?? member._id ?? null,
    joinedDate: member.joined_date ?? member.joinedDate ?? null,
    createdAt: member.created_at ?? member.createdAt ?? null,
    emergencyContact: member.emergency_contact ?? member.emergencyContact ?? '',
    totalSavings: toNumber(totalSavings),
    totalDeposits: toNumber(totalDeposits),
    totalWithdrawals: toNumber(totalWithdrawals),
    activeLoans: toNumber(activeLoans),
    savingsHistory,
    loans: normalizedLoans,
  };
}

export function normalizeSavingsSummary(summary) {
  return {
    totalDeposits: toNumber(summary?.total_deposits ?? summary?.totalDeposits),
    totalWithdrawals: toNumber(summary?.total_withdrawals ?? summary?.totalWithdrawals),
    netSavings: toNumber(summary?.net_savings ?? summary?.netSavings),
    byMember: Array.isArray(summary?.by_member) ? summary.by_member : Array.isArray(summary?.byMember) ? summary.byMember : [],
  };
}

export function normalizeReportSummary(summary) {
  return {
    totalSavings: toNumber(summary?.total_savings ?? summary?.totalSavings),
    loansDisbursed: toNumber(summary?.total_loans_disbursed ?? summary?.loansDisbursed),
    repaymentsCollected: toNumber(summary?.total_repayments ?? summary?.repaymentsCollected),
    interestEarned: toNumber(summary?.total_interest_earned ?? summary?.interestEarned),
    penaltiesCollected: toNumber(summary?.total_penalties ?? summary?.penaltiesCollected),
    netFundBalance: toNumber(summary?.net_fund_balance ?? summary?.netFundBalance),
    memberCount: toNumber(summary?.member_count ?? summary?.memberCount),
    newMembers: toNumber(summary?.new_members ?? summary?.newMembers),
    activeLoans: toNumber(summary?.active_loans_count ?? summary?.activeLoans),
    dateRange: summary?.date_range ?? summary?.dateRange ?? null,
    period: summary?.period ?? 'monthly',
  };
}

export function normalizeMemberSavingsReport(report) {
  const rows = Array.isArray(report?.members) ? report.members : Array.isArray(report) ? report : [];
  const totalNet = rows.reduce((sum, row) => sum + toNumber(row.net ?? row.net_savings ?? row.netSavings), 0);

  return rows.map((row) => {
    const netSavings = toNumber(row.net ?? row.net_savings ?? row.netSavings);
    return {
      ...row,
      memberName: row.member_name ?? row.memberName ?? row.member ?? '-',
      deposits: toNumber(row.deposits),
      withdrawals: toNumber(row.withdrawals),
      netSavings,
      percentOfTotal: totalNet > 0 ? (netSavings / totalNet) * 100 : null,
    };
  });
}

export function normalizeLoanPortfolio(portfolio) {
  const rows = Array.isArray(portfolio?.status_breakdown)
    ? portfolio.status_breakdown
    : Array.isArray(portfolio)
      ? portfolio
      : [];
  const totalAmount = rows.reduce((sum, row) => sum + toNumber(row.total_amount ?? row.totalAmount), 0);

  return {
    rows: rows.map((row) => {
      const amount = toNumber(row.total_amount ?? row.totalAmount);
      return {
        ...row,
        totalAmount: amount,
        totalInterest: toNumber(row.total_interest ?? row.totalInterest),
        percentOfPortfolio: totalAmount > 0 ? (amount / totalAmount) * 100 : null,
      };
    }),
    totalOutstanding: toNumber(portfolio?.total_outstanding ?? portfolio?.totalOutstanding),
    averageLoanSize: toNumber(portfolio?.average_loan_size ?? portfolio?.averageLoanSize),
  };
}

export function normalizeIncomeStatement(statement) {
  return {
    interestIncome: toNumber(statement?.interest_income ?? statement?.interestIncome),
    penaltyIncome: toNumber(statement?.penalty_income ?? statement?.penaltyIncome),
    totalIncome: toNumber(statement?.total_income ?? statement?.totalIncome),
    expenses: toNumber(statement?.expenses),
    netIncome: toNumber(statement?.net_income ?? statement?.netIncome),
  };
}

export function normalizeBalanceSheet(balanceSheet) {
  const assets = balanceSheet?.assets ?? {};
  const liabilities = balanceSheet?.liabilities ?? {};

  return {
    outstandingLoans: toNumber(assets.outstanding_loans ?? balanceSheet?.outstandingLoans),
    unpaidPenalties: toNumber(assets.unpaid_penalties ?? balanceSheet?.unpaidPenalties),
    totalAssets: toNumber(assets.total ?? balanceSheet?.totalAssets),
    memberSavings: toNumber(liabilities.member_savings ?? balanceSheet?.memberSavings),
    totalLiabilities: toNumber(liabilities.total ?? balanceSheet?.totalLiabilities),
    fundBalance: toNumber(balanceSheet?.fund_balance ?? balanceSheet?.fundBalance),
  };
}

export function normalizeOverdueLoans(loans) {
  const rows = Array.isArray(loans) ? loans : [];
  return rows.map((row) => ({
    ...row,
    memberName: row.member_name ?? row.memberName ?? row.member ?? '-',
    loanAmount: toNumber(row.amount ?? row.loanAmount),
    missedPayments: toNumber(row.missed_payments ?? row.missedPayments),
    penaltyAmount: toNumber(row.calculated_penalty ?? row.penaltyAmount),
    remainingBalance: toNumber(row.remaining_balance ?? row.remainingBalance),
  }));
}
