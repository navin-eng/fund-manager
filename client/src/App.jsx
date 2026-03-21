import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MemberList = lazy(() => import('./pages/MemberList'));
const MemberForm = lazy(() => import('./pages/MemberForm'));
const MemberDetail = lazy(() => import('./pages/MemberDetail'));
const SavingsList = lazy(() => import('./pages/SavingsList'));
const SavingsForm = lazy(() => import('./pages/SavingsForm'));
const BulkSavingsForm = lazy(() => import('./pages/BulkSavingsForm'));
const LoanList = lazy(() => import('./pages/LoanList'));
const LoanForm = lazy(() => import('./pages/LoanForm'));
const LoanDetail = lazy(() => import('./pages/LoanDetail'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const FundLedger = lazy(() => import('./pages/FundLedger'));
const IncomePeriods = lazy(() => import('./pages/IncomePeriods'));
const Distributions = lazy(() => import('./pages/Distributions'));
const ReserveFund = lazy(() => import('./pages/ReserveFund'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/members" element={<MemberList />} />
              <Route path="/members/new" element={<MemberForm />} />
              <Route path="/members/:id" element={<MemberDetail />} />
              <Route path="/members/:id/edit" element={<MemberForm />} />
              <Route path="/savings" element={<SavingsList />} />
              <Route path="/savings/new" element={<SavingsForm />} />
              <Route path="/savings/bulk" element={<BulkSavingsForm />} />
              <Route path="/loans" element={<LoanList />} />
              <Route path="/loans/new" element={<LoanForm />} />
              <Route path="/loans/:id" element={<LoanDetail />} />
              <Route path="/fund-ledger" element={<FundLedger />} />
              <Route path="/income" element={<IncomePeriods />} />
              <Route path="/distributions" element={<Distributions />} />
              <Route path="/reserve" element={<ReserveFund />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/backup" element={<BackupRestore />} />
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/users" element={<UserManagement />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
