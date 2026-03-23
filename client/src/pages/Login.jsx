import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Globe, LogIn, Loader2, Moon, ShieldCheck, SunMedium } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, language, setLanguage, theme, setTheme } = useLocale();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'np' : 'en');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-purple-300/10 blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo Area */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">{t('auth.fundManager')}</span>
            </div>
          </div>

          {/* Center Content */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              {language === 'np' ? 'तपाईंको कोषको' : 'Manage Your'}
              <br />
              <span className="bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
                {language === 'np' ? 'व्यवस्थापन गर्नुहोस्' : 'Community Fund'}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-indigo-100/80">
              {language === 'np'
                ? 'बचत, ऋण, र सदस्य खाताहरू एकै ठाउँबाट व्यवस्थापन गर्नुहोस्।'
                : 'Track savings, manage loans, and oversee member accounts all in one place.'}
            </p>

            {/* Feature pills */}
            <div className="mt-8 flex flex-wrap gap-3">
              {(language === 'np'
                ? ['बचत ट्र्याकिङ', 'ऋण व्यवस्थापन', 'सदस्य खाता', 'रिपोर्ट']
                : ['Savings Tracking', 'Loan Management', 'Member Accounts', 'Reports']
              ).map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-sm text-indigo-200/60">{t('auth.communitySystem')}</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 flex-col bg-slate-50 dark:bg-slate-900">
        {/* Top Bar with Language Toggle */}
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:invisible">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800 dark:text-white">{t('auth.fundManager')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? t('layout.lightMode') : t('layout.darkMode')}
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-700"
            >
              <Globe className="h-4 w-4" />
              {language === 'en' ? 'नेपाली' : 'English'}
            </button>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex flex-1 items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-[420px]">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('auth.welcome')}
              </h2>
              <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                {t('auth.signInToContinue')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">!</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('auth.username')}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400"
                  placeholder={language === 'np' ? 'प्रयोगकर्ता नाम लेख्नुहोस्' : 'Enter your username'}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400"
                    placeholder={language === 'np' ? 'पासवर्ड लेख्नुहोस्' : 'Enter your password'}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-indigo-500/10"
              >
                {/* Hover shimmer effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    {t('auth.login')}
                  </>
                )}
              </button>
            </form>

            {/* Bottom hint visible on mobile */}
            <p className="mt-8 text-center text-sm text-slate-400 lg:hidden dark:text-slate-500">
              {t('auth.communitySystem')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center sm:px-10">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            {language === 'np'
              ? 'सामुदायिक बचत कोष व्यवस्थापन प्रणाली द्वारा संचालित'
              : 'Powered by Community Savings Fund Management System'}
          </p>
        </div>
      </div>
    </div>
  );
}
