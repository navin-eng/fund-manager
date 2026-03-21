import { useState, useEffect } from 'react';
import {
  PiggyBank,
  Landmark,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function MemberDashboard() {
  const { user, token } = useAuth();
  const { formatDate, formatCurrency: localeFormatCurrency } = useLocale();
  const [memberData, setMemberData] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const memberId = user?.member_id;

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [memberRes, statementRes] = await Promise.all([
          fetch(`/api/members/${memberId}`, { headers }),
          fetch(`/api/members/${memberId}/statement`, { headers }),
        ]);

        if (memberRes.ok) {
          const data = await memberRes.json();
          setMemberData(data);
        }

        if (statementRes.ok) {
          const data = await statementRes.json();
          setStatement(data);
        }
      } catch (err) {
        console.error('Error loading member dashboard:', err);
        setError('Failed to load your dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [memberId, token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-12 w-12 rounded-lg bg-slate-200 mb-4" />
              <div className="h-8 w-28 rounded bg-slate-200 mb-2" />
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!memberId) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Account Not Linked</h2>
        <p className="text-slate-600">
          Your user account is not linked to a member profile. Please contact your fund administrator.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const member = memberData || {};
  const summary = statement?.summary || {};
  const savingsHistory = memberData?.savings_history || [];
  const loans = memberData?.loans || [];
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'approved');
  const repayments = statement?.repayments || [];

  const savingsBalance = summary.net_savings ?? member.total_savings ?? 0;
  const outstandingLoanBalance = summary.outstanding_balance ?? 0;

  // Find next payment due from active loans
  const nextPaymentLoan = activeLoans.length > 0 ? activeLoans[0] : null;
  const nextPaymentAmount = nextPaymentLoan?.monthly_payment ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Welcome back, {member.name || user.name}!</h1>
        <p className="mt-1 text-indigo-100 text-sm">
          Here is an overview of your fund account as of {formatDate(new Date().toISOString())}.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Savings Balance */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <PiggyBank className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">My Savings Balance</p>
              <p className="text-2xl font-bold text-slate-900">Rs {savingsBalance.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span>Deposits: Rs {(summary.total_deposits ?? 0).toLocaleString()}</span>
            <span>Withdrawals: Rs {(summary.total_withdrawals ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Active Loans */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">My Active Loans</p>
              <p className="text-2xl font-bold text-slate-900">{activeLoans.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span>Outstanding: Rs {outstandingLoanBalance.toLocaleString()}</span>
            <span>Repaid: Rs {(summary.total_repayments ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Next Payment Due */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Next Payment Due</p>
              <p className="text-2xl font-bold text-slate-900">
                {nextPaymentAmount > 0 ? `Rs ${nextPaymentAmount.toLocaleString()}` : 'None'}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
            {nextPaymentLoan
              ? <span>For loan of Rs {nextPaymentLoan.amount.toLocaleString()} at {nextPaymentLoan.interest_rate}% interest</span>
              : <span>No active loans requiring payment</span>
            }
          </div>
        </div>
      </div>

      {/* Two-column layout: Savings History & Active Loans */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Savings History */}
        <div className="rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-400" />
              My Savings History
            </h3>
            <span className="text-xs text-slate-400">{savingsHistory.length} transactions</span>
          </div>
          {savingsHistory.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-left font-medium">Type</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                    <th className="px-6 py-3 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savingsHistory.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 text-slate-600">
                        {formatDate(txn.date)}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          txn.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {txn.type === 'deposit'
                            ? <ArrowUpRight className="h-3 w-3" />
                            : <ArrowDownRight className="h-3 w-3" />
                          }
                          {txn.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                        </span>
                      </td>
                      <td className={`px-6 py-3 text-right font-medium ${
                        txn.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {txn.type === 'deposit' ? '+' : '-'}Rs {txn.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-xs truncate max-w-[120px]">
                        {txn.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No savings yet"
                description="Your savings transactions will appear here once deposits are made."
              />
            </div>
          )}
        </div>

        {/* Active Loans with Repayment Progress */}
        <div className="rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-slate-400" />
              My Active Loans
            </h3>
            <span className="text-xs text-slate-400">{activeLoans.length} active</span>
          </div>
          {activeLoans.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {activeLoans.map((loan) => {
                const loanRepayments = repayments.filter(r => r.loan_id === loan.id);
                const totalRepaid = loanRepayments.reduce((sum, r) => sum + r.amount, 0);
                const totalDue = loan.total_amount || loan.amount;
                const progress = totalDue > 0 ? Math.min((totalRepaid / totalDue) * 100, 100) : 0;
                const remaining = Math.max(totalDue - totalRepaid, 0);

                return (
                  <div key={loan.id} className="px-6 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Loan of Rs {loan.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {loan.interest_rate}% interest | {loan.term_months} months
                          {loan.purpose && ` | ${loan.purpose}`}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        loan.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {loan.status === 'active'
                          ? <CheckCircle2 className="h-3 w-3" />
                          : <Clock className="h-3 w-3" />
                        }
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>Repaid: Rs {totalRepaid.toLocaleString()}</span>
                        <span>Remaining: Rs {remaining.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-right text-slate-400 mt-1">{progress.toFixed(1)}% completed</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No active loans"
                description="You don't have any active loans at the moment."
              />
            </div>
          )}
        </div>
      </div>

      {/* Loan Repayment Schedule */}
      {activeLoans.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-400" />
              Loan Repayment History
            </h3>
            <span className="text-xs text-slate-400">{repayments.length} payments made</span>
          </div>
          {repayments.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                    <th className="px-6 py-3 text-right font-medium">Principal</th>
                    <th className="px-6 py-3 text-right font-medium">Interest</th>
                    <th className="px-6 py-3 text-right font-medium">Penalty</th>
                    <th className="px-6 py-3 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repayments.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 text-slate-600">
                        {formatDate(r.date)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-emerald-600">
                        Rs {r.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {r.principal ? `Rs ${r.principal.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {r.interest ? `Rs ${r.interest.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {r.penalty ? `Rs ${r.penalty.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-xs truncate max-w-[120px]">
                        {r.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No repayments yet"
                description="Loan repayment records will appear here as payments are made."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
