import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Calendar,
  User,
  FileText,
  Save,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { normalizeSavingsSummary } from '../utils/apiTransforms';

// formatCurrency is now handled by useLocale hook

const todayISO = () => new Date().toISOString().split('T')[0];

export default function SavingsForm() {
  const { formatCurrency } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedMemberId = searchParams.get('member') || '';

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    memberId: preselectedMemberId,
    type: 'deposit',
    amount: '',
    date: todayISO(),
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [memberBalance, setMemberBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Fetch active members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/members?status=active');
        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }
        const data = await response.json();
        setMembers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  // Fetch member balance when member changes and type is Withdrawal
  useEffect(() => {
    if (!form.memberId || form.type !== 'withdrawal') {
      setMemberBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setLoadingBalance(true);
      try {
        const response = await fetch('/api/savings/summary');
        if (!response.ok) {
          throw new Error('Failed to fetch member balance');
        }
        const data = normalizeSavingsSummary(await response.json());
        const memberSummary = data.byMember.find(
          (entry) => String(entry.member_id) === String(form.memberId)
        );
        setMemberBalance(memberSummary ? Number(memberSummary.net_savings ?? memberSummary.net ?? 0) : 0);
      } catch (err) {
        console.error('Failed to fetch member balance:', err);
        setMemberBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchBalance();
  }, [form.memberId, form.type]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user edits field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.memberId) {
      newErrors.memberId = 'Please select a member.';
    }
    if (!form.amount || Number(form.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0.';
    }
    if (!form.date) {
      newErrors.date = 'Date is required.';
    }
    if (
      form.type === 'withdrawal' &&
      memberBalance !== null &&
      Number(form.amount) > memberBalance
    ) {
      newErrors.amount = `Withdrawal amount exceeds available balance of ${formatCurrency(memberBalance)}.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: Number(form.memberId),
          type: form.type,
          amount: Number(form.amount),
          date: form.date,
          notes: form.notes.trim(),
        }),
      });

      if (response.ok) {
        navigate('/savings');
      } else {
        const errData = await response.json();
        setErrors({ submit: errData.message || 'Failed to save transaction.' });
      }
    } catch (err) {
      console.error('Submit error:', err);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">New Savings Transaction</h1>
        <p className="text-sm text-slate-500 mt-1">
          Record a deposit or withdrawal for a member.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        {/* Submit error */}
        {errors.submit && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.submit}
          </div>
        )}

        {/* Member */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
            <User className="w-4 h-4 text-slate-400" />
            Member <span className="text-red-500">*</span>
          </label>
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading members...
            </div>
          ) : (
            <select
              value={form.memberId}
              onChange={(e) => handleChange('memberId', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.memberId ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
            >
              <option value="">Select a member</option>
              {members.map((m) => (
                <option key={m.id || m._id} value={m.id || m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          {errors.memberId && (
            <p className="text-xs text-red-500 mt-1">{errors.memberId}</p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Transaction Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label
              className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.type === 'deposit'
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="type"
                value="deposit"
                checked={form.type === 'deposit'}
                onChange={(e) => handleChange('type', e.target.value)}
                className="sr-only"
              />
              <ArrowUpCircle className="w-4 h-4" />
              Deposit
            </label>

            <label
              className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.type === 'withdrawal'
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="type"
                value="withdrawal"
                checked={form.type === 'withdrawal'}
                onChange={(e) => handleChange('type', e.target.value)}
                className="sr-only"
              />
              <ArrowDownCircle className="w-4 h-4" />
              Withdrawal
            </label>
          </div>
        </div>

        {/* Member balance notice for withdrawals */}
        {form.type === 'withdrawal' && form.memberId && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            {loadingBalance ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking balance...
              </span>
            ) : memberBalance !== null ? (
              <span>
                Current balance: <strong>{formatCurrency(memberBalance)}</strong>
              </span>
            ) : (
              <span>Unable to fetch member balance.</span>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
            <DollarSign className="w-4 h-4 text-slate-400" />
            Amount (Rs.) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            placeholder="0.00"
            className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.amount ? 'border-red-400 bg-red-50' : 'border-slate-300'
            }`}
          />
          {errors.amount && (
            <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.date ? 'border-red-400 bg-red-50' : 'border-slate-300'
            }`}
          />
          {errors.date && (
            <p className="text-xs text-red-500 mt-1">{errors.date}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            Notes <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Add any notes about this transaction..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/savings')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Transaction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
