import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  RefreshCw,
  Archive,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  HardDrive,
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export default function BackupRestore() {
  const [backupHistory, setBackupHistory] = useState([]);
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('monthly');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/backup/history`);
      const data = await res.json();
      setBackupHistory(data);
    } catch (err) {
      console.error('Failed to fetch backup history:', err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const setLoadingState = (key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };

  // --- Download helper ---
  const downloadFile = async (url, defaultFilename) => {
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Download failed');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = defaultFilename;
    if (disposition) {
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      if (match) filename = match[1];
    }
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
  };

  // --- Backup Actions ---
  const handleDownloadBackup = async () => {
    setLoadingState('downloadBackup', true);
    try {
      await downloadFile(`${API_BASE}/api/backup`, 'backup.db');
      showMessage('success', 'Backup downloaded successfully.');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoadingState('downloadBackup', false);
    }
  };

  const handleAutoBackup = async () => {
    setLoadingState('autoBackup', true);
    try {
      const res = await fetch(`${API_BASE}/api/backup/auto`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `Auto-backup created: ${data.filename} (${data.size_formatted})`);
        fetchHistory();
      } else {
        showMessage('error', data.error || 'Failed to create auto-backup');
      }
    } catch (err) {
      showMessage('error', 'Failed to create auto-backup');
    } finally {
      setLoadingState('autoBackup', false);
    }
  };

  const handleDownloadHistoryBackup = async (filename) => {
    setLoadingState(`download_${filename}`, true);
    try {
      await downloadFile(`${API_BASE}/api/backup/download/${filename}`, filename);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoadingState(`download_${filename}`, false);
    }
  };

  // --- Restore Actions ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.db')) {
      setRestoreFile(file);
    } else {
      showMessage('error', 'Please upload a valid .db file');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRestoreFile(file);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setShowConfirm(false);
    setLoadingState('restore', true);

    try {
      const formData = new FormData();
      formData.append('backup', restoreFile);

      const res = await fetch(`${API_BASE}/api/backup/restore`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showMessage('success', data.message);
        setRestoreFile(null);
        fetchHistory();
      } else {
        showMessage('error', data.error || 'Restore failed');
      }
    } catch (err) {
      showMessage('error', 'Failed to restore backup');
    } finally {
      setLoadingState('restore', false);
    }
  };

  // --- Export Actions ---
  const handleExport = async (type, label) => {
    setLoadingState(`export_${type}`, true);
    try {
      let url = `${API_BASE}/api/export/${type}`;
      if (type === 'report') {
        url += `?period=${reportPeriod}`;
      }
      await downloadFile(url, `${type}.xlsx`);
      showMessage('success', `${label} exported successfully.`);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoadingState(`export_${type}`, false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Database className="w-7 h-7 text-indigo-600" />
          Backup & Data Management
        </h1>
        <p className="text-slate-500 mt-1">
          Manage database backups, restore data, and export reports.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Backup Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Archive className="w-5 h-5 text-indigo-600" />
            Create Backup
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Download a copy of the database or save an auto-backup on the server.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleDownloadBackup}
              disabled={loading.downloadBackup}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading.downloadBackup ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Backup
            </button>
            <button
              onClick={handleAutoBackup}
              disabled={loading.autoBackup}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading.autoBackup ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <HardDrive className="w-4 h-4" />
              )}
              Create Auto-Backup
            </button>
          </div>
          {backupHistory.length > 0 && (
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last backup: {new Date(backupHistory[0].created_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Restore Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-indigo-600" />
            Restore Backup
          </h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Restoring will replace <strong>ALL</strong> current data. A pre-restore backup will be created automatically.
              </p>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50'
                : restoreFile
                ? 'border-green-300 bg-green-50'
                : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
            }`}
            onClick={() => document.getElementById('restore-file-input').click()}
          >
            <input
              id="restore-file-input"
              type="file"
              accept=".db"
              onChange={handleFileSelect}
              className="hidden"
            />
            {restoreFile ? (
              <div className="space-y-1">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium text-green-700">{restoreFile.name}</p>
                <p className="text-xs text-green-600">
                  {(restoreFile.size / 1024).toFixed(1)} KB - Ready to restore
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600">
                  Drag & drop a <strong>.db</strong> file here, or click to browse
                </p>
                <p className="text-xs text-slate-400">Only .db database files are accepted</p>
              </div>
            )}
          </div>

          {restoreFile && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={loading.restore}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading.restore ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Restore Now
              </button>
              <button
                onClick={() => setRestoreFile(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Confirm Restore</h3>
            </div>
            <p className="text-slate-600 mb-2">
              Are you sure you want to restore from <strong>{restoreFile?.name}</strong>?
            </p>
            <p className="text-sm text-red-600 mb-6">
              This will permanently replace all current data. A pre-restore backup will be saved automatically.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Backup History
          </h2>
          <button
            onClick={fetchHistory}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {backupHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Archive className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No backups found. Create your first backup above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-medium text-slate-600">Filename</th>
                  <th className="text-left py-3 px-3 font-medium text-slate-600">Date</th>
                  <th className="text-left py-3 px-3 font-medium text-slate-600">Time</th>
                  <th className="text-left py-3 px-3 font-medium text-slate-600">Size</th>
                  <th className="text-right py-3 px-3 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {backupHistory.map((backup) => (
                  <tr key={backup.filename} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">{backup.filename}</td>
                    <td className="py-3 px-3 text-slate-600">{backup.date}</td>
                    <td className="py-3 px-3 text-slate-600">{backup.time}</td>
                    <td className="py-3 px-3 text-slate-600">{backup.size_formatted}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDownloadHistoryBackup(backup.filename)}
                        disabled={loading[`download_${backup.filename}`]}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        {loading[`download_${backup.filename}`] ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Data Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          Export Data
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Export data to Excel spreadsheets for offline review and record keeping.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => handleExport('members', 'Members')}
            disabled={loading.export_members}
            className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.export_members ? (
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-6 h-6 text-indigo-500" />
            )}
            <span className="text-sm font-medium text-slate-700">Export Members</span>
            <span className="text-xs text-slate-400">All member data</span>
          </button>

          <button
            onClick={() => handleExport('savings', 'Savings')}
            disabled={loading.export_savings}
            className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.export_savings ? (
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-6 h-6 text-green-500" />
            )}
            <span className="text-sm font-medium text-slate-700">Export Savings</span>
            <span className="text-xs text-slate-400">All transactions</span>
          </button>

          <button
            onClick={() => handleExport('loans', 'Loans')}
            disabled={loading.export_loans}
            className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.export_loans ? (
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            )}
            <span className="text-sm font-medium text-slate-700">Export Loans</span>
            <span className="text-xs text-slate-400">All loan data</span>
          </button>

          <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1 mb-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="trimester">Trimester</option>
              <option value="semi-annual">Semi-Annual</option>
              <option value="yearly">Yearly</option>
            </select>
            <button
              onClick={() => handleExport('report', 'Full Report')}
              disabled={loading.export_report}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading.export_report ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Full Report
            </button>
            <span className="text-xs text-slate-400">Multi-sheet Excel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
