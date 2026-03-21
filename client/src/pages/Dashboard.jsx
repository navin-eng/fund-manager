import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';
import MemberDashboard from './MemberDashboard';
import {
  Wallet,
  Users,
  Landmark,
  PiggyBank,
  UserPlus,
  Plus,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import {
  normalizeBalanceSheet,
  normalizeLoan,
  normalizeReportSummary,
} from '../utils/apiTransforms';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-12 w-12 rounded-lg bg-slate-200" />
        <div className="h-6 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-8 w-28 rounded bg-slate-200" />
        <div className="h-4 w-20 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 animate-pulse">
      <div className="h-5 w-40 rounded bg-slate-200 mb-6" />
      <div className="h-64 rounded bg-slate-100" />
    </div>
  );
}

function buildMonthlySavingsData(transactions) {
  const byKey = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== 'deposit') continue;
    const key = String(transaction.date || '').slice(0, 7);
    if (!key) continue;

    if (!byKey.has(key)) {
      byKey.set(key, {
        month: key,
        amount: 0,
      });
    }

    byKey.get(key).amount += Number(transaction.amount || 0);
  }

  return Array.from(byKey.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([, value]) => value);
}

function buildLoanStatusData(loans) {
  const counts = loans.reduce((acc, loan) => {
    const status = loan.status || 'unknown';
    acc.set(status, (acc.get(status) || 0) + 1);
    return acc;
  }, new Map());

  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function buildRecentActivity(transactions, loans) {
  const savingsActivity = transactions.map((transaction) => ({
    id: `saving-${transaction.id}`,
    type: transaction.type,
    amount: Number(transaction.amount || 0),
    date: transaction.date,
    description: `${transaction.member_name || 'Member'} ${transaction.type === 'deposit' ? 'deposit' : 'withdrawal'}`,
  }));

  const loanActivity = loans
    .filter((loan) => loan.approvedDate || loan.startDate)
    .map((loan) => ({
      id: `loan-${loan.id}`,
      type: 'loan',
      amount: Number(loan.amount || 0),
      date: loan.approvedDate || loan.startDate,
      description: `Loan issued to ${loan.memberName || 'member'}`,
    }));

  return [...savingsActivity, ...loanActivity]
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
    .slice(0, 10);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { formatDate, formatCurrency: localeFormatCurrency } = useLocale();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [monthlySavingsData, setMonthlySavingsData] = useState([]);
  const [loanStatusData, setLoanStatusData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === 'member') {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [summaryRes, balanceRes, savingsRes, loansRes] = await Promise.all([
          fetch('/api/reports/summary?period=monthly'),
          fetch('/api/reports/balance-sheet'),
          fetch('/api/savings'),
          fetch('/api/loans'),
        ]);

        if (!summaryRes.ok || !balanceRes.ok || !savingsRes.ok || !loansRes.ok) {
          throw new Error('Failed to load dashboard data');
        }

        const [summaryData, balanceData, savingsData, loansData] = await Promise.all([
          summaryRes.json(),
          balanceRes.json(),
          savingsRes.json(),
          loansRes.json(),
        ]);

        const normalizedSummary = normalizeReportSummary(summaryData);
        const normalizedBalanceSheet = normalizeBalanceSheet(balanceData);
        const transactions = Array.isArray(savingsData) ? savingsData : [];
        const normalizedLoans = Array.isArray(loansData)
          ? loansData.map(normalizeLoan).filter(Boolean)
          : [];

        setSummary(normalizedSummary);
        setBalanceSheet(normalizedBalanceSheet);
        setMonthlySavingsData(buildMonthlySavingsData(transactions));
        setLoanStatusData(buildLoanStatusData(normalizedLoans));
        setRecentActivity(buildRecentActivity(transactions, normalizedLoans));
      } catch {
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.role]);

  const totalFund = summary?.netFundBalance ?? balanceSheet?.fundBalance ?? 0;
  const totalMembers = summary?.memberCount ?? 0;
  const activeLoans = summary?.activeLoans ?? 0;
  const monthlySavings = summary?.totalSavings ?? 0;

  if (user?.role === 'member') {
    return <MemberDashboard />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Fund Balance"
          value={localeFormatCurrency(totalFund)}
          icon={Wallet}
          color="indigo"
        />
        <StatCard
          title="Total Members"
          value={totalMembers.toLocaleString()}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Active Loans"
          value={activeLoans.toLocaleString()}
          icon={Landmark}
          color="amber"
        />
        <StatCard
          title="Monthly Savings"
          value={localeFormatCurrency(monthlySavings)}
          icon={PiggyBank}
          color="sky"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Savings Bar Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            Monthly Savings (Last 6 Months)
          </h3>
          {monthlySavingsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySavingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No savings data"
              description="Savings data will appear here once deposits are recorded."
            />
          )}
        </div>

        {/* Loan Status Pie Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            Loan Status Distribution
          </h3>
          {loanStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={loanStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {loanStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No loan data"
              description="Loan distribution will appear here once loans are issued."
            />
          )}
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">Recent Activity</h3>
            <span className="text-xs text-slate-400">Last 10 transactions</span>
          </div>
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentActivity.slice(0, 10).map((txn, idx) => (
                <div key={idx} className="flex items-center gap-4 px-6 py-3.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      txn.type === 'saving' || txn.type === 'deposit'
                        ? 'bg-emerald-100 text-emerald-600'
                        : txn.type === 'repayment'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {txn.type === 'saving' || txn.type === 'deposit' ? (
                      <PiggyBank className="h-4 w-4" />
                    ) : (
                      <Landmark className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {txn.description || txn.memberName || 'Transaction'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {txn.date
                        ? formatDate(txn.date)
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      txn.type === 'saving' || txn.type === 'deposit' || txn.type === 'repayment'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {txn.type === 'saving' || txn.type === 'deposit' || txn.type === 'repayment'
                      ? '+'
                      : '-'}
                    {localeFormatCurrency(Math.abs(txn.amount ?? 0))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No recent activity"
                description="Transactions will appear here as they are recorded."
              />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={() => navigate('/members/new')}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                <UserPlus className="h-4 w-4" />
              </div>
              <span className="flex-1">Add Member</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/savings/new')}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-emerald-200 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <Plus className="h-4 w-4" />
              </div>
              <span className="flex-1">New Deposit</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/loans/new')}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-amber-200 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                <Landmark className="h-4 w-4" />
              </div>
              <span className="flex-1">New Loan</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
            </button>
          </div>

          {/* Current date display */}
          <div className="border-t border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
