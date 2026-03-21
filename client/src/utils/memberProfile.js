import { normalizeLoan, normalizeMember } from './apiTransforms';

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getSortKey(value) {
  return String(value || '');
}

function getLatestEntry(entries, matcher = () => true) {
  const matchedEntries = entries.filter(matcher);
  return matchedEntries.length > 0 ? matchedEntries[0] : null;
}

export function normalizeMemberStatement(statement) {
  if (!statement) {
    return {
      summary: {},
      deposits: [],
      withdrawals: [],
      loans: [],
      repayments: [],
    };
  }

  return {
    ...statement,
    summary: {
      totalDeposits: toNumber(statement.summary?.total_deposits ?? statement.summary?.totalDeposits),
      totalWithdrawals: toNumber(statement.summary?.total_withdrawals ?? statement.summary?.totalWithdrawals),
      netSavings: toNumber(statement.summary?.net_savings ?? statement.summary?.netSavings),
      totalLoanAmount: toNumber(statement.summary?.total_loan_amount ?? statement.summary?.totalLoanAmount),
      totalLoanRepayable: toNumber(statement.summary?.total_loan_repayable ?? statement.summary?.totalLoanRepayable),
      totalRepayments: toNumber(statement.summary?.total_repayments ?? statement.summary?.totalRepayments),
      outstandingBalance: toNumber(statement.summary?.outstanding_balance ?? statement.summary?.outstandingBalance),
      totalInterestPaid: toNumber(statement.summary?.total_interest_paid ?? statement.summary?.totalInterestPaid),
      totalPenaltyPaid: toNumber(statement.summary?.total_penalty_paid ?? statement.summary?.totalPenaltyPaid),
      totalLoansTaken: toNumber(statement.summary?.total_loans_taken ?? statement.summary?.totalLoansTaken),
      activeLoans: toNumber(statement.summary?.active_loans ?? statement.summary?.activeLoans),
      completedLoans: toNumber(statement.summary?.completed_loans ?? statement.summary?.completedLoans),
      pendingLoans: toNumber(statement.summary?.pending_loans ?? statement.summary?.pendingLoans),
      repaymentCount: toNumber(statement.summary?.repayment_count ?? statement.summary?.repaymentCount),
      savingsTransactionCount: toNumber(statement.summary?.savings_transaction_count ?? statement.summary?.savingsTransactionCount),
      averageDeposit: toNumber(statement.summary?.average_deposit ?? statement.summary?.averageDeposit),
      averageRepayment: toNumber(statement.summary?.average_repayment ?? statement.summary?.averageRepayment),
      lastLoanDate: statement.summary?.last_loan_date ?? statement.summary?.lastLoanDate ?? null,
      lastLoanAt: statement.summary?.last_loan_at ?? statement.summary?.lastLoanAt ?? null,
      lastRepaymentDate: statement.summary?.last_repayment_date ?? statement.summary?.lastRepaymentDate ?? null,
      lastRepaymentAt: statement.summary?.last_repayment_at ?? statement.summary?.lastRepaymentAt ?? null,
    },
    deposits: Array.isArray(statement.deposits) ? statement.deposits : [],
    withdrawals: Array.isArray(statement.withdrawals) ? statement.withdrawals : [],
    loans: Array.isArray(statement.loans) ? statement.loans.map(normalizeLoan).filter(Boolean) : [],
    repayments: Array.isArray(statement.repayments)
      ? statement.repayments.map((repayment) => ({
          ...repayment,
          id: repayment.id ?? null,
          loanId: repayment.loan_id ?? repayment.loanId ?? null,
          amount: toNumber(repayment.amount),
          principal: toNumber(repayment.principal),
          interest: toNumber(repayment.interest),
          penalty: toNumber(repayment.penalty),
        }))
      : [],
  };
}

export function buildLoanMetrics(loans, repayments) {
  return loans.map((loan) => {
    const loanRepayments = repayments.filter((repayment) => String(repayment.loanId) === String(loan.id));
    const totalPaid = toNumber(loan.total_paid ?? loan.totalPaid, loanRepayments.reduce((sum, repayment) => sum + repayment.amount, 0));
    const principalPaid = toNumber(loan.principal_paid ?? loan.principalPaid, loanRepayments.reduce((sum, repayment) => sum + repayment.principal, 0));
    const interestPaid = toNumber(loan.interest_paid ?? loan.interestPaid, loanRepayments.reduce((sum, repayment) => sum + repayment.interest, 0));
    const penaltyPaid = toNumber(loan.penalty_paid ?? loan.penaltyPaid, loanRepayments.reduce((sum, repayment) => sum + repayment.penalty, 0));
    const totalRepayable = toNumber(loan.total_amount ?? loan.totalAmount, toNumber(loan.amount));
    const remainingBalance = toNumber(
      loan.remaining_balance ?? loan.remainingBalance,
      Math.max(totalRepayable - totalPaid, 0)
    );
    const repaymentCount = toNumber(loan.repayment_count ?? loan.repaymentCount, loanRepayments.length);
    const lastRepaymentDate = loan.last_repayment_date ?? loan.lastRepaymentDate ?? loanRepayments[0]?.date ?? null;
    const lastRepaymentAt = loan.last_repayment_at ?? loan.lastRepaymentAt ?? loanRepayments[0]?.created_at ?? null;

    return {
      ...loan,
      totalPaid,
      principalPaid,
      interestPaid,
      penaltyPaid,
      totalRepayable,
      remainingBalance,
      repaymentCount,
      progressPercent: totalRepayable > 0 ? Math.min((totalPaid / totalRepayable) * 100, 100) : 0,
      lastRepaymentDate,
      lastRepaymentAt,
      repayments: loanRepayments,
    };
  });
}

export function buildMemberActivity({ savingsHistory, loans, repayments }) {
  const savingsActivity = savingsHistory.map((transaction) => ({
    id: `saving-${transaction.id}`,
    title: transaction.type === 'deposit' ? 'Savings deposit' : 'Savings withdrawal',
    amount: toNumber(transaction.amount),
    accent: transaction.type === 'deposit' ? 'emerald' : 'rose',
    date: transaction.date,
    timestamp: transaction.created_at || transaction.date,
    subtitle: transaction.notes || 'Savings account transaction',
  }));

  const loanActivity = loans.map((loan) => ({
    id: `loan-${loan.id}`,
    title: `Loan ${loan.status || 'recorded'}`,
    amount: toNumber(loan.amount),
    accent: loan.status === 'completed' ? 'sky' : loan.status === 'active' || loan.status === 'approved' ? 'amber' : 'slate',
    date: loan.approvedDate || loan.startDate,
    timestamp: loan.created_at || loan.createdAt || loan.approvedDate || loan.startDate,
    subtitle: loan.purpose || `${toNumber(loan.interestRate)}% interest for ${toNumber(loan.term_months ?? loan.term)} months`,
  }));

  const repaymentActivity = repayments.map((repayment) => ({
    id: `repayment-${repayment.id}`,
    title: 'Loan repayment',
    amount: repayment.amount,
    accent: 'indigo',
    date: repayment.date,
    timestamp: repayment.created_at || repayment.date,
    subtitle: repayment.notes || `Principal ${repayment.principal}, interest ${repayment.interest}`,
  }));

  return [...savingsActivity, ...loanActivity, ...repaymentActivity]
    .sort((left, right) => getSortKey(right.timestamp).localeCompare(getSortKey(left.timestamp)))
    .slice(0, 12);
}

export function buildMemberProfileData(memberData, statementData) {
  const member = normalizeMember(memberData);
  const statement = normalizeMemberStatement(statementData);
  const savingsHistory = member?.savingsHistory || [];
  const loans = buildLoanMetrics(
    statement.loans.length > 0 ? statement.loans : member?.loans || [],
    statement.repayments
  );
  const latestSavings = getLatestEntry(savingsHistory);
  const latestDeposit = getLatestEntry(savingsHistory, (transaction) => transaction.type === 'deposit');
  const latestWithdrawal = getLatestEntry(savingsHistory, (transaction) => transaction.type === 'withdrawal');
  const activeLoans = loans.filter((loan) => loan.status === 'active' || loan.status === 'approved');
  const totalLoanRepayable = toNumber(
    statement.summary.totalLoanRepayable,
    loans.reduce((sum, loan) => sum + toNumber(loan.totalRepayable), 0)
  );
  const totalLoanAmount = toNumber(
    statement.summary.totalLoanAmount,
    loans.reduce((sum, loan) => sum + toNumber(loan.amount), 0)
  );
  const totalRepayments = toNumber(
    statement.summary.totalRepayments,
    loans.reduce((sum, loan) => sum + loan.totalPaid, 0)
  );
  const totalPrincipalPaid = loans.reduce((sum, loan) => sum + loan.principalPaid, 0);
  const totalInterestPaid = toNumber(
    statement.summary.totalInterestPaid,
    loans.reduce((sum, loan) => sum + loan.interestPaid, 0)
  );
  const totalPenaltyPaid = toNumber(
    statement.summary.totalPenaltyPaid,
    loans.reduce((sum, loan) => sum + loan.penaltyPaid, 0)
  );
  const totalLoansTaken = toNumber(statement.summary.totalLoansTaken, loans.length);

  const totals = {
    totalSavings: toNumber(member?.totalSavings, statement.summary.netSavings),
    totalDeposits: toNumber(member?.totalDeposits, statement.summary.totalDeposits),
    totalWithdrawals: toNumber(member?.totalWithdrawals, statement.summary.totalWithdrawals),
    totalLoansTaken,
    totalLoanAmount,
    totalLoanRepayable,
    totalRepayments,
    outstandingBalance: toNumber(statement.summary.outstandingBalance, loans.reduce((sum, loan) => sum + loan.remainingBalance, 0)),
    totalPrincipalPaid,
    totalInterestPaid,
    totalPenaltyPaid,
    activeLoans: toNumber(statement.summary.activeLoans, activeLoans.length),
    completedLoans: toNumber(statement.summary.completedLoans, loans.filter((loan) => loan.status === 'completed').length),
    pendingLoans: toNumber(statement.summary.pendingLoans, loans.filter((loan) => loan.status === 'pending').length),
    repaymentCount: toNumber(statement.summary.repaymentCount, statement.repayments.length),
    savingsTransactionCount: toNumber(statement.summary.savingsTransactionCount, savingsHistory.length),
    averageDeposit: toNumber(statement.summary.averageDeposit),
    averageRepayment: toNumber(statement.summary.averageRepayment),
    averageLoanSize: totalLoansTaken > 0 ? totalLoanAmount / totalLoansTaken : 0,
    monthlyLoanObligation: activeLoans.reduce((sum, loan) => sum + toNumber(loan.monthlyPayment), 0),
    repaymentProgressPercent: totalLoanRepayable > 0 ? Math.min((totalRepayments / totalLoanRepayable) * 100, 100) : 0,
    savingsCoveragePercent: totalLoanRepayable > 0 ? Math.max((toNumber(member?.totalSavings, statement.summary.netSavings) / totalLoanRepayable) * 100, 0) : 0,
    lastLoanDate: statement.summary.lastLoanDate || loans[0]?.approvedDate || loans[0]?.startDate || null,
    lastLoanAt: statement.summary.lastLoanAt || loans[0]?.created_at || loans[0]?.createdAt || null,
    lastRepaymentDate: statement.summary.lastRepaymentDate || statement.repayments[0]?.date || null,
    lastRepaymentAt: statement.summary.lastRepaymentAt || statement.repayments[0]?.created_at || null,
    lastSavingsDate: latestSavings?.date ?? null,
    lastSavingsAt: latestSavings?.created_at ?? latestSavings?.date ?? null,
    lastDepositDate: latestDeposit?.date ?? null,
    lastDepositAt: latestDeposit?.created_at ?? latestDeposit?.date ?? null,
    lastWithdrawalDate: latestWithdrawal?.date ?? null,
    lastWithdrawalAt: latestWithdrawal?.created_at ?? latestWithdrawal?.date ?? null,
  };

  return {
    member,
    statement,
    loans,
    savingsHistory,
    repayments: statement.repayments,
    recentActivity: buildMemberActivity({ savingsHistory, loans, repayments: statement.repayments }),
    totals,
  };
}
