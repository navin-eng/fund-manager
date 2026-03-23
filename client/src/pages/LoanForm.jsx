import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Banknote,
  Percent,
  Calendar,
  FileText,
  Calculator,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Users,
  Hash,
} from 'lucide-react';
import { createLoan, getMembers, getSettings } from '../api';
import { useLocale } from '../contexts/LocaleContext';
import DateInput from '../components/DateInput';

// formatCurrency is now handled by useLocale hook

function calculateEMI(principal, annualRate, termMonths) {
  if (!principal || !annualRate || !termMonths) return null;

  const P = Number(principal);
  const n = Number(termMonths);
  const r = Number(annualRate) / 12 / 100;

  if (P <= 0 || n <= 0 || r <= 0) return null;

  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalRepayable = emi * n;
  const totalInterest = totalRepayable - P;

  return {
    monthlyPayment: emi,
    totalInterest,
    totalRepayable,
  };
}

export default function LoanForm() {
  const { formatCurrency, getTodayDateInputValue, t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedMemberId = searchParams.get('member') || '';
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    member_id: preselectedMemberId,
    amount: '',
    interest_rate: '',
    term: '',
    purpose: '',
    start_date: getTodayDateInputValue(),
  });

  const [errors, setErrors] = useState({});

  // Load members and settings
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const [membersData, settingsData] = await Promise.allSettled([
          getMembers('status=active'),
          getSettings(),
        ]);

        if (membersData.status === 'fulfilled') {
          const data = membersData.value;
          setMembers(Array.isArray(data) ? data : data.members || data.data || []);
        }

        if (settingsData.status === 'fulfilled') {
          const settings = settingsData.value;
          const defaultRate =
            settings?.default_interest_rate ||
            settings?.defaultInterestRate ||
            settings?.loan_interest_rate ||
            '';
          if (defaultRate) {
            setForm((prev) => ({ ...prev, interest_rate: String(defaultRate) }));
          }
        }
      } catch {
        // Non-critical - continue with empty defaults
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  // Live EMI calculation
  const emiResult = useMemo(
    () => calculateEMI(form.amount, form.interest_rate, form.term),
    [form.amount, form.interest_rate, form.term]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.member_id) newErrors.member_id = 'Please select a member';
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = 'Enter a valid loan amount';
    if (!form.interest_rate || Number(form.interest_rate) <= 0)
      newErrors.interest_rate = 'Enter a valid interest rate';
    if (!form.term || Number(form.term) <= 0 || !Number.isInteger(Number(form.term)))
      newErrors.term = 'Enter a valid term in months';
    if (!form.start_date) newErrors.start_date = 'Start date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);
    try {
      const payload = {
        member_id: Number(form.member_id),
        amount: Number(form.amount),
        interest_rate: Number(form.interest_rate),
        term_months: Number(form.term),
        purpose: form.purpose.trim() || undefined,
        start_date: form.start_date,
      };
      await createLoan(payload);
      navigate('/loans');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-slate-500">Loading form data...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/loans')}
          className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('loans.newLoan')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('loans.createNewLoan')}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">{t('loans.loanDetails')}</h2>
            </div>
            <div className="space-y-5 p-6">
              {/* Member */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Users className="h-4 w-4 text-slate-400" />
                  {t('common.member')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="member_id"
                  value={form.member_id}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.member_id ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                  }`}
                >
                  <option value="">{t('loans.selectMember')}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim()}
                    </option>
                  ))}
                </select>
                {errors.member_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.member_id}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Banknote className="h-4 w-4 text-slate-400" />
                  {t('loans.loanAmount')} (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="e.g. 100000"
                  min="0"
                  step="any"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.amount ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Interest Rate and Term - side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Percent className="h-4 w-4 text-slate-400" />
                    {t('loans.interestRate')} (% p.a.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="interest_rate"
                    value={form.interest_rate}
                    onChange={handleChange}
                    placeholder="e.g. 12"
                    min="0"
                    step="0.01"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.interest_rate ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.interest_rate && (
                    <p className="mt-1 text-xs text-red-600">{errors.interest_rate}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Hash className="h-4 w-4 text-slate-400" />
                    {t('loans.term')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="term"
                    value={form.term}
                    onChange={handleChange}
                    placeholder="e.g. 12"
                    min="1"
                    step="1"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.term ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.term && (
                    <p className="mt-1 text-xs text-red-600">{errors.term}</p>
                  )}
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FileText className="h-4 w-4 text-slate-400" />
                  {t('loans.purpose')}
                </label>
                <textarea
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the purpose of this loan..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {t('loans.startDate')}
                </label>
                <DateInput
                  name="start_date"
                  value={form.start_date}
                  onChange={(val) => {
                    setForm((prev) => ({ ...prev, start_date: val }));
                    if (errors.start_date) setErrors((prev) => ({ ...prev, start_date: null }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.start_date ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.start_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.start_date}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => navigate('/loans')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.submitting')}
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    {t('loans.createLoan')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* EMI Calculator Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-semibold text-slate-800">{t('loans.emiCalculator')}</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t('loans.liveCalculation')}</p>
            </div>
            <div className="p-5 space-y-4">
              {emiResult ? (
                <>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 text-center">
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">
                      {t('loans.monthlyPayment')} (EMI)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-indigo-900">
                      Rs. {formatCurrency(emiResult.monthlyPayment)}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-600">{t('loans.principal')}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        Rs. {formatCurrency(form.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-600">{t('loans.totalInterest')}</span>
                      <span className="text-sm font-semibold text-amber-700">
                        Rs. {formatCurrency(emiResult.totalInterest)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-600">{t('loans.totalRepayable')}</span>
                      <span className="text-sm font-bold text-slate-900">
                        Rs. {formatCurrency(emiResult.totalRepayable)}
                      </span>
                    </div>
                  </div>
                  {/* Visual breakdown bar */}
                  <div className="pt-2">
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="bg-indigo-500 transition-all"
                        style={{
                          width: `${(Number(form.amount) / emiResult.totalRepayable) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-amber-400 transition-all"
                        style={{
                          width: `${(emiResult.totalInterest / emiResult.totalRepayable) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {t('loans.principal')}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        Interest
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calculator className="h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    {t('loans.enterDetailsForEMI')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
