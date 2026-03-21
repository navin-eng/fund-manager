import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Printer,
  Download,
  Calendar,
  Loader2,
  DollarSign,
  Users,
  Landmark,
  AlertTriangle,
  FileText,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLocale } from '../contexts/LocaleContext';
import {
  normalizeBalanceSheet,
  normalizeIncomeStatement,
  normalizeLoanPortfolio,
  normalizeMemberSavingsReport,
  normalizeOverdueLoans,
  normalizeReportSummary,
} from '../utils/apiTransforms';

const API_BASE = '';

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'fortnightly', label: 'Fortnightly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'trimester', label: 'Trimester' },
  { key: 'semi-annual', label: '6 Months' },
  { key: 'yearly', label: 'Yearly' },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function SectionHeader({ icon: Icon, title, onPrint }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      {onPrint && (
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors print:hidden"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-50 text-slate-600',
    teal: 'bg-teal-50 text-teal-600',
  };
  const cls = colorMap[color] || colorMap.indigo;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${cls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{title}</p>
    </div>
  );
}

function printSection(sectionId) {
  const content = document.getElementById(sectionId);
  if (!content) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 14px; }
          th { background-color: #f1f5f9; font-weight: 600; }
          h3 { font-size: 18px; margin-bottom: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .summary-card .value { font-size: 18px; font-weight: 700; }
          .summary-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
export default function Reports() {
  const { formatDate: localeFormatDate, formatCurrency: localeFormatCurrency, getTodayDateInputValue } = useLocale();

  const formatCurrency = (amount) => {
    return localeFormatCurrency(Number(amount) || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return localeFormatDate(dateStr);
  };

  const [period, setPeriod] = useState('monthly');
  const [date, setDate] = useState(() => getTodayDateInputValue());
  const [loading, setLoading] = useState({});
  const [summary, setSummary] = useState(null);
  const [memberSavings, setMemberSavings] = useState([]);
  const [loanPortfolio, setLoanPortfolio] = useState({ rows: [], totalOutstanding: 0, averageLoanSize: 0 });
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (key, url, setter, transform = (data) => data) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${API_BASE}${url}`);
      if (!res.ok) throw new Error(`Failed to fetch ${key}`);
      const data = await res.json();
      setter(transform(data));
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
      setError(`Failed to fetch ${key}.`);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  const generateReport = useCallback(() => {
    setError(null);
    const params = `period=${period}&date=${date}`;
    fetchData('summary', `/api/reports/summary?${params}`, setSummary, normalizeReportSummary);
    fetchData('memberSavings', `/api/reports/member-savings?${params}`, setMemberSavings, normalizeMemberSavingsReport);
    fetchData('loanPortfolio', `/api/reports/loan-portfolio?${params}`, setLoanPortfolio, normalizeLoanPortfolio);
    fetchData('incomeStatement', `/api/reports/income-statement?${params}`, setIncomeStatement, normalizeIncomeStatement);
    fetchData('balanceSheet', `/api/reports/balance-sheet?${params}`, setBalanceSheet, normalizeBalanceSheet);
    fetchData('overdueLoans', `/api/reports/overdue-loans?${params}`, setOverdueLoans, normalizeOverdueLoans);
  }, [period, date, fetchData]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  // Chart data derived from summary
  const savingsVsLoansData = [
    { month: 'Selected Period', savings: summary?.totalSavings || 0, loans: summary?.loansDisbursed || 0 },
  ];
  const fundTrendData = [
    { month: 'Savings', balance: summary?.totalSavings || 0 },
    { month: 'Loans', balance: summary?.loansDisbursed || 0 },
    { month: 'Fund', balance: summary?.netFundBalance || 0 },
  ];
  const loanStatusData = loanPortfolio.rows.length
    ? loanPortfolio.rows.map((item) => ({ name: item.status, value: Number(item.count) || 0 }))
    : [{ name: 'No Data', value: 1 }];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Report Period</label>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === p.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reference Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div id="section-summary">
        <SectionHeader
          icon={BarChart3}
          title="Summary"
          onPrint={() => printSection('section-summary')}
        />
        {loading.summary ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Savings"
              value={formatCurrency(summary?.totalSavings)}
              icon={Wallet}
              color="indigo"
            />
            <SummaryCard
              title="Loans Disbursed"
              value={formatCurrency(summary?.loansDisbursed)}
              icon={Landmark}
              color="emerald"
            />
            <SummaryCard
              title="Repayments Collected"
              value={formatCurrency(summary?.repaymentsCollected)}
              icon={ArrowDownCircle}
              color="teal"
            />
            <SummaryCard
              title="Interest Earned"
              value={formatCurrency(summary?.interestEarned)}
              icon={TrendingUp}
              color="amber"
            />
            <SummaryCard
              title="Penalties Collected"
              value={formatCurrency(summary?.penaltiesCollected)}
              icon={AlertTriangle}
              color="rose"
            />
            <SummaryCard
              title="Net Fund Balance"
              value={formatCurrency(summary?.netFundBalance)}
              icon={DollarSign}
              color="violet"
            />
            <SummaryCard
              title="Member Count"
              value={summary ? summary.memberCount.toLocaleString() : '-'}
              icon={Users}
              color="sky"
            />
            <SummaryCard
              title="Active Loans"
              value={summary ? summary.activeLoans.toLocaleString() : '-'}
              icon={FileText}
              color="slate"
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings vs Loans Bar Chart */}
        <div id="section-chart-bar" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <SectionHeader icon={BarChart3} title="Savings vs Loans" />
          {loading.summary ? (
            <LoadingSpinner />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={savingsVsLoansData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="savings" fill="#6366f1" name="Savings" radius={[4, 4, 0, 0]} />
                <Bar dataKey="loans" fill="#10b981" name="Loans" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fund Balance Trend Line Chart */}
        <div id="section-chart-line" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <SectionHeader icon={TrendingUp} title="Financial Snapshot" />
          {loading.summary ? (
            <LoadingSpinner />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fundTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Loan Status Pie Chart */}
        <div id="section-chart-pie" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <SectionHeader icon={PieChartIcon} title="Loan Status Distribution" />
          {loading.loanPortfolio ? (
            <LoadingSpinner />
          ) : (
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={loanStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={110}
                    dataKey="value"
                  >
                    {loanStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Member Savings Report */}
      <div id="section-member-savings" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <SectionHeader
          icon={Users}
          title="Member Savings Report"
          onPrint={() => printSection('section-member-savings')}
        />
        {loading.memberSavings ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Member</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Deposits</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Withdrawals</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Net Savings</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(memberSavings) && memberSavings.length > 0 ? (
                  memberSavings.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800 font-medium">{row.memberName}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(row.deposits)}</td>
                      <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(row.withdrawals)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(row.netSavings)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {row.percentOfTotal != null ? `${Number(row.percentOfTotal).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No member savings data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loan Portfolio */}
      <div id="section-loan-portfolio" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <SectionHeader
          icon={Landmark}
          title="Loan Portfolio"
          onPrint={() => printSection('section-loan-portfolio')}
        />
        {loading.loanPortfolio ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Count</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">% of Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {loanPortfolio.rows.length > 0 ? (
                  loanPortfolio.rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.status === 'overdue'
                              ? 'bg-rose-50 text-rose-700'
                              : row.status === 'paid'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-800">{row.count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(row.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {row.percentOfPortfolio != null ? `${Number(row.percentOfPortfolio).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No loan portfolio data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Income Statement */}
      <div id="section-income-statement" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <SectionHeader
          icon={ArrowUpCircle}
          title="Income Statement"
          onPrint={() => printSection('section-income-statement')}
        />
        {loading.incomeStatement ? (
          <LoadingSpinner />
        ) : incomeStatement ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Interest Income</span>
              <span className="font-semibold text-slate-800">{formatCurrency(incomeStatement.interestIncome)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Penalty Income</span>
              <span className="font-semibold text-slate-800">{formatCurrency(incomeStatement.penaltyIncome)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Expenses</span>
              <span className="font-semibold text-slate-800">{formatCurrency(incomeStatement.expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-indigo-200 bg-indigo-50/50 rounded-lg px-3 mt-2">
              <span className="font-semibold text-indigo-800">Net Income</span>
              <span className="text-lg font-bold text-indigo-700">{formatCurrency(incomeStatement.netIncome)}</span>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-slate-400">No income statement data available</p>
        )}
      </div>

      {/* Balance Sheet */}
      <div id="section-balance-sheet" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <SectionHeader
          icon={DollarSign}
          title="Balance Sheet"
          onPrint={() => printSection('section-balance-sheet')}
        />
        {loading.balanceSheet ? (
          <LoadingSpinner />
        ) : balanceSheet ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Assets</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Outstanding Loans</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(balanceSheet.outstandingLoans)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Unpaid Penalties</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(balanceSheet.unpaidPenalties)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-emerald-50/50 rounded-lg px-3">
                  <span className="font-semibold text-emerald-800">Total Assets</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(balanceSheet.totalAssets)}
                  </span>
                </div>
              </div>
            </div>

            {/* Liabilities */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Liabilities</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Member Savings</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(balanceSheet.memberSavings)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-rose-50/50 rounded-lg px-3">
                  <span className="font-semibold text-rose-800">Total Liabilities</span>
                  <span className="font-bold text-rose-700">{formatCurrency(balanceSheet.totalLiabilities)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t-2 border-indigo-200">
                <div className="flex justify-between items-center bg-indigo-50 rounded-lg px-3 py-3">
                  <span className="font-semibold text-indigo-800">Fund Balance</span>
                  <span className="text-lg font-bold text-indigo-700">{formatCurrency(balanceSheet.fundBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-slate-400">No balance sheet data available</p>
        )}
      </div>

      {/* Overdue Loans */}
      <div id="section-overdue-loans" className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <SectionHeader
          icon={AlertTriangle}
          title="Overdue Loans"
          onPrint={() => printSection('section-overdue-loans')}
        />
        {loading.overdueLoans ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Member</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Loan Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Missed Payments</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Penalty Amount</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(overdueLoans) && overdueLoans.length > 0 ? (
                  overdueLoans.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800 font-medium">{row.memberName}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(row.loanAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            (row.missedPayments || 0) > 2
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {row.missedPayments} {row.missedPayments === 1 ? 'month' : 'months'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-600">{formatCurrency(row.penaltyAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No overdue loans
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Hint */}
      <div className="rounded-xl bg-slate-50 border border-dashed border-slate-300 p-4 flex items-center gap-3 print:hidden">
        <Download className="h-5 w-5 text-slate-400" />
        <p className="text-sm text-slate-500">
          Export to Excel/PDF coming soon. Use the Print button on each section to generate printable reports.
        </p>
      </div>
    </div>
  );
}
