import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { normalizeMember } from '../utils/apiTransforms';
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Loader2,
  Printer,
  PiggyBank,
  Landmark,
  ShieldAlert,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

export default function MemberDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMember();
  }, [id]);

  const fetchMember = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/members/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch member');
      }
      const data = await response.json();
      setMember(normalizeMember(data));
    } catch (error) {
      console.error('Failed to fetch member:', error);
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const { formatDate: localeFormatDate, formatCurrency: localeFormatCurrency } = useLocale();

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return localeFormatDate(dateStr);
  };

  const formatCurrency = (amount) => {
    if (amount == null) return localeFormatCurrency(0);
    return localeFormatCurrency(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-500 text-sm">Loading member details...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 font-medium mb-2">Member not found</p>
          <Link
            to="/members"
            className="text-indigo-600 hover:text-indigo-700 text-sm"
          >
            Back to members
          </Link>
        </div>
      </div>
    );
  }

  const savingsHistory = member.savingsHistory || [];
  const loans = member.loans || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/members"
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-4">
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-800">
                    {member.name}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {member.status || 'Active'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Member since {formatDate(member.joinedDate || member.createdAt)}
                </p>
              </div>
            </div>
          </div>
          <Link
            to={`/members/${id}/edit`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <Pencil className="w-4 h-4" />
            Edit Member
          </Link>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Phone
              </p>
              <p className="text-sm font-medium text-slate-800">
                {member.phone || '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 rounded-lg">
              <Mail className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Email
              </p>
              <p className="text-sm font-medium text-slate-800">
                {member.email || '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-lg">
              <MapPin className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Address
              </p>
              <p className="text-sm font-medium text-slate-800">
                {member.address || '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Joined Date
              </p>
              <p className="text-sm font-medium text-slate-800">
                {formatDate(member.joined_date || member.createdAt)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Emergency Contact
              </p>
              <p className="text-sm font-medium text-slate-800">
                {member.emergencyContact || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-indigo-50 rounded-lg">
                <PiggyBank className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm text-slate-500">Total Savings</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(member.totalSavings)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-500">Total Deposits</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(member.totalDeposits)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-red-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-slate-500">Total Withdrawals</p>
            </div>
            <p className="text-2xl font-bold text-red-500">
              {formatCurrency(member.totalWithdrawals)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-slate-500">Active Loans</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {member.activeLoans ?? 0}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            to={`/savings/new?member=${id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Make Deposit
          </Link>
          <Link
            to={`/loans/new?member=${id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Landmark className="w-4 h-4" />
            Apply for Loan
          </Link>
        </div>

        {/* Savings History */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Savings History
              </h2>
            </div>
          </div>
          {savingsHistory.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-400 text-sm">
                No savings transactions yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savingsHistory.map((txn, index) => (
                    <tr
                      key={txn._id || index}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-sm text-slate-600">
                        {formatDate(txn.date)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                            txn.type?.toLowerCase() === 'deposit'
                              ? 'text-emerald-600'
                              : 'text-red-500'
                          }`}
                        >
                          {txn.type?.toLowerCase() === 'deposit' ? (
                            <ArrowUpCircle className="w-4 h-4" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4" />
                          )}
                          {txn.type ? `${txn.type.charAt(0).toUpperCase()}${txn.type.slice(1)}` : 'Transaction'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm font-medium text-right">
                        <span
                          className={
                            txn.type?.toLowerCase() === 'deposit'
                              ? 'text-emerald-600'
                              : 'text-red-500'
                          }
                        >
                          {txn.type?.toLowerCase() === 'deposit' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-500">
                        {txn.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Loans Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Loans</h2>
          </div>
          {loans.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-400 text-sm">No loans found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Interest Rate
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Monthly Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.map((loan, index) => (
                    <tr
                      key={loan._id || index}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-sm font-medium text-slate-800 text-right">
                        {formatCurrency(loan.amount)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-600 text-center">
                        {loan.interestRate != null
                          ? `${loan.interestRate}%`
                          : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            loan.status?.toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : loan.status?.toLowerCase() === 'completed'
                              ? 'bg-blue-50 text-blue-700'
                              : loan.status?.toLowerCase() === 'overdue'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {loan.status || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-600">
                        {formatDate(loan.startDate)}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-medium text-slate-800 text-right">
                        {formatCurrency(loan.monthlyPayment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Member Statement */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Member Statement
              </h2>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Statement
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Print a full account statement for this member including all
            transactions and loan details.
          </p>
        </div>
      </div>
    </div>
  );
}
