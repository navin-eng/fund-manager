import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
  Calendar,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  Users,
} from 'lucide-react';

const PAGE_SIZE = 15;

function calculateSummary(transactions) {
  return transactions.reduce(
    (acc, txn) => {
      const amount = Number(txn.amount || 0);
      if (txn.type === 'deposit') {
        acc.totalDeposits += amount;
        acc.netSavings += amount;
      } else if (txn.type === 'withdrawal') {
        acc.totalWithdrawals += amount;
        acc.netSavings -= amount;
      }
      return acc;
    },
    { totalDeposits: 0, totalWithdrawals: 0, netSavings: 0 }
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

  // Filter state
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

  // Fetch members for dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/members');
        const data = await response.json();
        setMembers(data);
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }
    };
    fetchMembers();
  }, []);

  // Fetch savings and summary
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (appliedFilters.memberId) params.append('member_id', appliedFilters.memberId);
        if (appliedFilters.dateFrom) params.append('date_from', appliedFilters.dateFrom);
        if (appliedFilters.dateTo) params.append('date_to', appliedFilters.dateTo);
        if (appliedFilters.type) params.append('type', appliedFilters.type);

        const qs = params.toString() ? `?${params.toString()}` : '';

        const savingsRes = await fetch(`/api/savings${qs}`);
        if (!savingsRes.ok) {
          throw new Error('Failed to fetch savings');
        }
        const savingsData = await savingsRes.json();

        setSavings(savingsData);
        setSummary(calculateSummary(Array.isArray(savingsData) ? savingsData : []));
      } catch (err) {
        console.error('Failed to fetch savings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [appliedFilters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(savings.length / PAGE_SIZE));
  const paginatedSavings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return savings.slice(start, start + PAGE_SIZE);
  }, [savings, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const response = await fetch(`/api/savings/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSavings((prev) => {
          const next = prev.filter((transaction) => transaction.id !== id && transaction._id !== id);
          setSummary(calculateSummary(next));
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Savings</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/savings/bulk"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <Users className="w-4 h-4" />
            Bulk Entry
          </Link>
          <Link
            to="/savings/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowUpCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Deposits</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalDeposits)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Withdrawals</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalWithdrawals)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Net Savings</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">
            {formatCurrency(summary.netSavings)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Member</label>
            <select
              value={filters.memberId}
              onChange={(e) => setFilters((f) => ({ ...f, memberId: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Members</option>
              {members.map((m) => (
                <option key={m.id || m._id} value={m.id || m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleApplyFilters}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <span className="ml-2 text-sm text-slate-500">Loading savings...</span>
          </div>
        ) : savings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Inbox className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No savings transactions found</p>
            <p className="text-xs mt-1">Create a new transaction to get started.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">Member Name</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">Type</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-600">Amount</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">Notes</th>
                    <th className="text-center px-5 py-3 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSavings.map((txn) => (
                    <tr key={txn.id || txn._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-700">
                        {formatDate(txn.date)}
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-medium">
                        {txn.member?.name || txn.member_name || txn.memberName || '—'}
                      </td>
                      <td className="px-5 py-3">
                        {txn.type === 'deposit' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <ArrowUpCircle className="w-3 h-3" />
                            Deposit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <ArrowDownCircle className="w-3 h-3" />
                            Withdrawal
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
                        {txn.notes || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/savings/${txn.id || txn._id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(txn.id || txn._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, savings.length)} of {savings.length} transactions
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        p === page
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
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
