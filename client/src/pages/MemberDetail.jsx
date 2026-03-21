import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { buildMemberProfileData } from '../utils/memberProfile';
import MemberInfographics from '../components/MemberInfographics';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Download,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  Printer,
  ShieldAlert,
  Wallet,
  CircleDollarSign,
  CreditCard,
} from 'lucide-react';

function MetricCard({ icon: Icon, label, value, helper, accent }) {
  return (
    <div className="glass-panel-strong rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</p>
          <p className="mt-1.5 text-lg font-bold text-[var(--text-primary)] sm:text-xl">{value}</p>
          {helper && <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{helper}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActivityDot({ accent }) {
  const colorMap = {
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    sky: 'bg-sky-500',
    slate: 'bg-slate-400',
  };

  return <span className={`mt-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${colorMap[accent] || colorMap.slate}`} />;
}

function MiniStat({ label, value, helper, valueClassName = 'text-[var(--text-primary)]' }) {
  return (
    <div className="rounded-xl bg-[var(--surface-3)] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">{label}</p>
      <p className={`mt-1.5 text-lg font-semibold ${valueClassName}`}>{value}</p>
      {helper && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{helper}</p>}
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams();
  const { formatDate: localeFormatDate, formatCurrency: localeFormatCurrency } = useLocale();
  const [memberData, setMemberData] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);

        const [memberResponse, statementResponse] = await Promise.all([
          fetch(`/api/members/${id}`),
          fetch(`/api/members/${id}/statement`),
        ]);

        if (!memberResponse.ok || !statementResponse.ok) {
          throw new Error('Failed to load member profile');
        }

        const [memberResult, statementResult] = await Promise.all([
          memberResponse.json(),
          statementResponse.json(),
        ]);

        if (!active) return;

        setMemberData(memberResult);
        setStatementData(statementResult);
      } catch (fetchError) {
        console.error('Failed to fetch member profile:', fetchError);
        if (active) {
          setError('Failed to load member profile.');
          setMemberData(null);
          setStatementData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchProfile();
    return () => {
      active = false;
    };
  }, [id]);

  const formatDate = (value) => {
    if (!value) return '—';
    return localeFormatDate(value);
  };

  const formatCurrency = (amount) => localeFormatCurrency(Number(amount) || 0);

  const formatDateTime = (value) => {
    if (!value) return '—';

    const normalized = String(value).includes(' ') ? String(value).replace(' ', 'T') : String(value);
    const date = new Date(normalized.endsWith('Z') || normalized.includes('T') ? normalized : `${normalized}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return formatDate(value);
    }

    return new Intl.DateTimeFormat('en-NP', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-[var(--text-muted)]">Loading member profile...</p>
        </div>
      </div>
    );
  }

  if (error || !memberData || !statementData) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
        <p className="font-medium text-rose-700 dark:text-rose-400">{error || 'Member not found.'}</p>
        <Link to="/members" className="mt-3 inline-flex text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400">
          Back to members
        </Link>
      </div>
    );
  }

  const { member, loans, savingsHistory, repayments, recentActivity, totals } = buildMemberProfileData(
    memberData,
    statementData
  );
  const statementDownloadUrl = `/api/export/member-statement/${id}`;

  return (
    <div className="space-y-5">
      {/* ── Header Card ── */}
      <div className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
        {/* Back + Actions row */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/members"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to={`/savings/new?member=${id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 sm:px-4 sm:text-sm"
            >
              <ArrowUpCircle className="h-4 w-4" />
              <span className="hidden xs:inline">Deposit</span>
            </Link>
            <Link
              to={`/loans/new?member=${id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-700 sm:px-4 sm:text-sm"
            >
              <Landmark className="h-4 w-4" />
              <span className="hidden xs:inline">New Loan</span>
            </Link>
            <a
              href={statementDownloadUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] sm:px-4 sm:text-sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] sm:px-4 sm:text-sm"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Profile info */}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="h-16 w-16 shrink-0 rounded-2xl border border-[var(--border-soft)] object-cover shadow-sm sm:h-20 sm:w-20"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 sm:h-20 sm:w-20 sm:text-2xl">
              {member.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">{member.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  member.status?.toLowerCase() === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                }`}
              >
                {member.status || 'Active'}
              </span>
              {member.member_no && (
                <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  #{member.member_no}
                </span>
              )}
            </div>
            {member.name_np && (
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{member.name_np}</p>
            )}
            <p className="mt-1 text-xs text-[var(--text-faint)]">
              Member since {formatDate(member.joinedDate || member.createdAt)}
            </p>

            {/* Contact row */}
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--text-muted)]">
              {member.phone && (
                <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400">
                  <Phone className="h-3 w-3 text-[var(--text-faint)]" />
                  {member.phone}
                </a>
              )}
              {member.email && (
                <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400">
                  <Mail className="h-3 w-3 text-[var(--text-faint)]" />
                  {member.email}
                </a>
              )}
              {member.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[var(--text-faint)]" />
                  {member.address}
                </span>
              )}
              {member.emergencyContact && (
                <span className="inline-flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-[var(--text-faint)]" />
                  {member.emergencyContact}
                </span>
              )}
            </div>
          </div>

          {/* Quick stats badges - desktop only */}
          <div className="hidden shrink-0 gap-3 xl:flex">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totals.savingsTransactionCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Savings</p>
            </div>
            <div className="w-px bg-[var(--border-soft)]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totals.repaymentCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Repayments</p>
            </div>
            <div className="w-px bg-[var(--border-soft)]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totals.totalLoansTaken}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Loans</p>
            </div>
          </div>
        </div>

        {/* Mobile stats chips */}
        <div className="mt-3 flex flex-wrap gap-2 xl:hidden">
          <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {totals.savingsTransactionCount} savings records
          </span>
          <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {totals.repaymentCount} repayments
          </span>
          <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {totals.totalLoansTaken} loans taken
          </span>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 sm:gap-4">
        <MetricCard
          icon={PiggyBank}
          label="Net Savings"
          value={formatCurrency(totals.totalSavings)}
          helper={`${formatCurrency(totals.totalDeposits)} deposited`}
          accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
        />
        <MetricCard
          icon={CreditCard}
          label="Loan Count"
          value={String(totals.totalLoansTaken)}
          helper="Total loans taken"
          accent="bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Borrowed"
          value={formatCurrency(totals.totalLoanAmount)}
          helper={`${formatCurrency(totals.totalLoanRepayable)} repayable`}
          accent="bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
        />
        <MetricCard
          icon={ArrowDownCircle}
          label="Total Repaid"
          value={formatCurrency(totals.totalRepayments)}
          helper={`${formatCurrency(totals.totalInterestPaid)} interest`}
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        />
        <MetricCard
          icon={Wallet}
          label="Balance"
          value={formatCurrency(totals.outstandingBalance)}
          helper={`${formatCurrency(totals.totalPenaltyPaid)} penalties`}
          accent="bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
        />
      </div>

      {/* ── Main Content: 3-column on XL, stacked otherwise ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Left: Loan Portfolio (spans 2 cols on XL) */}
        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6 xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Loan Portfolio</h2>
            <p className="text-xs text-[var(--text-muted)]">Amounts borrowed, repaid, remaining, and last repayment for each loan.</p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <MiniStat
              label="Monthly Due"
              value={formatCurrency(totals.monthlyLoanObligation)}
              helper={`${totals.activeLoans} active`}
            />
            <MiniStat
              label="Progress"
              value={`${totals.repaymentProgressPercent.toFixed(1)}%`}
              helper={`${formatCurrency(totals.totalRepayments)} of ${formatCurrency(totals.totalLoanRepayable)}`}
              valueClassName="text-indigo-700 dark:text-indigo-400"
            />
            <MiniStat
              label="Status Mix"
              value={`${totals.activeLoans}/${totals.completedLoans}/${totals.pendingLoans}`}
              helper="Active / done / pending"
            />
          </div>

          {loans.length === 0 ? (
            <p className="rounded-2xl bg-[var(--surface-3)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">No loans recorded for this member.</p>
          ) : (
            <>
              {/* Mobile loan cards */}
              <div className="space-y-3 lg:hidden">
                {loans.map((loan) => (
                  <div key={loan.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold text-[var(--text-primary)]">{formatCurrency(loan.amount)}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        loan.status?.toLowerCase() === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : loan.status?.toLowerCase() === 'completed'
                          ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400'
                          : 'bg-[var(--surface-1)] text-[var(--text-muted)]'
                      }`}>
                        {loan.status || '—'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">
                      Taken {formatDate(loan.approvedDate || loan.startDate)}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Repaid</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(loan.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Remaining</p>
                        <p className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(loan.remainingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Monthly EMI</p>
                        <p className="font-medium text-[var(--text-primary)]">{formatCurrency(loan.monthlyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Repayments</p>
                        <p className="font-medium text-[var(--text-primary)]">{loan.repaymentCount}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--text-faint)]">
                        <span>{loan.progressPercent.toFixed(1)}% repaid</span>
                        <span>Last: {formatDate(loan.lastRepaymentDate)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--surface-1)]">
                        <div
                          className="h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500"
                          style={{ width: `${Math.max(0, Math.min(loan.progressPercent, 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop loan table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-[var(--table-head-bg)]">
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Loan</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Borrowed</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Repaid</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Remaining</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">EMI</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Last Repayment</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="transition-colors hover:bg-[var(--table-row-hover)]">
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(loan.approvedDate || loan.startDate)}</p>
                          <p className="text-xs text-[var(--text-faint)]">{loan.repaymentCount} repayments · {loan.progressPercent.toFixed(1)}%</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-[var(--text-primary)]">{formatCurrency(loan.amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(loan.totalPaid)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-rose-600 dark:text-rose-400">{formatCurrency(loan.remainingBalance)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--text-secondary)]">{formatCurrency(loan.monthlyPayment)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="text-sm text-[var(--text-secondary)]">{formatDate(loan.lastRepaymentDate)}</p>
                          <p className="text-xs text-[var(--text-faint)]">{formatDateTime(loan.lastRepaymentAt)}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            loan.status?.toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : loan.status?.toLowerCase() === 'completed'
                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400'
                              : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                          }`}>
                            {loan.status || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Right: Recent Activity */}
        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h2>
              <p className="text-xs text-[var(--text-muted)]">Latest transactions and movements.</p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <p className="rounded-xl bg-[var(--surface-3)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">No recent activity available.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-2.5">
                  <ActivityDot accent={activity.accent} />
                  <div className="min-w-0 flex-1 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{activity.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{activity.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(activity.amount)}</span>
                    </div>
                    <p className="mt-1.5 text-[10px] text-[var(--text-faint)]">
                      {formatDate(activity.date)} · {formatDateTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Savings History + Repayment Breakdown side by side ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Savings History */}
        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Savings History</h2>
              <p className="text-xs text-[var(--text-muted)]">Deposits and withdrawals with dates and notes.</p>
            </div>
          </div>

          {savingsHistory.length === 0 ? (
            <p className="rounded-xl bg-[var(--surface-3)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">No savings transactions yet.</p>
          ) : (
            <>
              {/* Mobile savings cards */}
              <div className="space-y-2.5 md:hidden">
                {savingsHistory.slice(0, 12).map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      transaction.type === 'deposit'
                        ? 'bg-emerald-50 dark:bg-emerald-500/20'
                        : 'bg-rose-50 dark:bg-rose-500/20'
                    }`}>
                      {transaction.type === 'deposit' ? (
                        <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </p>
                      <p className="truncate text-xs text-[var(--text-faint)]">{formatDate(transaction.date)} · {transaction.notes || 'No notes'}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-semibold ${transaction.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop savings table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-[var(--table-head-bg)]">
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Date</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Type</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {savingsHistory.map((transaction) => (
                      <tr key={transaction.id} className="transition-colors hover:bg-[var(--table-row-hover)]">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">{formatDate(transaction.date)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            transaction.type === 'deposit'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {transaction.type === 'deposit' ? (
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownCircle className="h-3.5 w-3.5" />
                            )}
                            {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-[var(--text-primary)]">{formatCurrency(transaction.amount)}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{transaction.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Repayment Breakdown */}
        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Repayment Breakdown</h2>
              <p className="text-xs text-[var(--text-muted)]">Principal, interest, and penalty splits.</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <MiniStat
              label="Principal Paid"
              value={formatCurrency(totals.totalPrincipalPaid)}
              helper={`${formatCurrency(totals.totalInterestPaid)} interest`}
              valueClassName="text-emerald-600 dark:text-emerald-400"
            />
            <MiniStat
              label="Charges Paid"
              value={formatCurrency(totals.totalPenaltyPaid)}
              helper={`${repayments.length} entries`}
              valueClassName="text-rose-600 dark:text-rose-400"
            />
          </div>

          {repayments.length === 0 ? (
            <p className="rounded-xl bg-[var(--surface-3)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">No repayments recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {repayments.slice(0, 8).map((repayment) => (
                <div key={repayment.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(repayment.amount)}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                        {formatDate(repayment.date)} · Loan #{repayment.loanId}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-[var(--text-muted)]">
                    <span>P: {formatCurrency(repayment.principal)}</span>
                    <span>I: {formatCurrency(repayment.interest)}</span>
                    <span>F: {formatCurrency(repayment.penalty)}</span>
                  </div>
                  {repayment.notes && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">{repayment.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Financial Charts ── */}
      <MemberInfographics totals={totals} formatCurrency={formatCurrency} />
    </div>
  );
}
