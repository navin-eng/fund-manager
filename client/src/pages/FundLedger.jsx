import { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, ArrowUpDown } from 'lucide-react';
import { getFundLedger, getFundLedgerSummary } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

const TYPE_BADGES = {
  sav: { label: 'Saving', cls: 'bg-blue-100 text-blue-700' },
  lo: { label: 'Loan Out', cls: 'bg-amber-100 text-amber-700' },
  clr: { label: 'Received', cls: 'bg-green-100 text-green-700' },
  int: { label: 'Interest', cls: 'bg-purple-100 text-purple-700' },
  ref: { label: 'Refund', cls: 'bg-red-100 text-red-700' },
  bk: { label: 'Bank Int.', cls: 'bg-teal-100 text-teal-700' },
  adj: { label: 'Adjustment', cls: 'bg-orange-100 text-orange-700' },
  oth: { label: 'Other', cls: 'bg-slate-100 text-slate-600' },
};

export default function FundLedger() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [ledger, sum] = await Promise.all([getFundLedger(), getFundLedgerSummary()]);
      setRows(ledger.rows || []);
      setSummary(sum);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = rows.filter(r => {
    if (search && !r.particulars.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && r.type !== typeFilter) return false;
    return true;
  });

  const fmt = (n) => n != null ? `₨ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Entries</p>
            <p className="mt-2 text-2xl font-bold text-indigo-600">{summary.total_entries}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{fmt(summary.current_balance)}</p>
            <p className="text-xs text-slate-400 mt-1">As of {summary.last_date}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Credits</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{fmt(summary.total_credit)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Debits</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{fmt(summary.total_debit)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" placeholder="Search particulars…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500">
          <option value="">All Types</option>
          {Object.entries(TYPE_BADGES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Particulars</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Debit Rs.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Credit Rs.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Balance Rs.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => {
                const badge = TYPE_BADGES[r.type] || TYPE_BADGES.oth;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{r.particulars}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      {r.debit ? fmt(r.debit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      {r.credit ? fmt(r.credit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-600">{fmt(r.balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          Showing {filtered.length} of {rows.length} entries
        </div>
      </div>
    </div>
  );
}
