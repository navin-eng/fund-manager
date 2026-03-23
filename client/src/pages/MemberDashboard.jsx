import { useEffect, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CircleDollarSign,
  CreditCard,
  Download,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { buildMemberProfileData } from '../utils/memberProfile';
import MemberInfographics from '../components/MemberInfographics';

function SummaryCard({ icon: Icon, label, value, helper, iconClass = 'text-indigo-600 bg-indigo-50' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity, formatCurrency, formatDate, formatDateTime }) {
  const colorMap = {
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    sky: 'bg-sky-500',
    slate: 'bg-slate-400',
  };

  return (
    <div className="flex gap-3">
      <span className={`mt-2 inline-flex h-2.5 w-2.5 rounded-full ${colorMap[activity.accent] || colorMap.slate}`} />
      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{activity.title}</p>
            <p className="mt-1 text-sm text-slate-500">{activity.subtitle}</p>
          </div>
          <span className="text-sm font-semibold text-slate-800">{formatCurrency(activity.amount)}</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {formatDate(activity.date)} · {formatDateTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

function DetailTile({ icon: Icon, label, value, helper, href, iconClass = 'text-slate-600 bg-slate-100' }) {
  const content = (
    <>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-800">{value}</p>
        {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {content}
    </div>
  );
}

function MiniStat({ label, value, helper, valueClassName = 'text-slate-900' }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${valueClassName}`}>{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

export default function MemberDashboard() {
  const { user, token } = useAuth();
  const { formatDate: localeFormatDate, formatCurrency: localeFormatCurrency } = useLocale();
  const [memberData, setMemberData] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const memberId = user?.member_id;

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [memberResponse, statementResponse] = await Promise.all([
          fetch(`/api/members/${memberId}`, { headers }),
          fetch(`/api/members/${memberId}/statement`, { headers }),
        ]);

        if (!memberResponse.ok || !statementResponse.ok) {
          throw new Error('Failed to load your profile');
        }

        const [memberResult, statementResult] = await Promise.all([
          memberResponse.json(),
          statementResponse.json(),
        ]);

        if (!active) return;

        setMemberData(memberResult);
        setStatementData(statementResult);
      } catch (fetchError) {
        console.error('Error loading member dashboard:', fetchError);
        if (active) {
          setError('Failed to load your dashboard data. Please try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      active = false;
    };
  }, [memberId, token]);

  const formatDate = (value) => {
    if (!value) return '—';
    return localeFormatDate(value);
  };

  const formatCurrency = (value) => localeFormatCurrency(Number(value) || 0);

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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!memberId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-medium text-amber-800">Your account is not linked to a member profile.</p>
        <p className="mt-2 text-sm text-amber-700">Please contact your fund administrator.</p>
      </div>
    );
  }

  if (error || !memberData || !statementData) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="font-medium text-rose-700">{error || 'Unable to load your profile.'}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-sm font-medium text-rose-600 hover:text-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { member, loans, savingsHistory, repayments, recentActivity, totals } = buildMemberProfileData(
    memberData,
    statementData
  );
  const statementDownloadUrl = `/api/export/member-statement/${memberId}`;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Personal Profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Welcome back, {member.name || user?.name}!</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              View your savings, loan history, repayment progress, and recent financial activity in one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">{totals.totalLoansTaken} loans taken</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{totals.repaymentCount} repayments</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{totals.savingsTransactionCount} savings records</span>
            </div>
          </div>

          <a
            href={statementDownloadUrl}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download My Statement
          </a>
        </div>
      </section>

      {/* Savings Summary */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 px-1">Savings</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={PiggyBank}
            label="Savings Balance"
            value={formatCurrency(totals.totalSavings)}
            helper={`${formatCurrency(totals.totalDeposits)} deposited`}
            iconClass="text-indigo-600 bg-indigo-50"
          />
          <SummaryCard
            icon={ArrowUpCircle}
            label="Total Deposits"
            value={formatCurrency(totals.totalDeposits)}
            helper={`${totals.savingsTransactionCount} transactions`}
            iconClass="text-emerald-600 bg-emerald-50"
          />
          <SummaryCard
            icon={ArrowDownCircle}
            label="Total Withdrawals"
            value={formatCurrency(totals.totalWithdrawals)}
            helper={totals.lastSavingsDate ? `Last: ${formatDate(totals.lastSavingsDate)}` : ''}
            iconClass="text-rose-600 bg-rose-50"
          />
        </div>
      </div>

      {/* Loan Summary */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 px-1">Loans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={CreditCard}
            label="Loan Count"
            value={String(totals.totalLoansTaken)}
            helper={`${totals.activeLoans} active`}
            iconClass="text-amber-600 bg-amber-50"
          />
          <SummaryCard
            icon={CircleDollarSign}
            label="Total Borrowed"
            value={formatCurrency(totals.totalLoanAmount)}
            helper={`${formatCurrency(totals.totalLoanRepayable)} repayable total`}
            iconClass="text-sky-600 bg-sky-50"
          />
          <SummaryCard
            icon={ArrowDownCircle}
            label="Total Repaid"
            value={formatCurrency(totals.totalRepayments)}
            helper={`${formatCurrency(totals.totalInterestPaid)} interest paid`}
            iconClass="text-emerald-600 bg-emerald-50"
          />
          <SummaryCard
            icon={Wallet}
            label="Outstanding"
            value={formatCurrency(totals.outstandingBalance)}
            helper={`${totals.activeLoans} active loan${totals.activeLoans === 1 ? '' : 's'}`}
            iconClass="text-rose-600 bg-rose-50"
          />
        </div>
      </div>

      <MemberInfographics totals={totals} formatCurrency={formatCurrency} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Profile Snapshot</h2>
          <p className="text-sm text-slate-500">Contact details, latest account activity, and a quick view of your current loan position.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailTile
            icon={CreditCard}
            label="Member Number"
            value={member.member_no ? `#${member.member_no}` : 'Not assigned'}
            helper={`Joined ${formatDate(member.joinedDate || member.createdAt)}`}
            iconClass="text-indigo-600 bg-indigo-50"
          />
          <DetailTile
            icon={Phone}
            label="Phone"
            value={member.phone || '—'}
            href={member.phone ? `tel:${member.phone}` : null}
            iconClass="text-blue-600 bg-blue-50"
          />
          <DetailTile
            icon={Mail}
            label="Email"
            value={member.email || '—'}
            href={member.email ? `mailto:${member.email}` : null}
            iconClass="text-violet-600 bg-violet-50"
          />
          <DetailTile
            icon={MapPin}
            label="Address"
            value={member.address || '—'}
            iconClass="text-rose-600 bg-rose-50"
          />
          <DetailTile
            icon={PiggyBank}
            label="Last Savings Activity"
            value={formatDate(totals.lastSavingsDate)}
            helper={formatDateTime(totals.lastSavingsAt)}
            iconClass="text-indigo-600 bg-indigo-50"
          />
          <DetailTile
            icon={Landmark}
            label="Last Loan Taken"
            value={formatDate(totals.lastLoanDate)}
            helper={formatDateTime(totals.lastLoanAt)}
            iconClass="text-amber-600 bg-amber-50"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="Principal Paid"
            value={formatCurrency(totals.totalPrincipalPaid)}
            helper={`${formatCurrency(totals.totalInterestPaid)} interest paid`}
            valueClassName="text-emerald-600"
          />
          <MiniStat
            label="Monthly Due"
            value={formatCurrency(totals.monthlyLoanObligation)}
            helper={`${totals.activeLoans} active loan${totals.activeLoans === 1 ? '' : 's'}`}
          />
          <MiniStat
            label="Average Loan Size"
            value={formatCurrency(totals.averageLoanSize)}
          />
          <MiniStat
            label="Overall Progress"
            value={`${totals.repaymentProgressPercent.toFixed(1)}%`}
            helper={`${formatCurrency(totals.totalRepayments)} of ${formatCurrency(totals.totalLoanRepayable)} repaid`}
            valueClassName="text-indigo-700"
          />
        </div>

        {member.emergencyContact && (
          <div className="mt-4">
            <DetailTile
              icon={ShieldAlert}
              label="Emergency Contact"
              value={member.emergencyContact}
              iconClass="text-orange-600 bg-orange-50"
            />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Loan Profile</h2>
                <p className="text-sm text-slate-500">Detailed repayment progress, dates, and remaining balances for each loan.</p>
              </div>
            </div>

            {loans.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No loans have been recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{formatCurrency(loan.amount)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Taken {formatDate(loan.approvedDate || loan.startDate)} · {formatDateTime(loan.created_at || loan.createdAt)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                        loan.status === 'active' || loan.status === 'approved'
                          ? 'bg-amber-50 text-amber-700'
                          : loan.status === 'completed'
                            ? 'bg-sky-50 text-sky-700'
                            : loan.status === 'pending'
                              ? 'bg-indigo-50 text-indigo-700'
                              : loan.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-white text-slate-600'
                      }`}>
                        {loan.status || '—'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Repaid</p>
                        <p className="mt-1 font-semibold text-emerald-600">{formatCurrency(loan.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Remaining</p>
                        <p className="mt-1 font-semibold text-rose-600">{formatCurrency(loan.remainingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">EMI</p>
                        <p className="mt-1 font-medium text-slate-800">{formatCurrency(loan.monthlyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Repayments</p>
                        <p className="mt-1 font-medium text-slate-800">{loan.repaymentCount}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{loan.progressPercent.toFixed(1)}% repaid</span>
                        <span>Last payment {formatDate(loan.lastRepaymentDate)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-indigo-600"
                          style={{ width: `${Math.max(0, Math.min(loan.progressPercent, 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Savings History</h2>
                <p className="text-sm text-slate-500">Recent deposits and withdrawals with amounts and notes.</p>
              </div>
            </div>

            {savingsHistory.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No savings transactions yet.</p>
            ) : (
              <div className="space-y-3">
                {savingsHistory.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {transaction.type === 'deposit' ? (
                            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-rose-600" />
                          )}
                          <p className="font-medium text-slate-900">
                            {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.date)}</p>
                      </div>
                      <span className={`font-semibold ${transaction.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{transaction.notes || 'No notes added.'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <p className="text-sm text-slate-500">Track loan events, repayments, and savings activity over time.</p>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No recent activity to show.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    formatDateTime={formatDateTime}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Repayment Metrics</h2>
                <p className="text-sm text-slate-500">Principal, interest, penalties, and the latest payment timestamps.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SummaryCard
                icon={ArrowDownCircle}
                label="Repayments Made"
                value={String(totals.repaymentCount)}
                helper={formatCurrency(totals.averageRepayment)}
                iconClass="text-indigo-600 bg-indigo-50"
              />
              <SummaryCard
                icon={Wallet}
                label="Penalties Paid"
                value={formatCurrency(totals.totalPenaltyPaid)}
                helper={formatCurrency(totals.totalInterestPaid)}
                iconClass="text-rose-600 bg-rose-50"
              />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Latest payment timestamp</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(totals.lastRepaymentDate)}</p>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(totals.lastRepaymentAt)}</p>
            </div>

            <div className="mt-4 space-y-3">
              {repayments.slice(0, 6).map((repayment) => (
                <div key={repayment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{formatCurrency(repayment.amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(repayment.date)} · {formatDateTime(repayment.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                      Loan #{repayment.loanId}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
                    <span>Principal {formatCurrency(repayment.principal)}</span>
                    <span>Interest {formatCurrency(repayment.interest)}</span>
                    <span>Penalty {formatCurrency(repayment.penalty)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
