import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { getIncomePeriods, getIncomeEntries } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import AccordionSection from '../components/AccordionSection';

export default function IncomePeriods() {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [entries, setEntries] = useState([]);
  const [periodInfo, setPeriodInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);

  useEffect(() => { loadPeriods(); }, []);

  async function loadPeriods() {
    setLoading(true);
    try {
      const data = await getIncomePeriods();
      setPeriods(data);
      if (data.length > 0) {
        setSelectedPeriod(data[0].id);
        await loadEntries(data[0].id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadEntries(periodId) {
    setLoadingEntries(true);
    try {
      const data = await getIncomeEntries(periodId);
      setEntries(data.entries || []);
      setPeriodInfo(data.period);
    } catch (e) { console.error(e); }
    setLoadingEntries(false);
  }

  function handlePeriodChange(e) {
    const id = e.target.value;
    setSelectedPeriod(id);
    loadEntries(id);
  }

  const fmt = (n) => n != null ? `₨ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

  if (loading) return <LoadingSpinner />;

  const totalIncome = entries.length > 0 ? entries[entries.length - 1].balance : 0;

  return (
    <div className="space-y-6">
      <AccordionSection
        title="Income Periods"
        description="Generated periods based on recorded interest, penalty, and credited income activity."
        icon={TrendingUp}
        badge={periods.length}
      >
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6 lg:grid-cols-6">
          {periods.map((p, i) => (
            <button key={p.id} onClick={() => { setSelectedPeriod(p.id); loadEntries(p.id); }}
              className={`text-left rounded-xl border p-4 transition-all ${
                selectedPeriod === p.id
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 shadow-md'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
              }`}>
              <p className="text-xs font-semibold text-slate-500">Period {i + 1}</p>
              <p className="mt-1 text-lg font-bold text-indigo-600">{fmt(p.period_total)}</p>
              <p className="text-xs text-slate-400 mt-1">{p.entry_count} entries</p>
            </button>
          ))}
        </div>
      </AccordionSection>

      <AccordionSection
        title="Period Selector"
        description="Choose a generated income period to inspect its entries."
        icon={TrendingUp}
      >
        <div className="flex flex-col gap-3 items-start p-5 sm:flex-row sm:items-center sm:p-6">
          <select value={selectedPeriod || ''} onChange={handlePeriodChange}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500">
            {periods.map((p, i) => (
              <option key={p.id} value={p.id}>Period {i + 1} — {p.title_np}</option>
            ))}
          </select>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Income Entries"
        description="Detailed interest and income entries for the selected period."
        icon={TrendingUp}
        badge={entries.length}
      >
        <div className="p-5 sm:p-6">
          {periodInfo && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-indigo-800">{periodInfo.title_np}</h3>
              <p className="text-xs text-indigo-600 mt-1">
                Period total: <span className="font-bold">{fmt(totalIncome)}</span> · {entries.length} entries
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingEntries ? <div className="p-8"><LoadingSpinner /></div> : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Particulars</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount Rs.</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Balance Rs.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((r, i) => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{r.date || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-800">{r.particulars}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{fmt(r.amount)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-600">{fmt(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-between text-xs text-slate-500">
                  <span>{entries.length} entries</span>
                  <span className="font-semibold text-indigo-600">Period Total: {fmt(totalIncome)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}
