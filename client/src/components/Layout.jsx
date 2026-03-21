import { useEffect, useId, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronUp,
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

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Savings', href: '/savings', icon: PiggyBank },
  { name: 'Loans', href: '/loans', icon: Landmark },
  { name: 'Fund Ledger', href: '/fund-ledger', icon: BookOpen },
  { name: 'Income', href: '/income', icon: TrendingUp },
  { name: 'Distributions', href: '/distributions', icon: Gift },
  { name: 'Reserve Fund', href: '/reserve', icon: Lock },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Backup & Export', href: '/backup', icon: Database },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'User Management', href: '/users', icon: Shield, adminOnly: true },
];

const mobilePrimaryHrefs = ['/', '/members', '/savings', '/loans'];

const pageTitles = {
  '/': 'Dashboard',
  '/members': 'Members',
  '/members/new': 'Add Member',
  '/savings': 'Savings',
  '/savings/new': 'New Deposit',
  '/loans': 'Loans',
  '/loans/new': 'New Loan',
  '/fund-ledger': 'Fund Ledger',
  '/income': 'Income Periods',
  '/distributions': 'Income Distribution',
  '/reserve': 'Reserve Fund',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/backup': 'Backup & Export',
  '/users': 'User Management',
};

function getCurrentFiscalYear() {
  const now = new Date();
  const month = now.getMonth();
  const startYear = month >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

function getPageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.match(/^\/members\/\d+\/edit$/)) return 'Edit Member';
  if (pathname.match(/^\/members\/\d+$/)) return 'Member Detail';
  if (pathname.match(/^\/loans\/\d+$/)) return 'Loan Detail';
  return 'Fund Manager';
}

function isRouteActive(pathname, href) {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Layout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const drawerId = useId();
  const pageTitle = getPageTitle(location.pathname);
  const { user, logout } = useAuth();
  const { theme, setTheme } = useLocale();

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || (user && user.role === 'admin')
  );
  const mobilePrimaryNavigation = filteredNavigation.filter((item) =>
    mobilePrimaryHrefs.includes(item.href)
  );
  const hasSecondaryRouteActive = filteredNavigation.some(
    (item) => !mobilePrimaryHrefs.includes(item.href) && isRouteActive(location.pathname, item.href)
  );

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
          sidebarCollapsed ? 'w-[5.5rem]' : 'w-[19.5rem]'
        }`}
      >
        <div className="glass-panel-strong flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2rem]">
          <div className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.35rem] bg-indigo-600 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Fund Manager
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Financial Management
                  </p>
                </div>
              )}
            </div>
          </div>

          <nav
            aria-label="Sidebar navigation"
            className="sidebar-scroll flex-1 space-y-2 overflow-y-auto px-2 py-5"
          >
            {filteredNavigation.map((item) => {
              const isActive = isRouteActive(location.pathname, item.href);

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-[1.35rem] py-3 text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-4'
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-700 hover:bg-white/55 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
                  />
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-white/80" aria-hidden="true" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-slate-200 px-2 py-4 dark:border-slate-800">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-3">
                {user && (
                  <button
                    type="button"
                    onClick={logout}
                    className="glass-chip inline-flex h-10 w-10 items-center justify-center rounded-[1rem] text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:text-white"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="glass-chip inline-flex h-10 w-10 items-center justify-center rounded-[1rem] text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:text-white"
                  aria-label={themeToggleLabel}
                  title={themeToggleLabel}
                >
                  {theme === 'dark' ? (
                    <SunMedium className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="glass-panel-soft rounded-[1.5rem] p-4">
                {user && (
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {user.name}
                      </p>
                      <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                        {user.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={logout}
                      className="glass-chip inline-flex h-10 w-10 items-center justify-center rounded-[1rem] text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:text-white"
                      aria-label="Log out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="glass-panel flex items-center justify-between rounded-[1.3rem] px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                      Fiscal Year
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {getCurrentFiscalYear()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="glass-chip inline-flex h-10 w-10 items-center justify-center rounded-[1rem] text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-300 dark:hover:text-white"
                    aria-label={themeToggleLabel}
                  >
                    {theme === 'dark' ? (
                      <SunMedium className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[1.25rem] px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-white/55 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
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
              Slide Down To Close
            </span>
          </button>

          <div className="flex items-start justify-between gap-4 px-6 pb-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                Navigation
              </p>
              <h2 id={`${drawerId}-title`} className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                All Sections
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
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                type="button"
                onClick={logout}
                className="glass-chip inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Log Out
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
                Fund Manager
              </p>
              <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
                {pageTitle}
              </h2>
            </div>

            <div className="glass-panel hidden rounded-[1.25rem] px-4 py-2 text-right sm:block">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Fiscal Year
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
            <span className="truncate">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
