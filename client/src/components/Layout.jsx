import { useEffect, useId, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  Database,
  Gift,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  Settings,
  Shield,
  SunMedium,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const mobilePrimaryHrefs = ['/', '/members', '/savings', '/loans'];

function getCurrentFiscalYear() {
  const now = new Date();
  const month = now.getMonth();
  const startYear = month >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

function getPageTitle(pathname, t, pageTitles) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.match(/^\/members\/\d+\/edit$/)) return t('page.editMember');
  if (pathname.match(/^\/members\/\d+$/)) return t('page.memberDetail');
  if (pathname.match(/^\/loans\/\d+$/)) return t('page.loanDetail');
  return t('layout.fundManager');
}

function isRouteActive(pathname, href) {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

function buildNavigationSections(items) {
  const sectionOrder = ['Workspace', 'Accounting', 'Control'];

  return sectionOrder
    .map((label) => ({
      label,
      items: items.filter((item) => item.section === label),
    }))
    .filter((section) => section.items.length > 0);
}

function getUserInitials(name) {
  const normalizedName = String(name || '').trim();

  if (!normalizedName) return 'FM';

  return normalizedName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function Layout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const drawerId = useId();
  const { user, logout } = useAuth();
  const { theme, setTheme, t } = useLocale();

  const navigation = useMemo(() => [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard, section: 'Workspace', description: 'Overview, balances, and live fund signals' },
    { name: t('nav.members'), href: '/members', icon: Users, section: 'Workspace', staffOnly: true, description: 'Profiles, savings activity, and member access' },
    { name: t('nav.savings'), href: '/savings', icon: PiggyBank, section: 'Workspace', description: 'Deposits, withdrawals, and transaction review' },
    { name: t('nav.loans'), href: '/loans', icon: Landmark, section: 'Workspace', description: 'Borrowing pipeline, repayment status, and balances' },
    { name: t('nav.fundLedger'), href: '/fund-ledger', icon: BookOpen, section: 'Accounting', staffOnly: true, description: 'Fund entries, reconciliations, and adjustments' },
    { name: t('nav.income'), href: '/income', icon: TrendingUp, section: 'Accounting', staffOnly: true, description: 'Income periods and fund performance windows' },
    { name: t('nav.distributions'), href: '/distributions', icon: Gift, section: 'Accounting', staffOnly: true, description: 'Distribution cycles and member allocations' },
    { name: t('nav.reserveFund'), href: '/reserve', icon: Lock, section: 'Accounting', staffOnly: true, description: 'Reserve planning, protection, and reserve history' },
    { name: t('nav.reports'), href: '/reports', icon: BarChart3, section: 'Accounting', staffOnly: true, description: 'Cross-fund summaries and printable analysis' },
    { name: t('nav.backup'), href: '/backup', icon: Database, section: 'Control', staffOnly: true, description: 'Backups, restores, and export operations' },
    { name: t('nav.settings'), href: '/settings', icon: Settings, section: 'Control', staffOnly: true, description: 'System preferences, branding, and behavior' },
    { name: t('nav.users'), href: '/users', icon: Shield, adminOnly: true, section: 'Control', description: 'Roles, permissions, and account oversight' },
  ], [t]);

  const pageTitles = useMemo(() => ({
    '/': t('page.dashboard'),
    '/members': t('page.members'),
    '/members/new': t('page.addMember'),
    '/savings': t('page.savings'),
    '/savings/new': t('page.newDeposit'),
    '/loans': t('page.loans'),
    '/loans/new': t('page.newLoan'),
    '/fund-ledger': t('page.fundLedger'),
    '/income': t('page.incomePeriods'),
    '/distributions': t('page.incomeDistribution'),
    '/reserve': t('page.reserveFund'),
    '/reports': t('page.reports'),
    '/settings': t('page.settings'),
    '/backup': t('page.backupExport'),
    '/users': t('page.userManagement'),
  }), [t]);

  const pageTitle = getPageTitle(location.pathname, t, pageTitles);

  const filteredNavigation = navigation.filter((item) => {
    if (item.adminOnly && (!user || user.role !== 'admin')) return false;
    if (item.staffOnly && user && user.role === 'member') return false;
    return true;
  });
  const navigationSections = useMemo(
    () => buildNavigationSections(filteredNavigation),
    [filteredNavigation]
  );
  const mobilePrimaryNavigation = filteredNavigation.filter((item) =>
    mobilePrimaryHrefs.includes(item.href)
  );
  const hasSecondaryRouteActive = filteredNavigation.some(
    (item) => !mobilePrimaryHrefs.includes(item.href) && isRouteActive(location.pathname, item.href)
  );
  const activeNavItem = filteredNavigation.find((item) => isRouteActive(location.pathname, item.href));
  const fiscalYear = getCurrentFiscalYear();
  const userInitials = getUserInitials(user?.name);

  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sheetOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSheetOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sheetOpen]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const themeToggleLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <aside
        className={`hidden h-screen shrink-0 p-3 transition-[width] duration-300 ease-in-out lg:flex ${
          sidebarCollapsed ? 'w-[6.5rem]' : 'w-[21rem]'
        }`}
      >
        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2.25rem] border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,255,255,0.42))] shadow-[0_30px_80px_-36px_rgba(15,23,42,0.42)] backdrop-blur-[22px] backdrop-saturate-150 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.72))]">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-36 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2),transparent_72%)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.18),transparent_68%)] blur-3xl" />

          <div className="relative shrink-0 p-3">
            <div className={`relative overflow-hidden rounded-[1.85rem] border border-white/20 bg-[linear-gradient(145deg,rgba(15,23,42,0.96)_0%,rgba(37,99,235,0.92)_56%,rgba(8,145,178,0.82)_100%)] text-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.85)] ${sidebarCollapsed ? 'px-2.5 py-3' : 'p-4'}`}>
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-full bg-cyan-300/10 blur-2xl" />

              {sidebarCollapsed ? (
                <div className="relative flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-white/15 ring-1 ring-white/20 backdrop-blur">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-white/10 text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/16 hover:text-white"
                    aria-label="Expand sidebar"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.35rem] bg-white/15 ring-1 ring-white/20 backdrop-blur">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/65">
                          {activeNavItem?.section || 'Workspace'}
                        </p>
                        <h1 className="truncate text-lg font-semibold text-white">
                          {t('layout.fundManager')}
                        </h1>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-white/10 text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/16 hover:text-white"
                      aria-label="Collapse sidebar"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="relative mt-4 text-sm leading-6 text-white/72">
                    {activeNavItem?.description || t('layout.financialManagement')}
                  </p>

                  <div className="relative mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-medium text-white/92 ring-1 ring-white/10">
                      {pageTitle}
                    </span>
                    <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-medium text-white/75 ring-1 ring-white/10">
                      {fiscalYear}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <nav
            aria-label="Sidebar navigation"
            className={`sidebar-scroll relative flex-1 overflow-y-auto ${sidebarCollapsed ? 'px-2 pb-3' : 'px-3 pb-4'}`}
          >
            {sidebarCollapsed ? (
              <div className="space-y-3">
                {navigationSections.map((section) => (
                  <div
                    key={section.label}
                    className="rounded-[1.5rem] border border-white/35 bg-white/25 px-2 py-3 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {section.items.map((item) => {
                        const isActive = isRouteActive(location.pathname, item.href);

                        return (
                          <NavLink
                            key={item.name}
                            to={item.href}
                            title={`${item.name} - ${item.description}`}
                            className={`group relative flex h-11 w-11 items-center justify-center rounded-[1.15rem] transition-all ${
                              isActive
                                ? 'bg-slate-900 text-white shadow-[0_16px_30px_-22px_rgba(15,23,42,0.85)] dark:bg-white/95 dark:text-slate-950'
                                : 'text-slate-600 hover:bg-white/75 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                            }`}
                          >
                            <item.icon className="h-5 w-5" />
                            {isActive && (
                              <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-cyan-300 dark:bg-sky-400" />
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {navigationSections.map((section) => (
                  <div
                    key={section.label}
                    className="rounded-[1.65rem] border border-white/40 bg-white/28 p-3 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        {section.label}
                      </p>
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        {section.items.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {section.items.map((item) => {
                        const isActive = isRouteActive(location.pathname, item.href);

                        return (
                          <NavLink
                            key={item.name}
                            to={item.href}
                            className={`group relative flex items-center gap-3 overflow-hidden rounded-[1.3rem] px-3 py-3 transition-all duration-200 ${
                              isActive
                                ? 'bg-slate-900 text-white shadow-[0_20px_35px_-24px_rgba(15,23,42,0.9)] dark:bg-white/95 dark:text-slate-950'
                                : 'text-slate-700 hover:bg-white/72 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
                            }`}
                          >
                            {isActive && (
                              <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-cyan-300 dark:bg-sky-400" aria-hidden="true" />
                            )}

                            <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.05rem] transition-colors ${
                              isActive
                                ? 'bg-white/12 text-white ring-1 ring-white/15 dark:bg-slate-900/8 dark:text-slate-950 dark:ring-slate-900/10'
                                : 'bg-white/80 text-slate-600 group-hover:bg-white group-hover:text-slate-950 dark:bg-white/8 dark:text-slate-300 dark:group-hover:bg-white/12 dark:group-hover:text-white'
                            }`}>
                              <item.icon className="h-5 w-5" />
                            </span>

                            <span className="relative min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{item.name}</span>
                              <span className={`mt-0.5 block truncate text-[11px] ${
                                isActive
                                  ? 'text-white/68 dark:text-slate-500'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {item.description}
                              </span>
                            </span>

                            <span className={`relative h-2 w-2 rounded-full transition-all ${
                              isActive
                                ? 'bg-cyan-300 dark:bg-sky-400'
                                : 'bg-slate-300 opacity-0 group-hover:opacity-100 dark:bg-slate-600'
                            }`} />
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </nav>

          <div className={`relative shrink-0 ${sidebarCollapsed ? 'p-2 pt-1' : 'p-3 pt-1'}`}>
            {sidebarCollapsed ? (
              <div className="rounded-[1.6rem] border border-white/35 bg-white/25 px-2 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[1.15rem] text-slate-600 transition-colors hover:bg-white/75 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={themeToggleLabel}
                    title={themeToggleLabel}
                  >
                    {theme === 'dark' ? (
                      <SunMedium className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </button>
                  {user && (
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[1.15rem] text-slate-600 transition-colors hover:bg-white/75 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Log out"
                      title="Log out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0.34))] p-4 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.72))]">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-slate-900 text-sm font-semibold text-white shadow-sm dark:bg-white dark:text-slate-900">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {user?.name || t('layout.fundManager')}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {user && (
                        <span className="rounded-full bg-white/70 px-2.5 py-0.5 capitalize dark:bg-white/10">
                          {user.role}
                        </span>
                      )}
                      <span className="rounded-full bg-white/70 px-2.5 py-0.5 dark:bg-white/10">
                        {fiscalYear}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/55 bg-white/72 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12 dark:hover:text-white"
                  >
                    {theme === 'dark' ? (
                      <SunMedium className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    {theme === 'dark' ? t('layout.lightMode') : t('layout.darkMode')}
                  </button>

                  {user && (
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/55 bg-white/72 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12 dark:hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('layout.logOut')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {sheetOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSheetOpen(false)}
          aria-label="Close navigation sheet"
        />
      )}


      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 lg:hidden">
        <div
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${drawerId}-title`}
          className={`glass-sheet pointer-events-auto mx-auto flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] transition-transform duration-300 ${
            sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%+1.5rem)]'
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="flex flex-col items-center gap-2 px-6 pb-3 pt-4"
            aria-label="Close sections sheet"
          >
            <span className="h-1.5 w-14 rounded-full bg-slate-300/80 dark:bg-slate-700/80" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              {t('layout.slideToClose')}
            </span>
          </button>

          <div className="flex items-start justify-between gap-4 px-6 pb-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {t('layout.navigation')}
              </p>
              <h2 id={`${drawerId}-title`} className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {t('layout.allSections')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="glass-chip inline-flex h-10 w-10 items-center justify-center rounded-[1rem] text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:text-white"
              aria-label="Close sections sheet"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="sidebar-scroll flex-1 overflow-y-auto px-4 pb-4">
            <nav aria-label="Mobile navigation" className="grid gap-2">
              {filteredNavigation.map((item) => {
                const isActive = isRouteActive(location.pathname, item.href);

                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={`flex items-center gap-3 rounded-[1.35rem] px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-700 hover:bg-white/55 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
                    />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="glass-chip inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 dark:hover:text-white"
              >
                {theme === 'dark' ? (
                  <SunMedium className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {theme === 'dark' ? t('layout.lightMode') : t('layout.darkMode')}
              </button>
              <button
                type="button"
                onClick={logout}
                className="glass-chip inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {t('layout.logOut')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 px-4 pt-3 sm:px-6 sm:pt-4">
          <div className="glass-header flex items-center justify-between gap-4 rounded-[1.75rem] px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {t('layout.fundManager')}
              </p>
              <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
                {pageTitle}
              </h2>
            </div>

            <div className="glass-panel hidden rounded-[1.25rem] px-4 py-2 text-right sm:block">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('layout.fiscalYear')}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {getCurrentFiscalYear()}
              </p>
            </div>
          </div>
        </header>

        <main className="app-main-scroll flex-1 overflow-y-auto px-4 pb-36 pt-4 sm:px-6 sm:pb-40 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Quick navigation"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 lg:hidden"
      >
        <div className="glass-bottom-nav pointer-events-auto flex items-center gap-0.5 rounded-full px-1.5 py-2">
          {mobilePrimaryNavigation.map((item) => {
            const isActive = isRouteActive(location.pathname, item.href);

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-2 text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-controls={drawerId}
            aria-expanded={sheetOpen}
            className={`flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-2 text-[11px] font-medium transition-all ${
              sheetOpen || hasSecondaryRouteActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
          >
            <Menu className="h-4 w-4" />
            <span className="truncate">{t('nav.more')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
