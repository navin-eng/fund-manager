import { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { getDistributions, getDistributionSummary } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import AccordionSection from '../components/AccordionSection';

export default function Distributions() {
  const [rows, setRows] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [all, summary] = await Promise.all([getDistributions(), getDistributionSummary()]);
      setRows(all);
      setRounds(summary);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const fmt = (n) => n != null ? `₨ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

  if (loading) return <LoadingSpinner />;

  const totalBonus = rounds.reduce((s, r) => s + r.bonus, 0);
  const totalIncome = rounds.reduce((s, r) => s + r.income, 0);

  return (
    <div className="space-y-6">
      <AccordionSection
        title="Distribution Summary"
        description="Totals across recorded distribution rounds and reserve allocations."
        icon={Gift}
        badge={rounds.length}
      >
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income Distributed</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{fmt(totalIncome)}</p>
            <p className="text-xs text-slate-400 mt-1">{rounds.length} completed rounds</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bonus Paid</p>
            <p className="mt-2 text-2xl font-bold text-indigo-600">{fmt(totalBonus)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total to Reserve</p>
            <p className="mt-2 text-2xl font-bold text-purple-600">{fmt(totalIncome - totalBonus)}</p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Distribution Rounds"
        description="Grouped distribution activity based on recorded database entries."
        icon={Gift}
        badge={rounds.length}
      >
        <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-2">
          {rounds.map((r) => (
            <div key={r.round} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-indigo-700">Round {r.round}</h4>
                <span className="text-xs text-slate-400">{r.date}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Income</span>
                  <span className="font-semibold text-green-600">{fmt(r.income)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Bonus to Members</span>
                  <span className="font-semibold text-indigo-600">{fmt(r.bonus)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">To Reserve (जगेडा)</span>
                  <span className="font-semibold text-purple-600">{fmt(r.reserve)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-50">
                  <span className="text-slate-400">Undistributed</span>
                  <span className="text-slate-400">{fmt(r.income - r.bonus - r.reserve)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AccordionSection>

      <AccordionSection
        title="Distribution Ledger"
        description="Underlying distribution records from the database."
        icon={Gift}
        badge={rows.length}
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden m-5 sm:m-6">
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
                    <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-600">{fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}
