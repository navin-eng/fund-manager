import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

export default function BulkSavingsForm() {
  const { formatCurrency } = useLocale();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState(null);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Bulk Monthly Savings');
  const [entries, setEntries] = useState({}); // { memberId: { included: true, amount: 1000 } }
  
  // Message
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch settings for minimum savings
      const setRes = await fetch('/api/settings');
      const settingsData = await setRes.json();
      setSettings(settingsData);
      
      const defaultAmount = settingsData.minimum_savings || 1000;

      // Fetch active members
      const memRes = await fetch('/api/members?status=active');
      const activeMembers = await memRes.json();
      
      setMembers(activeMembers);
      
      // Initialize entries
      const initialEntries = {};
      activeMembers.forEach(m => {
        initialEntries[m.id || m._id] = {
          included: true,
          amount: defaultAmount
        };
      });
      setEntries(initialEntries);
      
    } catch (err) {
      console.error('Failed to fetch data', err);
      setError('Failed to load members or settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAll = (e) => {
    const checked = e.target.checked;
    setEntries(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k].included = checked;
      });
      return next;
    });
  };

  const handleToggleOne = (id, checked) => {
    setEntries(prev => ({
      ...prev,
      [id]: { ...prev[id], included: checked }
    }));
  };

  const handleAmountChange = (id, amount) => {
    setEntries(prev => ({
      ...prev,
      [id]: { ...prev[id], amount: Number(amount) }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Build payload
    const payload = members
      .filter(m => entries[m.id || m._id]?.included)
      .map(m => ({
        member_id: m.id || m._id,
        amount: entries[m.id || m._id].amount,
        date,
        notes
      }));
      
    if (payload.length === 0) {
      setError('No members selected to submit savings for.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/savings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit bulk savings');
      }
      
      setSuccess(`Successfully added savings for ${payload.length} members!`);
      setTimeout(() => {
        navigate('/savings');
      }, 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelected = Object.values(entries).filter(e => e.included).length;
  const totalAmount = Object.values(entries).reduce((sum, e) => sum + (e.included ? (e.amount || 0) : 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/savings')}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Bulk Savings Entry</h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg text-sm border border-emerald-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Controls */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Description</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="E.g., Monthly Savings - October"
                required
              />
            </div>
          </div>

          {/* Member List */}
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm z-10">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={totalSelected === members.length && members.length > 0}
                      onChange={handleToggleAll}
                    />
                  </th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Member Name</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 w-48 text-right">Amount (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(member => {
                  const id = member.id || member._id;
                  const entry = entries[id] || { included: false, amount: 0 };
                  
                  return (
                    <tr key={id} className={`hover:bg-slate-50 ${!entry.included ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={entry.included}
                          onChange={(e) => handleToggleOne(id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.phone || member.email}</div>
                      </td>
                      <td className="p-4 text-right flex justify-end">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={entry.amount}
                          onChange={(e) => handleAmountChange(id, e.target.value)}
                          disabled={!entry.included}
                          className="w-full max-w-[120px] text-right px-3 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-slate-100"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Summary & Submit */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
            <div className="text-sm">
              <span className="text-slate-500">Selected: </span>
              <span className="font-semibold text-slate-800">{totalSelected} members</span>
              <span className="mx-3 text-slate-300">|</span>
              <span className="text-slate-500">Total: </span>
              <span className="font-bold text-indigo-600 text-lg">{formatCurrency(totalAmount)}</span>
            </div>
            
            <button
              type="submit"
              disabled={submitting || totalSelected === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {submitting ? 'Saving...' : 'Submit Bulk Savings'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
