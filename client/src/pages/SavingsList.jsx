import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import DateInput from '../components/DateInput';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Filter,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';

const PAGE_SIZE = 15;

function calculateSummary(transactions) {
  return transactions.reduce(
    (accumulator, transaction) => {
      const amount = Number(transaction.amount || 0);

      if (transaction.type === 'deposit') {
        accumulator.totalDeposits += amount;
        accumulator.netSavings += amount;
      } else if (transaction.type === 'withdrawal') {
        accumulator.totalWithdrawals += amount;
        accumulator.netSavings -= amount;
      }

      return accumulator;
    },
    { totalDeposits: 0, totalWithdrawals: 0, netSavings: 0 }
  );
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  const adjustedStart = Math.max(1, end - 2);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

function SummaryCard({ icon: Icon, label, value, iconClassName, valueClassName = 'text-slate-900' }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className={`mt-1 text-2xl font-semibold ${valueClassName}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function getTransactionKey(transaction) {
  return transaction.id || transaction._id;
}

function getMemberName(transaction) {
  return transaction.member?.name || transaction.member_name || transaction.memberName || '—';
}

function TransactionTypeBadge({ type }) {
  if (type === 'deposit') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <ArrowUpCircle className="h-3.5 w-3.5" />
        Deposit
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      <ArrowDownCircle className="h-3.5 w-3.5" />
      Withdrawal
    </span>
  );
}

export default function SavingsList() {
  const { formatDate, formatCurrency } = useLocale();
  const [savings, setSavings] = useState([]);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    netSavings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    memberId: '',
    dateFrom: '',
    dateTo: '',
    type: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    memberId: '',
    dateFrom: '',
    dateTo: '',
    type: '',
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/members');
        const data = await response.json();
        setMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch members:', error);
      }
    };

    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (appliedFilters.memberId) params.append('member_id', appliedFilters.memberId);
        if (appliedFilters.dateFrom) params.append('date_from', appliedFilters.dateFrom);
        if (appliedFilters.dateTo) params.append('date_to', appliedFilters.dateTo);
        if (appliedFilters.type) params.append('type', appliedFilters.type);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`/api/savings${queryString}`);

        if (!response.ok) {
          throw new Error('Failed to fetch savings');
        }

        const data = await response.json();
        const transactions = Array.isArray(data) ? data : [];
        setSavings(transactions);
        setSummary(calculateSummary(transactions));
      } catch (error) {
        console.error('Failed to fetch savings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [appliedFilters]);

  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(savings.length / PAGE_SIZE));
  const visiblePages = getVisiblePages(page, totalPages);
  const paginatedSavings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return savings.slice(start, start + PAGE_SIZE);
  }, [page, savings]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const emptyFilters = { memberId: '', dateFrom: '', dateTo: '', type: '' };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const handleDelete = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await fetch(`/api/savings/${transactionId}`, { method: 'DELETE' });

      if (response.ok) {
        setSavings((currentSavings) => {
          const nextSavings = currentSavings.filter((transaction) => getTransactionKey(transaction) !== transactionId);
          setSummary(calculateSummary(nextSavings));
          return nextSavings;
        });
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Savings Ledger</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Savings</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Record deposits and withdrawals, filter by member or date, and review transactions comfortably on both desktop and mobile.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <Link
              to="/savings/bulk"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 sm:w-auto"
            >
              <Users className="h-4 w-4" />
              Bulk Entry
            </Link>
            <Link
              to="/savings/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          icon={ArrowUpCircle}
          label="Total Deposits"
          value={formatCurrency(summary.totalDeposits)}
          valueClassName="text-emerald-600"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          icon={ArrowDownCircle}
          label="Total Withdrawals"
          value={formatCurrency(summary.totalWithdrawals)}
          valueClassName="text-rose-600"
          iconClassName="bg-rose-50 text-rose-600"
        />
        <SummaryCard
          icon={DollarSign}
          label="Net Savings"
          value={formatCurrency(summary.netSavings)}
          valueClassName="text-indigo-700"
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Member</span>
            <select
              value={filters.memberId}
              onChange={(event) => setFilters((current) => ({ ...current, memberId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All Members</option>
              {members.map((member) => (
                <option key={member.id || member._id} value={member.id || member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              From Date
            </span>
            <DateInput
              value={filters.dateFrom}
              onChange={(val) => setFilters((current) => ({ ...current, dateFrom: val }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              To Date
            </span>
            <DateInput
              value={filters.dateTo}
              onChange={(val) => setFilters((current) => ({ ...current, dateTo: val }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Type</span>
            <select
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleApplyFilters}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Filter className="h-4 w-4" />
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-20">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="ml-2 text-sm text-slate-500">Loading savings...</span>
          </div>
        ) : paginatedSavings.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-700">No savings transactions found</p>
            <p className="mt-1 text-sm text-slate-500">Try changing the filters or add a new transaction.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 lg:hidden">
              {paginatedSavings.map((transaction) => {
                const transactionId = getTransactionKey(transaction);

                return (
                  <article key={transactionId} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{formatCurrency(transaction.amount)}</p>
                        <p className="mt-1 text-sm text-slate-500">{getMemberName(transaction)}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(transaction.date)}</p>
                      </div>
                      <TransactionTypeBadge type={transaction.type} />
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Notes</p>
                      <p className="mt-2 text-sm text-slate-600">{transaction.notes || 'No notes added.'}</p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/savings/${transactionId}/edit`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(transactionId)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member Name</th>
                    <th>Type</th>
                    <th className="text-right">Amount</th>
                    <th>Notes</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSavings.map((transaction) => {
                    const transactionId = getTransactionKey(transaction);

                    return (
                      <tr key={transactionId}>
                        <td>{formatDate(transaction.date)}</td>
                        <td className="font-medium text-slate-900">{getMemberName(transaction)}</td>
                        <td>
                          <TransactionTypeBadge type={transaction.type} />
                        </td>
                        <td className="text-right font-medium text-slate-900">{formatCurrency(transaction.amount)}</td>
                        <td>{transaction.notes || '—'}</td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/savings/${transactionId}/edit`}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(transactionId)}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
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
                <span className="text-sm text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, savings.length)} of {savings.length} transactions
                </span>

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
