import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';
import { normalizeMember } from '../utils/apiTransforms';
import { authFetch, readJsonResponse } from '../api';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Inbox,
  Key,
  Landmark,
  Loader2,
  Pencil,
  Phone,
  PiggyBank,
  Plus,
  Search,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

function getMemberKey(member) {
  return member._id || member.id;
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  const adjustedStart = Math.max(1, end - 2);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

function SummaryCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass-panel-strong rounded-[1.6rem] p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function MemberList() {
  const { formatDate: localeFormatDate, formatCurrency: localeFormatCurrency } = useLocale();
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmMemberId, setConfirmMemberId] = useState(null);
  const [bulkCredResult, setBulkCredResult] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const handleGenerateAllCredentials = async () => {
    if (!confirm('Generate user accounts for all members who don\'t have one yet?')) return;
    setGeneratingAll(true);
    try {
      const res = await authFetch('/api/members/generate-all-credentials', { method: 'POST' });
      const data = await readJsonResponse(res, {});
      if (!res.ok) throw new Error(data.error || 'Failed to generate credentials');
      setBulkCredResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingAll(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/members');
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await readJsonResponse(response, []);
      setMembers(Array.isArray(data) ? data.map(normalizeMember).filter(Boolean) : []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const memberSearchBlob = [
        member.name,
        member.email,
        member.phone,
        member.member_no,
        member.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = memberSearchBlob.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' ||
        String(member.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE));
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalActive = members.filter((member) => String(member.status || '').toLowerCase() === 'active').length;
  const totalInactive = members.filter((member) => String(member.status || '').toLowerCase() === 'inactive').length;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const handleStatusUpdate = async (memberId, status) => {
    try {
      const response = await authFetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set member status to ${status}`);
      }

      setConfirmMemberId(null);
      fetchMembers();
    } catch (error) {
      console.error('Failed to update member status:', error);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    return localeFormatDate(value);
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '—';
    return localeFormatCurrency(Number(amount) || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">Member Directory</p>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Members</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-[var(--text-muted)]">
              Browse profiles, track savings and loan activity, and manage active or inactive members.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isStaff && (
              <button
                onClick={handleGenerateAllCredentials}
                disabled={generatingAll}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-60 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400 sm:w-auto"
              >
                <Key className="h-4 w-4" />
                {generatingAll ? 'Generating...' : 'Generate All Credentials'}
              </button>
            )}
            <Link
              to="/members/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </Link>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard
          icon={Users}
          label="Total"
          value={members.length.toLocaleString()}
          accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
        />
        <SummaryCard
          icon={UserCheck}
          label="Active"
          value={totalActive.toLocaleString()}
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        />
        <SummaryCard
          icon={UserX}
          label="Inactive"
          value={totalInactive.toLocaleString()}
          accent="bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
        />
      </div>

      {/* Search & Filter */}
      <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or member number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-11 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
          <span className="rounded-full bg-[var(--surface-3)] px-3 py-1">
            {filteredMembers.length} visible members
          </span>
          <span className="rounded-full bg-[var(--surface-3)] px-3 py-1">
            {paginatedMembers.length} on this page
          </span>
        </div>
      </section>

      {/* Member List */}
      <section className="overflow-hidden rounded-[2rem] glass-panel-strong">
        {loading ? (
          <div className="flex flex-col items-center justify-center px-6 py-20">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-[var(--text-muted)]">Loading members...</p>
          </div>
        ) : paginatedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-3)]">
              <Inbox className="h-8 w-8 text-[var(--text-faint)]" />
            </div>
            <p className="text-base font-medium text-[var(--text-primary)]">No members found</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {search || statusFilter !== 'All'
                ? 'Try changing your search or status filter.'
                : 'Add your first member to get started.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile Cards ── */}
            <div className="space-y-3 p-4 md:hidden">
              {paginatedMembers.map((member) => {
                const memberId = getMemberKey(member);
                const isConfirming = confirmMemberId === memberId;
                const isActive = String(member.status || '').toLowerCase() === 'active';

                return (
                  <article key={memberId} className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
                    {/* Top row: avatar + info + status */}
                    <div className="flex items-center gap-3">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="h-11 w-11 shrink-0 rounded-2xl border border-[var(--border-soft)] object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{member.name}</h2>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                            }`}
                          >
                            {member.status || 'Active'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          {member.member_no && <span>#{member.member_no}</span>}
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-1)] px-3 py-2">
                        <PiggyBank className="h-4 w-4 text-[var(--text-faint)]" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Savings</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(member.totalSavings)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-1)] px-3 py-2">
                        <Landmark className="h-4 w-4 text-[var(--text-faint)]" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Loans</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{member.activeLoans ?? 0} active</p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons - all in one row */}
                    {isConfirming ? (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-2.5">
                        <p className="flex-1 text-xs text-[var(--text-muted)]">
                          {isActive ? 'Deactivate?' : 'Reactivate?'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(memberId, isActive ? 'inactive' : 'active')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-medium text-white ${
                            isActive ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmMemberId(null)}
                          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          to={`/members/${memberId}`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                        <Link
                          to={`/members/${memberId}/edit`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmMemberId(memberId)}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:hover:bg-rose-500/25'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                          }`}
                        >
                          {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* ── Desktop Table ── */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--table-head-bg)]">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Member</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Phone</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Joined</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Savings</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Loans</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {paginatedMembers.map((member) => {
                    const memberId = getMemberKey(member);
                    const isConfirming = confirmMemberId === memberId;
                    const isActive = String(member.status || '').toLowerCase() === 'active';

                    return (
                      <tr key={memberId} className="transition-colors hover:bg-[var(--table-row-hover)]">
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={member.name}
                                className="h-10 w-10 rounded-full border border-[var(--border-soft)] object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                                {member.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)]">{member.name}</p>
                              <p className="truncate text-xs text-[var(--text-faint)]">
                                {member.member_no ? `#${member.member_no}` : member.email || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-[var(--text-secondary)]">{member.phone || '—'}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-[var(--text-muted)]">{formatDate(member.joinedDate || member.createdAt)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-medium text-[var(--text-primary)]">{formatCurrency(member.totalSavings)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-center text-sm text-[var(--text-secondary)]">{member.activeLoans ?? 0}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                            }`}
                          >
                            {member.status || 'Active'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {isConfirming ? (
                              <>
                                <span className="mr-1 text-xs text-[var(--text-muted)]">
                                  {isActive ? 'Deactivate?' : 'Activate?'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStatusUpdate(memberId, isActive ? 'inactive' : 'active')}
                                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-white ${
                                    isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                  }`}
                                >
                                  {isActive ? 'Yes' : 'Yes'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmMemberId(null)}
                                  className="inline-flex items-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <Link
                                  to={`/members/${memberId}`}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-400 dark:hover:bg-indigo-500/25"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </Link>
                                <Link
                                  to={`/members/${memberId}/edit`}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setConfirmMemberId(memberId)}
                                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                                    isActive
                                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:hover:bg-rose-500/25'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                                  }`}
                                >
                                  {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                  {isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-[var(--text-muted)]">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length} members
                </p>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <div className="hidden items-center gap-2 sm:flex">
                    {visiblePages.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`h-9 w-9 rounded-xl text-sm font-medium ${
                          currentPage === pageNumber
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <span className="text-sm font-medium text-[var(--text-muted)] sm:hidden">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Bulk Credentials Result Modal */}
      {bulkCredResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-800">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
                <Key className="h-5 w-5 text-violet-600" />
                {bulkCredResult.message}
              </h2>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-6">
              {bulkCredResult.generated?.length > 0 ? (
                <div className="space-y-3">
                  <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                    Save these credentials. Passwords cannot be retrieved later.
                  </p>
                  {bulkCredResult.generated.map((cred) => (
                    <div key={cred.member_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/50">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{cred.member_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Username: <code className="font-bold text-slate-700 dark:text-slate-200">{cred.username}</code>
                        {' / '}
                        Password: <code className="font-bold text-slate-700 dark:text-slate-200">{cred.password}</code>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-slate-500">All members already have user accounts.</p>
              )}
            </div>
            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <button
                onClick={() => setBulkCredResult(null)}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
