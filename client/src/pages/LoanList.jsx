import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Eye,
  Filter,
  Landmark,
  Loader2,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import { approveLoan, getLoans, getMembers } from '../api';
import { useLocale } from '../contexts/LocaleContext';
import { normalizeLoan } from '../utils/apiTransforms';

const STATUS_BADGES = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  active: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  defaulted: 'bg-rose-50 text-rose-600 border border-rose-200',
};

const STATUS_ICONS = {
  pending: Clock,
  active: Banknote,
  approved: Banknote,
  completed: CheckCircle,
  defaulted: AlertTriangle,
};

const PAGE_SIZE = 10;

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  const adjustedStart = Math.max(1, end - 2);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

function SummaryCard({ icon: Icon, label, value, iconClassName, valueClassName = 'text-slate-900', alert = false }) {
  return (
    <div className={`rounded-[1.6rem] border bg-white p-5 shadow-sm ${alert ? 'border-rose-200' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${valueClassName}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function LoanList() {
  const { formatDate: localeFormatDate, formatCurrency: localeFormatCurrency } = useLocale();
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
  const [memberFilter, setMemberFilter] = useState(searchParams.get('member') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  const formatDate = (value) => {
    if (!value) return '—';
    return localeFormatDate(value);
  };

  const formatCurrency = (value) => localeFormatCurrency(Number(value) || 0);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (memberFilter) params.set('member_id', memberFilter);
      if (statusFilter) params.set('status', statusFilter);

      const data = await getLoans(params.toString());
      const rows = Array.isArray(data) ? data : data.loans || data.data || [];
      const normalizedLoans = rows.map(normalizeLoan).filter(Boolean);

      setLoans(normalizedLoans);

      if (data && !Array.isArray(data) && data.summary) {
        setSummary(data.summary);
      } else {
        setSummary({
          totalDisbursed: 0,
          outstandingAmount: 0,
          interestEarned: 0,
          overdueLoans: 0,
        });
      }
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [memberFilter, statusFilter]);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await getMembers('status=active');
      setMembers(Array.isArray(data) ? data : data.members || data.data || []);
    } catch {
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (memberFilter) params.set('member', memberFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (query) params.set('q', query);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [memberFilter, statusFilter, query, page, setSearchParams]);

  const getMemberName = useCallback(
    (loan) => {
      if (loan.memberName) return loan.memberName;
      if (loan.member_name) return loan.member_name;
      if (loan.member?.name) return loan.member.name;

      const member = members.find((entry) => String(entry.id || entry._id) === String(loan.memberId || loan.member_id));
      return member?.name || 'Unknown';
    },
    [members]
  );

  const visibleLoans = useMemo(() => {
    if (!query) return loans;

    const searchValue = query.toLowerCase();
    return loans.filter((loan) => {
      const searchBlob = [
        getMemberName(loan),
        loan.purpose,
        loan.status,
        loan.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBlob.includes(searchValue);
    });
  }, [getMemberName, loans, query]);

  const totalPages = Math.max(1, Math.ceil(visibleLoans.length / PAGE_SIZE));
  const visiblePages = getVisiblePages(page, totalPages);
  const paginatedLoans = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleLoans.slice(start, start + PAGE_SIZE);
  }, [page, visibleLoans]);

  useEffect(() => {
    setPage(1);
  }, [memberFilter, statusFilter, query]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (summary.totalDisbursed || summary.outstandingAmount || summary.interestEarned || summary.overdueLoans) {
      return;
    }

    if (loans.length === 0) {
      return;
    }

    const computedSummary = loans.reduce(
      (accumulator, loan) => {
        if (loan.status !== 'pending') {
          accumulator.totalDisbursed += Number(loan.amount || 0);
        }

        if (loan.status === 'active' || loan.status === 'approved') {
          accumulator.outstandingAmount += Number(loan.remainingBalance || 0);
        }

        accumulator.interestEarned += Number(loan.totalInterest || 0);

        if (loan.is_overdue || loan.status === 'defaulted') {
          accumulator.overdueLoans += 1;
        }

        return accumulator;
      },
      { totalDisbursed: 0, outstandingAmount: 0, interestEarned: 0, overdueLoans: 0 }
    );

    setSummary(computedSummary);
  }, [loans, summary]);

  const handleApprove = async (loanId) => {
    if (!window.confirm('Are you sure you want to approve this loan?')) return;

    setApproving(loanId);
    try {
      await approveLoan(loanId, {});
      fetchLoans();
    } catch (approvalError) {
      alert(`Failed to approve loan: ${approvalError.message}`);
    } finally {
      setApproving(null);
    }
  };

  const clearFilters = () => {
    setMemberFilter('');
    setStatusFilter('');
    setQuery('');
    setPage(1);
  };

  const summaryCards = [
    {
      label: 'Total Disbursed',
      value: formatCurrency(summary.totalDisbursed),
      icon: Banknote,
      valueClassName: 'text-indigo-700',
      iconClassName: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Outstanding Amount',
      value: formatCurrency(summary.outstandingAmount),
      icon: CircleDollarSign,
      valueClassName: 'text-slate-900',
      iconClassName: 'bg-slate-100 text-slate-600',
    },
    {
      label: 'Interest Earned',
      value: formatCurrency(summary.interestEarned),
      icon: TrendingUp,
      valueClassName: 'text-emerald-600',
      iconClassName: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Overdue Loans',
      value: String(summary.overdueLoans || 0),
      icon: AlertTriangle,
      valueClassName: summary.overdueLoans > 0 ? 'text-rose-600' : 'text-slate-900',
      iconClassName: summary.overdueLoans > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600',
      alert: summary.overdueLoans > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Loan Portfolio</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Loans</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Track disbursements, repayments, and outstanding balances with a layout that stays usable on phones and tablets.
            </p>
          </div>

          <Link
            to="/loans/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Loan
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            valueClassName={card.valueClassName}
            iconClassName={card.iconClassName}
            alert={card.alert}
          />
        ))}
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_14rem_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by member, purpose, loan ID, or status"
              className="w-full rounded-2xl border border-slate-300 px-11 py-3 text-sm"
            />
          </label>

          <select
            value={memberFilter}
            onChange={(event) => setMemberFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="">All Members</option>
            {members.map((member) => (
              <option key={member.id || member._id} value={member.id || member._id}>
                {member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim()}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="defaulted">Defaulted</option>
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter className="h-4 w-4" />
            <span>{visibleLoans.length} visible loans</span>
          </div>

          {(memberFilter || statusFilter || query) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="ml-3 text-sm text-slate-500">Loading loans...</span>
          </div>
        ) : paginatedLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <Landmark className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-700">No loans found</h2>
            <p className="mt-1 text-sm text-slate-500">
              {memberFilter || statusFilter || query
                ? 'Try changing the search or active filters.'
                : 'Create a new loan to get started.'}
            </p>
            {!memberFilter && !statusFilter && !query && (
              <Link
                to="/loans/new"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                New Loan
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 lg:hidden">
              {paginatedLoans.map((loan) => {
                const status = String(loan.status || 'pending').toLowerCase();
                const StatusIcon = STATUS_ICONS[status] || Clock;
                const canApprove = status === 'pending';

                return (
                  <article key={loan.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{getMemberName(loan)}</p>
                        <p className="mt-1 text-sm text-slate-500">{loan.purpose || 'General member loan'}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Start {formatDate(loan.startDate || loan.created_at || loan.createdAt)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[status] || STATUS_BADGES.pending}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Borrowed</p>
                        <p className="mt-2 font-semibold text-slate-900">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Remaining</p>
                        <p className="mt-2 font-semibold text-rose-600">{formatCurrency(loan.remainingBalance)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Monthly EMI</p>
                        <p className="mt-2 font-medium text-slate-900">{formatCurrency(loan.monthlyPayment)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Term / Rate</p>
                        <p className="mt-2 font-medium text-slate-900">
                          {loan.term_months || loan.term || '—'} mo · {loan.interestRate || '—'}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/loans/${loan.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      {canApprove && (
                        <button
                          type="button"
                          onClick={() => handleApprove(loan.id)}
                          disabled={approving === loan.id}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {approving === loan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th className="text-right">Borrowed</th>
                    <th className="text-right">Remaining</th>
                    <th className="text-right">Monthly Payment</th>
                    <th className="text-right">Rate / Term</th>
                    <th>Start Date</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLoans.map((loan) => {
                    const status = String(loan.status || 'pending').toLowerCase();
                    const StatusIcon = STATUS_ICONS[status] || Clock;
                    const canApprove = status === 'pending';

                    return (
                      <tr key={loan.id}>
                        <td>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{getMemberName(loan)}</p>
                            <p className="truncate text-xs text-slate-400">{loan.purpose || 'General member loan'}</p>
                          </div>
                        </td>
                        <td className="text-right font-medium text-slate-900">{formatCurrency(loan.amount)}</td>
                        <td className="text-right font-medium text-rose-600">{formatCurrency(loan.remainingBalance)}</td>
                        <td className="text-right">{formatCurrency(loan.monthlyPayment)}</td>
                        <td className="text-right">
                          {loan.interestRate || '—'}% / {loan.term_months || loan.term || '—'} mo
                        </td>
                        <td>{formatDate(loan.startDate || loan.created_at || loan.createdAt)}</td>
                        <td className="text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[status] || STATUS_BADGES.pending}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Link
                              to={`/loans/${loan.id}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            {canApprove && (
                              <button
                                type="button"
                                onClick={() => handleApprove(loan.id)}
                                disabled={approving === loan.id}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
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

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, visibleLoans.length)} of {visibleLoans.length} loans
                </p>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <div className="hidden items-center gap-2 sm:flex">
                    {visiblePages.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`h-9 w-9 rounded-xl text-sm font-medium ${
                          pageNumber === page ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <span className="text-sm font-medium text-slate-500 sm:hidden">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
