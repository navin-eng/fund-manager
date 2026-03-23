import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Banknote,
  Percent,
  Calendar,
  FileText,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Printer,
  Hash,
  TrendingUp,
  CircleDollarSign,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Image,
  File,
} from 'lucide-react';
import {
  getLoan,
  approveLoan,
  addRepayment,
  getLoanSchedule,
  uploadLoanDocument,
} from '../api';
import { useLocale } from '../contexts/LocaleContext';
import DateInput from '../components/DateInput';

const STATUS_BADGES = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  active: 'bg-blue-100 text-blue-800 border border-blue-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  defaulted: 'bg-red-100 text-red-800 border border-red-200',
};

const STATUS_ICONS = {
  pending: Clock,
  active: Banknote,
  completed: CheckCircle,
  defaulted: AlertTriangle,
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

// formatDate is created inside the component using useLocale

function calculateEMI(principal, annualRate, termMonths) {
  const P = Number(principal);
  const n = Number(termMonths);
  const r = Number(annualRate) / 12 / 100;
  if (P <= 0 || n <= 0 || r <= 0) return 0;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ─── Collapsible Section Component ───────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-indigo-600" />}
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {badge && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>
      {open && <div className="border-t border-slate-200">{children}</div>}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { formatDate: localeFormatDate, getTodayDateInputValue } = useLocale();

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return localeFormatDate(dateStr);
  };

  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [penalty, setPenalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action states
  const [approving, setApproving] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Repayment form
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    date: getTodayDateInputValue(),
    notes: '',
  });
  const [submittingRepayment, setSubmittingRepayment] = useState(false);
  const [repaymentError, setRepaymentError] = useState(null);

  // Document upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Fetch loan details
  const fetchLoan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLoan(id);
      setLoan(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch amortization schedule
  const fetchSchedule = useCallback(async () => {
    try {
      const data = await getLoanSchedule(id);
      setSchedule(Array.isArray(data) ? data : data.schedule || data.data || []);
    } catch {
      // Non-critical
    }
  }, [id]);

  // Fetch penalty check
  const fetchPenalty = useCallback(async () => {
    try {
      const res = await fetch(`/api/loans/${id}/penalty-check`);
      if (res.ok) {
        const data = await res.json();
        setPenalty(data);
      }
    } catch {
      // Non-critical
    }
  }, [id]);

  useEffect(() => {
    fetchLoan();
    fetchSchedule();
    fetchPenalty();
  }, [fetchLoan, fetchSchedule, fetchPenalty]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this loan?')) return;
    setApproving(true);
    try {
      await approveLoan(id, {});
      fetchLoan();
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this loan as completed?')) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/loans/${id}/complete`, { method: 'PUT' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to mark complete');
      }
      fetchLoan();
    } catch (err) {
      alert(err.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleRepaymentSubmit = async (e) => {
    e.preventDefault();
    if (!repaymentForm.amount || Number(repaymentForm.amount) <= 0) {
      setRepaymentError('Enter a valid amount');
      return;
    }
    setSubmittingRepayment(true);
    setRepaymentError(null);
    try {
      await addRepayment(id, {
        amount: Number(repaymentForm.amount),
        date: repaymentForm.date,
        notes: repaymentForm.notes.trim() || undefined,
      });
      setRepaymentForm({ amount: '', date: getTodayDateInputValue(), notes: '' });
      setShowRepaymentForm(false);
      fetchLoan();
      fetchSchedule();
      fetchPenalty();
    } catch (err) {
      setRepaymentError(err.message);
    } finally {
      setSubmittingRepayment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('document', file);
      await uploadLoanDocument(id, formData);
      fetchLoan();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ─── Derived values ──────────────────────────────────────────────────────

  const getMemberName = () => {
    if (!loan) return '';
    if (loan.member_name) return loan.member_name;
    if (loan.member?.name) return loan.member.name;
    if (loan.member?.first_name)
      return `${loan.member.first_name} ${loan.member.last_name || ''}`.trim();
    return 'Member';
  };

  const getPrincipal = () => Number(loan?.amount || loan?.principal || 0);
  const getRate = () => Number(loan?.interest_rate || loan?.interestRate || 0);
  const getTerm = () => Number(loan?.term || loan?.term_months || 0);
  const getEMI = () => {
    if (loan?.monthly_payment || loan?.emi || loan?.monthlyPayment) {
      return Number(loan.monthly_payment || loan.emi || loan.monthlyPayment);
    }
    return calculateEMI(getPrincipal(), getRate(), getTerm());
  };
  const getTotalRepayable = () => {
    if (loan?.total_repayable || loan?.totalRepayable) {
      return Number(loan.total_repayable || loan.totalRepayable);
    }
    return getEMI() * getTerm();
  };
  const getTotalInterest = () => getTotalRepayable() - getPrincipal();
  const getStartDate = () => loan?.start_date || loan?.startDate || loan?.created_at;
  const getEndDate = () => {
    if (loan?.end_date || loan?.endDate) return loan.end_date || loan.endDate;
    const lastScheduleEntry = schedule[schedule.length - 1];
    return lastScheduleEntry?.due_date || lastScheduleEntry?.dueDate || null;
  };

  const getRepayments = () => loan?.repayments || loan?.payments || [];
  const getDocuments = () => loan?.documents || [];
  const getTotalPaid = () => {
    if (loan?.total_paid || loan?.totalPaid) return Number(loan.total_paid || loan.totalPaid);
    return getRepayments().reduce((sum, r) => sum + Number(r.amount || 0), 0);
  };
  const getRepaidPercent = () => {
    const total = getTotalRepayable();
    if (total <= 0) return 0;
    return Math.min(100, (getTotalPaid() / total) * 100);
  };

  // ─── Loading / Error states ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-slate-500">Loading loan details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h3 className="mt-3 text-lg font-semibold text-red-800">Error loading loan</h3>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchLoan}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!loan) return null;

  const StatusIcon = STATUS_ICONS[loan.status] || Clock;
  const repayments = getRepayments();
  const documents = getDocuments();

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/loans')}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors print:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{getMemberName()}</h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGES[loan.status] || STATUS_BADGES.pending
                  }`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {loan.status?.charAt(0).toUpperCase() + loan.status?.slice(1)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Loan #{loan.id} &middot; Rs. {formatCurrency(getPrincipal())}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 print:hidden">
          {loan.status === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {approving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve Loan
            </button>
          )}
          {loan.status === 'active' && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Mark Complete
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Loan Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Principal', value: `Rs. ${formatCurrency(getPrincipal())}`, icon: Banknote, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Interest Rate', value: `${getRate()}% p.a.`, icon: Percent, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Term', value: `${getTerm()} months`, icon: Hash, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Monthly EMI', value: `Rs. ${formatCurrency(getEMI())}`, icon: CircleDollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Start Date', value: formatDate(getStartDate()), icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'End Date', value: formatDate(getEndDate()), icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Total Interest', value: `Rs. ${formatCurrency(getTotalInterest())}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Repayable', value: `Rs. ${formatCurrency(getTotalRepayable())}`, icon: Banknote, color: 'text-slate-700', bg: 'bg-slate-100' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className={`rounded-lg p-1.5 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
              </div>
              <p className="mt-2 text-base font-bold text-slate-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Repayment Progress</span>
          <span className="text-sm font-semibold text-indigo-600">
            {getRepaidPercent().toFixed(1)}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${getRepaidPercent()}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>Paid: Rs. {formatCurrency(getTotalPaid())}</span>
          <span>Remaining: Rs. {formatCurrency(Math.max(0, getTotalRepayable() - getTotalPaid()))}</span>
        </div>
      </div>

      {/* Penalty Section */}
      {penalty && (penalty.is_overdue || penalty.isOverdue || penalty.penalty_amount > 0) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-red-800">Overdue Notice</h3>
              <p className="mt-1 text-sm text-red-700">
                This loan has overdue payments.
                {(penalty.penalty_amount || penalty.penaltyAmount) > 0 && (
                  <span className="font-semibold">
                    {' '}Penalty amount: Rs.{' '}
                    {formatCurrency(penalty.penalty_amount || penalty.penaltyAmount)}
                  </span>
                )}
              </p>
              {penalty.days_overdue != null && (
                <p className="mt-1 text-xs text-red-600">
                  {penalty.days_overdue || penalty.daysOverdue} days overdue
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Repayment Section */}
      <Section
        title="Repayments"
        icon={Banknote}
        badge={repayments.length > 0 ? repayments.length : undefined}
      >
        <div className="p-5 space-y-4">
          {/* Add Repayment Button/Form */}
          {loan.status === 'active' && (
            <div className="print:hidden">
              {!showRepaymentForm ? (
                <button
                  onClick={() => setShowRepaymentForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Repayment
                </button>
              ) : (
                <form
                  onSubmit={handleRepaymentSubmit}
                  className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">New Repayment</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRepaymentForm(false);
                        setRepaymentError(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {repaymentError && (
                    <p className="text-xs text-red-600 font-medium">{repaymentError}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Amount (Rs.) *
                      </label>
                      <input
                        type="number"
                        value={repaymentForm.amount}
                        onChange={(e) =>
                          setRepaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        placeholder="0.00"
                        min="0"
                        step="any"
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Date *
                      </label>
                      <DateInput
                        value={repaymentForm.date}
                        onChange={(val) =>
                          setRepaymentForm((prev) => ({ ...prev, date: val }))
                        }
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={repaymentForm.notes}
                        onChange={(e) =>
                          setRepaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Optional note..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRepaymentForm(false)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRepayment}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {submittingRepayment ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Submit
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Repayments Table */}
          {repayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Principal
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Interest
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Penalty
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repayments.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-700">
                        {formatDate(r.date || r.payment_date || r.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-semibold text-slate-900">
                        Rs. {formatCurrency(r.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-slate-600">
                        Rs. {formatCurrency(r.principal_portion || r.principalPortion || r.principal || 0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-slate-600">
                        Rs. {formatCurrency(r.interest_portion || r.interestPortion || r.interest || 0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-slate-600">
                        {Number(r.penalty || r.penalty_amount || 0) > 0 ? (
                          <span className="text-red-600 font-medium">
                            Rs. {formatCurrency(r.penalty || r.penalty_amount)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-500 max-w-xs truncate">
                        {r.notes || r.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Banknote className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No repayments recorded yet.</p>
            </div>
          )}
        </div>
      </Section>

      {/* Amortization Schedule */}
      <Section title="Amortization Schedule" icon={FileText} badge={schedule.length > 0 ? schedule.length : undefined}>
        <div className="p-5">
          {schedule.length > 0 ? (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Month #
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      EMI
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Principal
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Interest
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedule.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-4 py-2 text-center text-sm font-medium text-slate-700">
                        {row.month || row.month_number || idx + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-slate-700">
                        Rs. {formatCurrency(row.emi || row.payment || row.installment)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-slate-600">
                        Rs. {formatCurrency(row.principal || row.principal_portion)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-slate-600">
                        Rs. {formatCurrency(row.interest || row.interest_portion)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-sm font-medium text-slate-700">
                        Rs. {formatCurrency(row.balance || row.remaining_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">
                No amortization schedule available.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Documents Section */}
      <Section title="Documents" icon={FileText} badge={documents.length > 0 ? documents.length : undefined}>
        <div className="p-5 space-y-4">
          {/* Upload Form */}
          <div className="print:hidden">
            <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-xs text-slate-400">Accepts images and PDF files</p>
            {uploadError && (
              <p className="mt-1 text-xs text-red-600 font-medium">{uploadError}</p>
            )}
          </div>

          {/* Documents List */}
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc, idx) => {
                const isImage =
                  doc.type?.startsWith('image') ||
                  doc.mime_type?.startsWith('image') ||
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.filename || doc.name || '');
                const DocIcon = isImage ? Image : File;

                return (
                  <div
                    key={doc.id || idx}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="rounded-lg bg-slate-100 p-2">
                      <DocIcon className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {doc.filename || doc.name || doc.original_name || `Document ${idx + 1}`}
                      </p>
                      {doc.uploaded_at && (
                        <p className="text-xs text-slate-400">{formatDate(doc.uploaded_at)}</p>
                      )}
                    </div>
                    {(doc.url || doc.download_url || doc.path) && (
                      <a
                        href={doc.url || doc.download_url || doc.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No documents uploaded yet.</p>
            </div>
          )}
        </div>
      </Section>

      {/* Loan Purpose */}
      {(loan.purpose || loan.description) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-800">Purpose</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {loan.purpose || loan.description}
          </p>
        </div>
      )}
    </div>
  );
}
