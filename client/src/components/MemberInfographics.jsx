import { BarChart3, CreditCard, Landmark, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const LOAN_BREAKDOWN_COLORS = ['#f59e0b', '#10b981', '#ef4444'];
const STATUS_COLORS = ['#2563eb', '#10b981', '#f59e0b'];
const SAVINGS_FLOW_COLORS = ['#6366f1', '#ef4444'];

function formatCompactValue(value) {
  const numericValue = Number(value || 0);

  if (numericValue >= 10000000) {
    return `${(numericValue / 10000000).toFixed(1)}cr`;
  }

  if (numericValue >= 100000) {
    return `${(numericValue / 100000).toFixed(1)}L`;
  }

  if (numericValue >= 1000) {
    return `${Math.round(numericValue / 1000)}k`;
  }

  return `${Math.round(numericValue)}`;
}

function buildLoanBreakdownData(totals) {
  return [
    { name: 'Borrowed', value: Number(totals.totalLoanAmount || 0) },
    { name: 'Repaid', value: Number(totals.totalRepayments || 0) },
    { name: 'Remaining', value: Number(totals.outstandingBalance || 0) },
  ];
}

function buildLoanStatusData(totals) {
  return [
    { name: 'Active', value: Number(totals.activeLoans || 0) },
    { name: 'Completed', value: Number(totals.completedLoans || 0) },
    { name: 'Pending', value: Number(totals.pendingLoans || 0) },
  ];
}

function buildSavingsFlowData(totals) {
  return [
    { name: 'Deposits', value: Number(totals.totalDeposits || 0) },
    { name: 'Withdrawals', value: Number(totals.totalWithdrawals || 0) },
  ];
}

function ChartPanel({ title, helper, children, className = '' }) {
  return (
    <div className={`rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{helper}</p>
      </div>
      {children}
    </div>
  );
}

export default function MemberInfographics({ totals, formatCurrency }) {
  const loanBreakdownData = buildLoanBreakdownData(totals);
  const loanStatusData = buildLoanStatusData(totals);
  const savingsFlowData = buildSavingsFlowData(totals);
  const hasLoanBreakdown = loanBreakdownData.some((entry) => entry.value > 0);
  const hasLoanStatus = loanStatusData.some((entry) => entry.value > 0);
  const hasSavingsFlow = savingsFlowData.some((entry) => entry.value > 0);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-indigo-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Financial Snapshot</h2>
          <p className="text-sm text-slate-500">Quick visual summaries of borrowing, repayment progress, and account cash flow.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Loan Snapshot"
          helper={`${totals.totalLoansTaken} total loans taken • ${formatCurrency(totals.totalLoanAmount)} borrowed overall`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total Loans Taken</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{totals.totalLoansTaken}</p>
              <p className="mt-1 text-sm text-slate-500">{formatCurrency(totals.totalLoanRepayable)} repayable amount</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          {hasLoanBreakdown ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={loanBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={84}
                    paddingAngle={3}
                  >
                    {loanBreakdownData.map((entry, index) => (
                      <Cell key={entry.name} fill={LOAN_BREAKDOWN_COLORS[index % LOAN_BREAKDOWN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid rgba(148,163,184,0.18)',
                      background: 'rgba(255,255,255,0.92)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500">Loan figures will appear here after the first loan is issued.</p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {loanBreakdownData.map((entry, index) => (
              <div key={entry.name} className="rounded-2xl bg-white px-3 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: LOAN_BREAKDOWN_COLORS[index % LOAN_BREAKDOWN_COLORS.length] }}
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{entry.name}</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(entry.value)}</p>
              </div>
            ))}
          </div>
        </ChartPanel>

        <ChartPanel
          title="Loan Status Mix"
          helper="See how this member's loans are distributed across active, completed, and pending states."
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Loan Statuses</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {totals.activeLoans + totals.completedLoans + totals.pendingLoans}
              </p>
              <p className="mt-1 text-sm text-slate-500">Tracked loan records</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Landmark className="h-5 w-5" />
            </div>
          </div>

          {hasLoanStatus ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loanStatusData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Loans']}
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid rgba(148,163,184,0.18)',
                      background: 'rgba(255,255,255,0.92)',
                    }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {loanStatusData.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500">Loan status distribution will appear here once loan records exist.</p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {loanStatusData.map((entry, index) => (
              <div key={entry.name} className="rounded-2xl bg-white px-3 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{entry.name}</p>
                <p
                  className="mt-2 text-xl font-semibold"
                  style={{ color: STATUS_COLORS[index % STATUS_COLORS.length] }}
                >
                  {entry.value}
                </p>
              </div>
            ))}
          </div>
        </ChartPanel>

        <ChartPanel
          title="Savings Flow"
          helper="View deposits and withdrawals to understand the member's savings activity."
          className="xl:col-span-2"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Net Savings</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(totals.totalSavings)}</p>
              <p className="mt-1 text-sm text-slate-500">Current net savings balance</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {hasSavingsFlow ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={savingsFlowData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactValue}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid rgba(148,163,184,0.18)',
                      background: 'rgba(255,255,255,0.92)',
                    }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {savingsFlowData.map((entry, index) => (
                      <Cell key={entry.name} fill={SAVINGS_FLOW_COLORS[index % SAVINGS_FLOW_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500">Savings flow will appear here after deposits are recorded.</p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {savingsFlowData.map((entry, index) => (
              <div key={entry.name} className="rounded-2xl bg-white px-3 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SAVINGS_FLOW_COLORS[index % SAVINGS_FLOW_COLORS.length] }}
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{entry.name}</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(entry.value)}</p>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>
    </section>
  );
}
