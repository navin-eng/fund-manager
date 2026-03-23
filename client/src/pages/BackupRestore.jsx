import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  HardDrive,
  Landmark,
  PiggyBank,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { authFetch, readJsonResponse } from '../api';
import DateInput from '../components/DateInput';

const REPORT_PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'trimester', label: 'Trimester' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'yearly', label: 'Yearly' },
];

const EMPTY_EXPORT_FILTERS = {
  savingsMemberId: '',
  savingsDateFrom: '',
  savingsDateTo: '',
  loanStatus: 'all',
  reportDate: '',
};

function SummaryCard({ icon: Icon, label, value, helper, accent }) {
  return (
    <div className="glass-panel-strong rounded-[1.7rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
          {helper && <p className="mt-1 text-xs text-[var(--text-muted)]">{helper}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, disabled, icon: Icon, loading, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function getBackupKindMeta(kind) {
  if (kind === 'pre_restore') {
    return {
      label: 'Safety Copy',
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    };
  }

  if (kind === 'snapshot') {
    return {
      label: 'Server Snapshot',
      className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    };
  }

  return {
    label: 'Archive',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-NP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-NP', {
    dateStyle: 'medium',
  }).format(date);
}

export default function BackupRestore() {
  const [backupHistory, setBackupHistory] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [exportFilters, setExportFilters] = useState(EMPTY_EXPORT_FILTERS);

  const setLoadingState = useCallback((key, value) => {
    setLoading((current) => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    if (!message) return undefined;

    const timeoutId = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
  }, []);

  const fetchHistory = useCallback(async ({ silent = false } = {}) => {
    setLoadingState('history', true);

    try {
      const response = await authFetch('/api/backup/history');
      if (!response.ok) {
        const error = await readJsonResponse(response, { error: 'Failed to load backup history' });
        throw new Error(error.error || 'Failed to load backup history');
      }

      const data = await readJsonResponse(response, []);
      setBackupHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch backup history:', error);
      if (!silent) {
        showMessage('error', error.message || 'Failed to load backup history');
      }
    } finally {
      setLoadingState('history', false);
    }
  }, [setLoadingState, showMessage]);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await authFetch('/api/members?status=active');
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await readJsonResponse(response, []);
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch members for export filters:', error);
    }
  }, []);

  useEffect(() => {
    fetchHistory({ silent: true });
    fetchMembers();
  }, [fetchHistory, fetchMembers]);

  const backupStats = useMemo(() => {
    const totalStorage = backupHistory.reduce((sum, item) => sum + Number(item.size || 0), 0);
    const latestBackup = backupHistory[0] || null;
    const safetyCopies = backupHistory.filter((item) => item.kind === 'pre_restore').length;

    return {
      latestBackup,
      totalBackups: backupHistory.length,
      safetyCopies,
      totalStorage,
    };
  }, [backupHistory]);

  const downloadFile = useCallback(async (url, defaultFilename) => {
    const response = await authFetch(url);
    if (!response.ok) {
      const error = await readJsonResponse(response, { error: 'Download failed' });
      throw new Error(error.error || 'Download failed');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = defaultFilename;

    if (disposition) {
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, []);

  const handleDownloadBackup = async () => {
    setLoadingState('downloadBackup', true);

    try {
      await downloadFile('/api/backup', 'fund_manager_backup.db');
      showMessage('success', 'Live database backup downloaded successfully.');
    } catch (error) {
      showMessage('error', error.message || 'Failed to download backup');
    } finally {
      setLoadingState('downloadBackup', false);
    }
  };

  const handleAutoBackup = async () => {
    setLoadingState('autoBackup', true);

    try {
      const response = await authFetch('/api/backup/auto', { method: 'POST' });
      const data = await readJsonResponse(response, {});

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create server snapshot');
      }

      showMessage('success', `Server snapshot created: ${data.filename} (${data.size_formatted})`);
      fetchHistory({ silent: true });
    } catch (error) {
      showMessage('error', error.message || 'Failed to create server snapshot');
    } finally {
      setLoadingState('autoBackup', false);
    }
  };

  const handleDownloadHistoryBackup = async (filename) => {
    setLoadingState(`download_${filename}`, true);

    try {
      await downloadFile(`/api/backup/download/${encodeURIComponent(filename)}`, filename);
      showMessage('success', `${filename} downloaded.`);
    } catch (error) {
      showMessage('error', error.message || 'Failed to download backup');
    } finally {
      setLoadingState(`download_${filename}`, false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;

    setLoadingState(`delete_${backupToDelete}`, true);

    try {
      const response = await authFetch(`/api/backup/files/${encodeURIComponent(backupToDelete)}`, {
        method: 'DELETE',
      });
      const data = await readJsonResponse(response, {});

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete backup');
      }

      showMessage('success', `${backupToDelete} deleted successfully.`);
      setBackupToDelete(null);
      fetchHistory({ silent: true });
    } catch (error) {
      showMessage('error', error.message || 'Failed to delete backup');
    } finally {
      setLoadingState(`delete_${backupToDelete}`, false);
    }
  };

  const validateRestoreFile = (file) => {
    if (!file) return false;

    if (!file.name.toLowerCase().endsWith('.db')) {
      showMessage('error', 'Please select a valid .db backup file.');
      return false;
    }

    setRestoreFile(file);
    return true;
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    validateRestoreFile(event.dataTransfer.files[0]);
  };

  const handleFileSelect = (event) => {
    validateRestoreFile(event.target.files[0]);
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    setLoadingState('restore', true);

    try {
      const formData = new FormData();
      formData.append('backup', restoreFile);

      const response = await authFetch('/api/backup/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await readJsonResponse(response, {});

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Restore failed');
      }

      showMessage('success', data.message);
      setRestoreFile(null);
      fetchHistory({ silent: true });
    } catch (error) {
      showMessage('error', error.message || 'Failed to restore backup');
    } finally {
      setLoadingState('restore', false);
    }
  };

  const buildExportUrl = (type) => {
    const params = new URLSearchParams();

    if (type === 'savings') {
      if (exportFilters.savingsMemberId) params.set('member_id', exportFilters.savingsMemberId);
      if (exportFilters.savingsDateFrom) params.set('date_from', exportFilters.savingsDateFrom);
      if (exportFilters.savingsDateTo) params.set('date_to', exportFilters.savingsDateTo);
    }

    if (type === 'loans' && exportFilters.loanStatus !== 'all') {
      params.set('status', exportFilters.loanStatus);
    }

    if (type === 'report') {
      params.set('period', reportPeriod);
      if (exportFilters.reportDate) params.set('date', exportFilters.reportDate);
    }

    const query = params.toString();
    return query ? `/api/export/${type}?${query}` : `/api/export/${type}`;
  };

  const handleExport = async (type, label) => {
    setLoadingState(`export_${type}`, true);

    try {
      await downloadFile(buildExportUrl(type), `${type}.xlsx`);
      showMessage('success', `${label} exported successfully.`);
    } catch (error) {
      showMessage('error', error.message || `Failed to export ${label.toLowerCase()}`);
    } finally {
      setLoadingState(`export_${type}`, false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">Backup & Export</p>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Data Control Center</h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm text-[var(--text-muted)]">
              Keep live safety copies of the database, restore from trusted archives, and generate focused exports for savings, loans, and full reporting cycles.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ActionButton
              onClick={handleDownloadBackup}
              disabled={loading.downloadBackup}
              icon={Download}
              loading={loading.downloadBackup}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Download Live Backup
            </ActionButton>
            <ActionButton
              onClick={handleAutoBackup}
              disabled={loading.autoBackup}
              icon={HardDrive}
              loading={loading.autoBackup}
              className="border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              Create Server Snapshot
            </ActionButton>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            icon={Archive}
            label="Saved Backups"
            value={backupStats.totalBackups.toLocaleString()}
            helper="Snapshots currently stored on the server"
            accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
          />
          <SummaryCard
            icon={Clock}
            label="Latest Copy"
            value={backupStats.latestBackup ? formatDateOnly(backupStats.latestBackup.created_at) : 'No backups'}
            helper={backupStats.latestBackup ? formatDateTime(backupStats.latestBackup.created_at) : 'Create your first server snapshot'}
            accent="bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300"
          />
          <SummaryCard
            icon={ShieldAlert}
            label="Safety Copies"
            value={backupStats.safetyCopies.toLocaleString()}
            helper="Pre-restore backups preserved automatically"
            accent="bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
          />
          <SummaryCard
            icon={FileSpreadsheet}
            label="Storage Used"
            value={formatFileSize(backupStats.totalStorage)}
            helper="Total disk space used by backup history"
            accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
          />
        </div>
      </section>

      {message && (
        <div
          className={`glass-panel-strong flex items-center gap-3 rounded-[1.6rem] p-4 ${
            message.type === 'success'
              ? 'border-emerald-200 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-200 text-rose-700 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Backup Studio</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Choose between a direct download of the live database or a server-side snapshot that stays in backup history.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchHistory()}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <RefreshCw className={`h-4 w-4 ${loading.history ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.7rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Manual Download</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Live Database Copy</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Generate a one-time backup file from the current database and download it immediately to your device.
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Download className="h-5 w-5" />
                </div>
              </div>

              <ActionButton
                onClick={handleDownloadBackup}
                disabled={loading.downloadBackup}
                icon={Download}
                loading={loading.downloadBackup}
                className="mt-5 w-full bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Download Backup
              </ActionButton>
            </div>

            <div className="rounded-[1.7rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Server Snapshot</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Stored Backup Archive</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Save a backup directly on the server so it appears in history and can be downloaded or cleaned up later.
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <HardDrive className="h-5 w-5" />
                </div>
              </div>

              <ActionButton
                onClick={handleAutoBackup}
                disabled={loading.autoBackup}
                icon={HardDrive}
                loading={loading.autoBackup}
                className="mt-5 w-full border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Create Snapshot
              </ActionButton>
            </div>
          </div>
        </section>

        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Restore Backup</h2>
              <p className="text-sm text-[var(--text-muted)]">Replace the current database using a verified `.db` archive.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">High-impact action</p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Restoring replaces all current data. The system creates a safety copy just before the restore starts.
                </p>
              </div>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('restore-file-input')?.click()}
            className={`mt-4 rounded-[1.6rem] border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                : restoreFile
                ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10'
                : 'border-[var(--border-strong)] bg-[var(--surface-3)] hover:border-indigo-300 hover:bg-[var(--surface-hover)]'
            }`}
          >
            <input
              id="restore-file-input"
              type="file"
              accept=".db"
              onChange={handleFileSelect}
              className="hidden"
            />

            {restoreFile ? (
              <div className="space-y-2">
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{restoreFile.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{formatFileSize(restoreFile.size)} ready for validation and restore</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-[var(--text-faint)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Drop a `.db` backup file here or click to browse
                </p>
                <p className="text-xs text-[var(--text-faint)]">Only SQLite database backups are accepted.</p>
              </div>
            )}
          </div>

          {restoreFile && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <ActionButton
                onClick={() => setShowRestoreConfirm(true)}
                disabled={loading.restore}
                icon={Upload}
                loading={loading.restore}
                className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
              >
                Restore Now
              </ActionButton>
              <ActionButton
                onClick={() => setRestoreFile(null)}
                disabled={loading.restore}
                icon={Trash2}
                loading={false}
                className="border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Clear Selection
              </ActionButton>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Backup History</h2>
              <p className="text-sm text-[var(--text-muted)]">Review saved snapshots, download old copies, or remove files you no longer need.</p>
            </div>
            <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
              {backupStats.totalBackups} files
            </span>
          </div>

          {backupHistory.length === 0 ? (
            <div className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-12 text-center">
              <Archive className="mx-auto h-10 w-10 text-[var(--text-faint)]" />
              <p className="mt-3 text-base font-medium text-[var(--text-primary)]">No server backups yet</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Create a snapshot above to start building a backup timeline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup) => {
                const badge = getBackupKindMeta(backup.kind);

                return (
                  <div
                    key={backup.filename}
                    className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="rounded-full bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                            {backup.size_formatted || formatFileSize(backup.size)}
                          </span>
                        </div>
                        <p className="mt-3 truncate font-mono text-xs text-[var(--text-secondary)]">{backup.filename}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          Saved {formatDateTime(backup.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => handleDownloadHistoryBackup(backup.filename)}
                          disabled={loading[`download_${backup.filename}`]}
                          icon={Download}
                          loading={loading[`download_${backup.filename}`]}
                          className="border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        >
                          Download
                        </ActionButton>
                        <ActionButton
                          onClick={() => setBackupToDelete(backup.filename)}
                          disabled={loading[`delete_${backup.filename}`]}
                          icon={Trash2}
                          loading={loading[`delete_${backup.filename}`]}
                          className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Export Center</h2>
            <p className="text-sm text-[var(--text-muted)]">Generate focused spreadsheets instead of exporting everything blindly.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Directory Export</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Members Workbook</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Export the complete member directory with savings and active-loan totals.</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <ActionButton
                onClick={() => handleExport('members', 'Members')}
                disabled={loading.export_members}
                icon={FileSpreadsheet}
                loading={loading.export_members}
                className="mt-4 w-full bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Export Members
              </ActionButton>
            </div>

            <div className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Transaction Export</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Savings Ledger</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Filter by member and date range before exporting savings activity.</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <PiggyBank className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Member</span>
                  <select
                    value={exportFilters.savingsMemberId}
                    onChange={(event) => setExportFilters((current) => ({ ...current, savingsMemberId: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">All active members</option>
                    {members.map((member) => {
                      const memberKey = member.id || member._id;
                      return (
                        <option key={memberKey} value={memberKey}>
                          {member.name}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-[var(--text-muted)]">From</span>
                  <DateInput
                    value={exportFilters.savingsDateFrom}
                    onChange={(value) => setExportFilters((current) => ({ ...current, savingsDateFrom: value }))}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </label>
                <div className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">To</span>
                  <DateInput
                    value={exportFilters.savingsDateTo}
                    onChange={(value) => setExportFilters((current) => ({ ...current, savingsDateTo: value }))}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <ActionButton
                onClick={() => handleExport('savings', 'Savings')}
                disabled={loading.export_savings}
                icon={FileSpreadsheet}
                loading={loading.export_savings}
                className="mt-4 w-full border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Export Savings Ledger
              </ActionButton>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Portfolio Export</p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Loans</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Export all loans or focus on a single status group.</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                    <Landmark className="h-5 w-5" />
                  </div>
                </div>

                <select
                  value={exportFilters.loanStatus}
                  onChange={(event) => setExportFilters((current) => ({ ...current, loanStatus: event.target.value }))}
                  className="mt-4 w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>

                <ActionButton
                  onClick={() => handleExport('loans', 'Loans')}
                  disabled={loading.export_loans}
                  icon={FileSpreadsheet}
                  loading={loading.export_loans}
                  className="mt-4 w-full border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                >
                  Export Loans
                </ActionButton>
              </div>

              <div className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Workbook Export</p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Full Report</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Create a multi-sheet workbook anchored to the reporting window you choose.</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>

                <label className="mt-4 space-y-1.5">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Period</span>
                  <select
                    value={reportPeriod}
                    onChange={(event) => setReportPeriod(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  >
                    {REPORT_PERIODS.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-3 space-y-1.5">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Anchor Date</span>
                  <DateInput
                    value={exportFilters.reportDate}
                    onChange={(value) => setExportFilters((current) => ({ ...current, reportDate: value }))}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <ActionButton
                  onClick={() => handleExport('report', 'Full Report')}
                  disabled={loading.export_report}
                  icon={FileSpreadsheet}
                  loading={loading.export_report}
                  className="mt-4 w-full bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Export Full Report
                </ActionButton>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={handleRestore}
        title="Restore This Backup?"
        message={
          restoreFile
            ? `Restore from ${restoreFile.name}? This will replace all current data, and the system will create a safety copy first.`
            : 'Restore this backup?'
        }
        confirmLabel="Restore Backup"
        cancelLabel="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(backupToDelete)}
        onClose={() => setBackupToDelete(null)}
        onConfirm={handleDeleteBackup}
        title="Delete Backup File?"
        message={
          backupToDelete
            ? `Delete ${backupToDelete}? This removes the file from server history and cannot be undone.`
            : 'Delete this backup file?'
        }
        confirmLabel="Delete Backup"
        cancelLabel="Keep File"
        variant="warning"
      />
    </div>
  );
}
