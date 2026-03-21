import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { getReserveFund } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ReserveFund() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getReserveFund();
      setRows(data.rows || []);
      setSummary(data.summary);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const fmt = (n) => n != null ? `₨ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</p>
            <p className="mt-2 text-2xl font-bold text-teal-600">{fmt(summary.current_balance)}</p>
            <p className="text-xs text-slate-400 mt-1">जगेडा कोष</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Ever Credited</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{fmt(summary.total_credited)}</p>
            <p className="text-xs text-slate-400 mt-1">Across {summary.total_entries} events</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Debited</p>
            <p className="mt-2 text-2xl font-bold text-indigo-600">{fmt(summary.total_debited)}</p>
            <p className="text-xs text-slate-400 mt-1">Moved to income pool</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          <strong>जगेडा कोष (Reserve Fund)</strong> — After each income distribution round, the remainder
          (income minus bonus) is transferred here. Reserve funds may be moved back to income pools
          when needed.
        </p>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reserve Fund Ledger — {rows.length} entries
          </h3>
        </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
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
                  <td className="px-4 py-3 text-sm text-right font-semibold text-teal-600">{fmt(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
