import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  Landmark,
  BarChart3,
  Settings,
  Wallet,
  Menu,
  X,
  Database,
  Shield,
  LogOut,
  BookOpen,
  TrendingUp,
  Gift,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  // Fiscal year starts in July (month index 6) for Nepal-style FY
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

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const { user, logout } = useAuth();

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || (user && user.role === 'admin')
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-full flex-col bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
              <Wallet className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Fund Manager</h1>
              <p className="text-xs text-indigo-300/70">Financial Management</p>
            </div>
            <button
              className="ml-auto lg:hidden text-white/70 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href);

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-indigo-500/20 text-white shadow-sm'
                        : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-300' : ''}`} />
                  {item.name}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User & Fiscal Year Footer */}
          <div className="border-t border-white/10 px-4 py-3">
            {user && (
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-indigo-300/60 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-indigo-300/60 hover:text-white hover:bg-white/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-indigo-300/50 uppercase tracking-wider">Fiscal Year</p>
              <p className="mt-1 text-sm font-semibold text-indigo-200">
                {getCurrentFiscalYear()}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-semibold text-slate-800">{pageTitle}</h2>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
