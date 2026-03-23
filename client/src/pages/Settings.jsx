import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  DollarSign,
  Calendar,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  History,
  Globe,
  Mail,
  CreditCard,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { authFetch, readJsonResponse } from '../api';

const API_BASE = '';

const CURRENCIES = [
  { value: 'NPR', label: 'NPR - Nepalese Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

const MEETING_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// formatDate is now handled inside the component using useLocale

function getFiscalYearDisplay(startMonth, startDay, formatDate) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const sm = Number(startMonth) || 1;
  const sd = Number(startDay) || 1;

  let fyStartYear;
  if (currentMonth > sm || (currentMonth === sm && currentDay >= sd)) {
    fyStartYear = currentYear;
  } else {
    fyStartYear = currentYear - 1;
  }

  const startDate = new Date(fyStartYear, sm - 1, sd);
  const endDate = new Date(fyStartYear + 1, sm - 1, sd - 1);

  const fmt = (d) => formatDate(d);

  return `${fmt(startDate)} - ${fmt(endDate)}`;
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InputField({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

const selectClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

function getActivityAppearance(category) {
  switch (category) {
    case 'loan':
      return {
        label: 'Loans',
        icon: CreditCard,
        badge: 'bg-amber-50 text-amber-700 border border-amber-200',
        iconWrap: 'bg-amber-50 text-amber-700',
      };
    case 'savings':
    case 'funds':
      return {
        label: 'Funds',
        icon: Wallet,
        badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        iconWrap: 'bg-emerald-50 text-emerald-700',
      };
    case 'member':
      return {
        label: 'Members',
        icon: Users,
        badge: 'bg-sky-50 text-sky-700 border border-sky-200',
        iconWrap: 'bg-sky-50 text-sky-700',
      };
    case 'security':
      return {
        label: 'Security',
        icon: ShieldCheck,
        badge: 'bg-rose-50 text-rose-700 border border-rose-200',
        iconWrap: 'bg-rose-50 text-rose-700',
      };
    case 'settings':
      return {
        label: 'Settings',
        icon: SettingsIcon,
        badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
        iconWrap: 'bg-indigo-50 text-indigo-700',
      };
    default:
      return {
        label: 'System',
        icon: History,
        badge: 'bg-slate-100 text-slate-700 border border-slate-200',
        iconWrap: 'bg-slate-100 text-slate-700',
      };
  }
}

export default function Settings() {
  const {
    formatDate,
    formatCurrency,
    setCalendar,
    setLanguage,
    theme: currentTheme,
    setTheme,
  } = useLocale();

  const [settings, setSettings] = useState({
    organization_name: '',
    currency: 'NPR',
    default_interest_rate: '',
    default_penalty_rate: '',
    minimum_savings: '',
    meeting_frequency: 'monthly',
    fiscal_year_start: '07',
    fiscal_year_start_day: '01',
    calendar: 'AD',
    language: 'en',
    theme: currentTheme || 'light',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activityEntries, setActivityEntries] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await authFetch(`${API_BASE}/api/settings`);
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await readJsonResponse(res, {});
        setSettings({
          organization_name: data.organization_name || '',
          currency: data.currency || 'NPR',
          default_interest_rate: data.default_interest_rate ?? '',
          default_penalty_rate: data.default_penalty_rate ?? '',
          minimum_savings: data.minimum_savings ?? '',
          meeting_frequency: data.meeting_frequency || 'monthly',
          fiscal_year_start: data.fiscal_year_start ?? '07',
          fiscal_year_start_day: data.fiscal_year_start_day ?? '01',
          calendar: data.calendar || data.calendar_system || 'AD',
          language: data.language || 'en',
          theme: data.theme || currentTheme || 'light',
        });
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchActivityLog();
  }, []);

  async function fetchActivityLog() {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const res = await authFetch(`${API_BASE}/api/settings/activity-log?limit=60`);
      if (!res.ok) throw new Error('Failed to load activity log');
      const data = await readJsonResponse(res, {});
      setActivityEntries(Array.isArray(data) ? data : data.entries || []);
    } catch (err) {
      setActivityError(err.message);
    } finally {
      setActivityLoading(false);
    }
  }

  function handleChange(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await readJsonResponse(res, { message: 'Failed to save settings' });
        throw new Error(err.message || 'Failed to save settings');
      }
      if (settings.calendar) setCalendar(settings.calendar);
      if (settings.language) setLanguage(settings.language);
      if (settings.theme) setTheme(settings.theme);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      fetchActivityLog();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function formatDateTime(value) {
    if (!value) return 'Unknown time';

    const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const daysArray = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Status Message */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-4 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Settings */}
        <SectionCard icon={Building2} title="Organization Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Organization Name">
              <input
                type="text"
                value={settings.organization_name}
                onChange={(e) => handleChange('organization_name', e.target.value)}
                placeholder="Enter organization name"
                className={inputClasses}
              />
            </InputField>
            <InputField label="Currency">
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className={selectClasses}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </InputField>
          </div>
        </SectionCard>

        {/* Language & Calendar Settings */}
        <SectionCard icon={Globe} title="Language & Calendar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Language / भाषा">
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className={selectClasses}
              >
                <option value="en">English</option>
                <option value="ne">नेपाली (Nepali)</option>
              </select>
            </InputField>
            <InputField label="Calendar System / पात्रो प्रणाली">
              <select
                value={settings.calendar}
                onChange={(e) => handleChange('calendar', e.target.value)}
                className={selectClasses}
              >
                <option value="AD">AD - Gregorian (English)</option>
                <option value="BS">BS - बिक्रम सम्बत (Nepali)</option>
              </select>
            </InputField>
          </div>
          {settings.calendar === 'BS' && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-800">
                <strong>बिक्रम सम्बत (BS)</strong> पात्रो प्रणाली सक्रिय छ। सबै मितिहरू BS मा देखाइनेछ।
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Bikram Sambat calendar is active. All dates will be displayed in BS format.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard icon={SettingsIcon} title="Appearance">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Theme">
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className={selectClasses}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </InputField>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">
              Choose the interface theme used across the dashboard, navigation, and forms.
            </p>
          </div>
        </SectionCard>

        {/* Financial Settings */}
        <SectionCard icon={DollarSign} title="Financial Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Default Interest Rate (% per annum)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.default_interest_rate}
                onChange={(e) => handleChange('default_interest_rate', e.target.value)}
                placeholder="e.g. 12.00"
                className={inputClasses}
              />
            </InputField>
            <InputField label="Default Penalty Rate (% per month on overdue)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.default_penalty_rate}
                onChange={(e) => handleChange('default_penalty_rate', e.target.value)}
                placeholder="e.g. 2.00"
                className={inputClasses}
              />
            </InputField>
            <InputField label="Minimum Savings Amount">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.minimum_savings}
                  onChange={(e) => handleChange('minimum_savings', e.target.value)}
                  placeholder="0.00"
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </InputField>
            <InputField label="Meeting Frequency">
              <select
                value={settings.meeting_frequency}
                onChange={(e) => handleChange('meeting_frequency', e.target.value)}
                className={selectClasses}
              >
                {MEETING_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </InputField>
          </div>
        </SectionCard>

        {/* Fiscal Year Settings */}
        <SectionCard icon={Calendar} title="Fiscal Year Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Fiscal Year Start Month">
              <select
                value={Number(settings.fiscal_year_start)}
                onChange={(e) => handleChange('fiscal_year_start', String(e.target.value).padStart(2, '0'))}
                className={selectClasses}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </InputField>
            <InputField label="Fiscal Year Start Day">
              <select
                value={Number(settings.fiscal_year_start_day)}
                onChange={(e) => handleChange('fiscal_year_start_day', String(e.target.value).padStart(2, '0'))}
                className={selectClasses}
              >
                {daysArray.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </InputField>
          </div>
          <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-xs text-indigo-500 uppercase tracking-wider font-medium">Current Fiscal Year</p>
            <p className="mt-1 text-sm font-semibold text-indigo-800">
              {getFiscalYearDisplay(settings.fiscal_year_start, settings.fiscal_year_start_day, formatDate)}
            </p>
          </div>
        </SectionCard>

        {/* Email Settings */}
        <SectionCard icon={Mail} title="Email Settings (SMTP)">
          <p className="text-sm text-slate-500 mb-4">
            Configure SMTP to send welcome emails with login credentials when new members are added.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="SMTP Host">
              <input
                type="text"
                value={settings.smtp_host || ''}
                onChange={(e) => handleChange('smtp_host', e.target.value)}
                placeholder="smtp.gmail.com"
                className={inputClasses}
              />
            </InputField>
            <InputField label="SMTP Port">
              <input
                type="number"
                value={settings.smtp_port || ''}
                onChange={(e) => handleChange('smtp_port', e.target.value)}
                placeholder="587"
                className={inputClasses}
              />
            </InputField>
            <InputField label="SMTP Username / Email">
              <input
                type="text"
                value={settings.smtp_user || ''}
                onChange={(e) => handleChange('smtp_user', e.target.value)}
                placeholder="your-email@gmail.com"
                className={inputClasses}
              />
            </InputField>
            <InputField label="SMTP Password / App Password">
              <input
                type="password"
                value={settings.smtp_pass || ''}
                onChange={(e) => handleChange('smtp_pass', e.target.value)}
                placeholder="Enter SMTP password"
                className={inputClasses}
              />
            </InputField>
            <InputField label="From Email">
              <input
                type="text"
                value={settings.smtp_from || ''}
                onChange={(e) => handleChange('smtp_from', e.target.value)}
                placeholder="Fund Manager <noreply@example.com>"
                className={inputClasses}
              />
            </InputField>
          </div>
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-xs text-blue-700">
              For Gmail: use an App Password (not your regular password). Go to Google Account → Security → 2-Step Verification → App Passwords.
            </p>
          </div>
        </SectionCard>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <SectionCard icon={History} title="Activity Log">
        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-600">
            Review recent member, loan, savings, security, and settings activity from across the system in one place.
          </p>
        </div>

        {activityError && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {activityError}
          </div>
        )}

        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : activityEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No activity has been recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activityEntries.map((entry) => {
              const appearance = getActivityAppearance(entry.category);
              const Icon = appearance.icon;

              return (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${appearance.iconWrap}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">{entry.title}</h4>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${appearance.badge}`}>
                          {appearance.label}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-600">{entry.description || 'Recorded activity.'}</p>

                      <p className="mt-2 text-xs text-slate-500">
                        {entry.activity_date ? `${formatDate(entry.activity_date)} · ` : ''}
                        {formatDateTime(entry.created_at)}
                        {entry.actor_name ? ` · ${entry.actor_name}${entry.actor_role ? ` (${entry.actor_role})` : ''}` : ' · System record'}
                      </p>
                    </div>

                    {typeof entry.amount === 'number' ? (
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(entry.amount)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
