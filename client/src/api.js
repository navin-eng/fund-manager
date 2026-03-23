const BASE_URL = '';

// Drop-in replacement for native fetch() that auto-attaches auth token
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = { ...options.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

export async function readJsonResponse(response, fallback = null) {
  const text = await response.text();

  if (!text.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse server response (${response.status})`);
  }
}

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  };

  // Don't set Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await readJsonResponse(response, {
      message: `Request failed with status ${response.status}`,
    });
    throw new Error(error.message || error.error || 'Something went wrong');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return readJsonResponse(response, null);
}

// Members
export const getMembers = (params = '') =>
  fetchAPI(`/api/members${params ? `?${params}` : ''}`);

export const getMember = (id) =>
  fetchAPI(`/api/members/${id}`);

export const createMember = (data) =>
  fetchAPI('/api/members', { method: 'POST', body: JSON.stringify(data) });

export const updateMember = (id, data) =>
  fetchAPI(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteMember = (id) =>
  fetchAPI(`/api/members/${id}`, { method: 'DELETE' });

// Savings
export const getSavings = (params = '') =>
  fetchAPI(`/api/savings${params ? `?${params}` : ''}`);

export const createSaving = (data) =>
  fetchAPI('/api/savings', { method: 'POST', body: JSON.stringify(data) });

export const getSavingsSummary = () =>
  fetchAPI('/api/savings/summary');

// Loans
export const getLoans = (params = '') =>
  fetchAPI(`/api/loans${params ? `?${params}` : ''}`);

export const getLoan = (id) =>
  fetchAPI(`/api/loans/${id}`);

export const createLoan = (data) =>
  fetchAPI('/api/loans', { method: 'POST', body: JSON.stringify(data) });

export const approveLoan = (id, data) =>
  fetchAPI(`/api/loans/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) });

export const rejectLoan = (id, data = {}) =>
  fetchAPI(`/api/loans/${id}/reject`, { method: 'PUT', body: JSON.stringify(data) });

export const addRepayment = (id, data) =>
  fetchAPI(`/api/loans/${id}/repayment`, { method: 'POST', body: JSON.stringify(data) });

export const getLoanSchedule = (id) =>
  fetchAPI(`/api/loans/${id}/schedule`);

export const uploadLoanDocument = (id, formData) =>
  fetchAPI(`/api/loans/${id}/documents`, { method: 'POST', body: formData });

// Reports
export const getReports = () =>
  fetchAPI('/api/reports');

export const getMemberSavingsReport = (params = '') =>
  fetchAPI(`/api/reports/member-savings${params ? `?${params}` : ''}`);

export const getLoanPortfolio = () =>
  fetchAPI('/api/reports/loan-portfolio');

export const getIncomeStatement = (params = '') =>
  fetchAPI(`/api/reports/income-statement${params ? `?${params}` : ''}`);

export const getBalanceSheet = () =>
  fetchAPI('/api/reports/balance-sheet');

export const getOverdueLoans = () =>
  fetchAPI('/api/reports/overdue-loans');

// Settings
export const getSettings = () =>
  fetchAPI('/api/settings');

export const updateSettings = (data) =>
  fetchAPI('/api/settings', { method: 'PUT', body: JSON.stringify(data) });

// Balance Adjustments
export const getBalanceAdjustments = (params = '') =>
  fetchAPI(`/api/balance-adjustments${params ? `?${params}` : ''}`);

export const createBalanceAdjustment = (data) =>
  fetchAPI('/api/balance-adjustments', { method: 'POST', body: JSON.stringify(data) });

// Fiscal Year
export const getFiscalYear = () =>
  fetchAPI('/api/fiscal-year');

// Fund Ledger
export const getFundLedger = (params = '') =>
  fetchAPI(`/api/fund-ledger${params ? `?${params}` : ''}`);

export const getFundLedgerSummary = () =>
  fetchAPI('/api/fund-ledger/summary');

export const createFundLedgerEntry = (data) =>
  fetchAPI('/api/fund-ledger', { method: 'POST', body: JSON.stringify(data) });

// Income
export const getIncomePeriods = () =>
  fetchAPI('/api/income/periods');

export const getIncomeEntries = (periodId) =>
  fetchAPI(`/api/income/periods/${periodId}/entries`);

export const createIncomePeriod = (data) =>
  fetchAPI('/api/income/periods', { method: 'POST', body: JSON.stringify(data) });

export const createIncomeEntry = (data) =>
  fetchAPI('/api/income/entries', { method: 'POST', body: JSON.stringify(data) });

// Distributions
export const getDistributions = () =>
  fetchAPI('/api/distributions');

export const getDistributionSummary = () =>
  fetchAPI('/api/distributions/summary');

export const createDistribution = (data) =>
  fetchAPI('/api/distributions', { method: 'POST', body: JSON.stringify(data) });

// Reserve Fund
export const getReserveFund = () =>
  fetchAPI('/api/reserve');

export const createReserveEntry = (data) =>
  fetchAPI('/api/reserve', { method: 'POST', body: JSON.stringify(data) });
