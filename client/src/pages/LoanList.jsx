import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Banknote,
  Plus,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Loader2,
  Landmark,
  TrendingUp,
  CircleDollarSign,
} from 'lucide-react';
import { getLoans, getMembers, approveLoan } from '../api';
import { useLocale } from '../contexts/LocaleContext';

const STATUS_BADGES = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  active: 'bg-blue-100 text-blue-800 border border-blue-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  defaulted: 'bg-red-100 text-red-800 border border-red-200',
};

const STATUS_ICONS = {
  pending: Clock,
  active: Banknote,
  completed: CheckCircle,
  defaulted: AlertTriangle,
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default function LoanList() {
  const { formatDate: localeFormatDate, formatCurrency: localeFormatCurrency } = useLocale();

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return localeFormatDate(dateStr);
  }
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState({
    totalDisbursed: 0,
    outstandingAmount: 0,
    interestEarned: 0,
    overdueLoans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);

  // Filters
  const [memberFilter, setMemberFilter] = useState(searchParams.get('member') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 10;

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', perPage);
      if (memberFilter) params.set('member_id', memberFilter);
      if (statusFilter) params.set('status', statusFilter);

      const data = await getLoans(params.toString());

      if (Array.isArray(data)) {
        setLoans(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        setLoans(data.loans || data.data || []);
        setTotalCount(data.total || data.totalCount || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / perPage) || 1);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, memberFilter, statusFilter]);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await getMembers('status=active');
      setMembers(Array.isArray(data) ? data : data.members || data.data || []);
    } catch {
      // Silently fail - members dropdown just won't populate
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (memberFilter) params.set('member', memberFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (page > 1) params.set('page', page);
    setSearchParams(params, { replace: true });
  }, [memberFilter, statusFilter, page, setSearchParams]);

  // Compute summary from loans if not provided by API
  useEffect(() => {
    if (loans.length === 0) {
      setSummary({ totalDisbursed: 0, outstandingAmount: 0, interestEarned: 0, overdueLoans: 0 });
      return;
    }

    const computed = loans.reduce(
      (acc, loan) => {
        if (loan.status !== 'pending') {
          acc.totalDisbursed += Number(loan.amount || loan.principal || 0);
        }
        if (loan.status === 'active') {
          acc.outstandingAmount += Number(loan.remaining_balance || loan.outstanding_balance || loan.remainingBalance || 0);
        }
        acc.interestEarned += Number(loan.total_interest || loan.interest_earned || loan.totalInterestPaid || 0);
        if (loan.is_overdue || loan.status === 'defaulted') {
          acc.overdueLoans += 1;
        }
        return acc;
      },
      { totalDisbursed: 0, outstandingAmount: 0, interestEarned: 0, overdueLoans: 0 }
    );

    setSummary(computed);
  }, [loans]);

  const handleApprove = async (loanId) => {
    if (!window.confirm('Are you sure you want to approve this loan?')) return;
    setApproving(loanId);
    try {
      await approveLoan(loanId, {});
      fetchLoans();
    } catch (err) {
      alert('Failed to approve loan: ' + err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const getMemberName = (loan) => {
    if (loan.member_name) return loan.member_name;
    if (loan.member?.name) return loan.member.name;
    if (loan.member?.first_name) return `${loan.member.first_name} ${loan.member.last_name || ''}`.trim();
    const member = members.find((m) => m.id === (loan.member_id || loan.memberId));
    if (member) return member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim();
    return 'Unknown';
  };

  const summaryCards = [
    {
      label: 'Total Disbursed',
      value: `Rs. ${formatCurrency(summary.totalDisbursed)}`,
      icon: Banknote,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Outstanding Amount',
      value: `Rs. ${formatCurrency(summary.outstandingAmount)}`,
      icon: CircleDollarSign,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
    },
    {
      label: 'Interest Earned',
      value: `Rs. ${formatCurrency(summary.interestEarned)}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Overdue Loans',
      value: summary.overdueLoans,
      icon: AlertTriangle,
      color: summary.overdueLoans > 0 ? 'text-red-600' : 'text-slate-600',
      bg: summary.overdueLoans > 0 ? 'bg-red-50' : 'bg-slate-50',
      isAlert: summary.overdueLoans > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and track all member loans
          </p>
        </div>
        <Link
          to="/loans/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Loan
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl border bg-white p-5 shadow-sm ${card.isAlert ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
                }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className={`mt-2 text-2xl font-bold ${card.isAlert ? 'text-red-600' : 'text-slate-900'}`}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>
        <select
          value={memberFilter}
          onChange={handleFilterChange(setMemberFilter)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim()}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="defaulted">Defaulted</option>
        </select>
        {(memberFilter || statusFilter) && (
          <button
            onClick={() => {
              setMemberFilter('');
              setStatusFilter('');
              setPage(1);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="ml-3 text-sm text-slate-500">Loading loans...</span>
          </div>
        ) : loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <Landmark className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-700">No loans found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {memberFilter || statusFilter
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating a new loan.'}
            </p>
            {!memberFilter && !statusFilter && (
              <Link
                to="/loans/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Loan
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Member
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Interest Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Term
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Monthly Payment
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.map((loan) => {
                    const StatusIcon = STATUS_ICONS[loan.status] || Clock;
                    return (
                      <tr
                        key={loan.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="text-sm font-medium text-slate-900">
                            {getMemberName(loan)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <span className="text-sm font-semibold text-slate-900">
                            Rs. {formatCurrency(loan.amount || loan.principal)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <span className="text-sm text-slate-600">
                            {loan.interest_rate || loan.interestRate}%
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <span className="text-sm text-slate-600">
                            {loan.term || loan.term_months} mo
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <span className="text-sm font-medium text-slate-700">
                            Rs. {formatCurrency(loan.monthly_payment || loan.emi || loan.monthlyPayment)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[loan.status] || STATUS_BADGES.pending
                              }`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {loan.status?.charAt(0).toUpperCase() + loan.status?.slice(1)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="text-sm text-slate-600">
                            {formatDate(loan.start_date || loan.startDate || loan.created_at)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/loans/${loan.id}`}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            {loan.status === 'pending' && (
                              <button
                                onClick={() => handleApprove(loan.id)}
                                disabled={approving === loan.id}
                                className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                {approving === loan.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                )}
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Showing page <span className="font-semibold">{page}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span>
                  {totalCount > 0 && (
                    <span className="ml-1">({totalCount} total loans)</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
