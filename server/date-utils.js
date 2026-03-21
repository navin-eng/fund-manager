const nepaliDateLibraryPromise = import('nepali-date-library');
const { getSetting } = require('./db');

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toAdDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeDateOnly(value) {
  return String(value).trim().slice(0, 10);
}

function parseDateParts(value) {
  const normalized = normalizeDateOnly(value);
  if (!DATE_ONLY_PATTERN.test(normalized)) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  return { year, month, day };
}

function isLikelyBsDateString(value) {
  const parts = parseDateParts(value);
  if (!parts) return false;

  const currentAdYear = new Date().getFullYear();
  return parts.year >= currentAdYear + 30 && parts.year <= currentAdYear + 90;
}

function getConfiguredCalendar() {
  const calendar = String(getSetting('calendar') || getSetting('calendar_system') || 'AD').toUpperCase();
  return calendar === 'BS' ? 'BS' : 'AD';
}

async function getTodayDateString(referenceDate) {
  const todayAd = toAdDateString(new Date());

  if (isLikelyBsDateString(referenceDate)) {
    const { ADtoBS } = await nepaliDateLibraryPromise;
    return ADtoBS(todayAd);
  }

  if (!referenceDate && getConfiguredCalendar() === 'BS') {
    const { ADtoBS } = await nepaliDateLibraryPromise;
    return ADtoBS(todayAd);
  }

  return todayAd;
}

async function addMonthsToDateString(dateString, months) {
  if (isLikelyBsDateString(dateString)) {
    const { NepaliDate } = await nepaliDateLibraryPromise;
    return new NepaliDate(dateString).addMonths(months).format('YYYY-MM-DD');
  }

  const date = new Date(dateString);
  date.setMonth(date.getMonth() + months);
  return toAdDateString(date);
}

function diffWholeMonths(fromDate, toDate) {
  const from = parseDateParts(fromDate);
  const to = parseDateParts(toDate);

  if (!from || !to) {
    return 0;
  }

  return (to.year - from.year) * 12 + (to.month - from.month);
}

async function getDateRange(period = 'monthly', refDate) {
  const effectiveDate = refDate || (await getTodayDateString());

  if (isLikelyBsDateString(effectiveDate)) {
    const { NepaliDate } = await nepaliDateLibraryPromise;
    const date = new NepaliDate(effectiveDate);

    switch (period) {
      case 'daily':
        return {
          start: date.format('YYYY-MM-DD'),
          end: date.format('YYYY-MM-DD'),
        };
      case 'weekly':
        return {
          start: date.startOfWeek().format('YYYY-MM-DD'),
          end: date.endOfWeek().format('YYYY-MM-DD'),
        };
      case 'fortnightly': {
        const start = new NepaliDate(date);
        const end = new NepaliDate(date);
        if (date.getDate() <= 15) {
          start.setDate(1);
          end.setDate(15);
        } else {
          start.setDate(16);
          end.setDate(end.endOfMonth().getDate());
        }
        return {
          start: start.format('YYYY-MM-DD'),
          end: end.format('YYYY-MM-DD'),
        };
      }
      case 'monthly':
        return {
          start: date.startOfMonth().format('YYYY-MM-DD'),
          end: date.endOfMonth().format('YYYY-MM-DD'),
        };
      case 'trimester': {
        const trimesterStartMonth = Math.floor(date.getMonth() / 4) * 4;
        const start = new NepaliDate(date.getYear(), trimesterStartMonth, 1);
        const end = new NepaliDate(start).addMonths(3).endOfMonth();
        return {
          start: start.format('YYYY-MM-DD'),
          end: end.format('YYYY-MM-DD'),
        };
      }
      case 'semi-annual': {
        const halfStartMonth = date.getMonth() < 6 ? 0 : 6;
        const start = new NepaliDate(date.getYear(), halfStartMonth, 1);
        const end = new NepaliDate(start).addMonths(5).endOfMonth();
        return {
          start: start.format('YYYY-MM-DD'),
          end: end.format('YYYY-MM-DD'),
        };
      }
      case 'yearly':
        return {
          start: date.startOfYear().format('YYYY-MM-DD'),
          end: date.endOfYear().format('YYYY-MM-DD'),
        };
      default:
        return {
          start: date.startOfMonth().format('YYYY-MM-DD'),
          end: date.endOfMonth().format('YYYY-MM-DD'),
        };
    }
  }

  const date = new Date(effectiveDate);
  let start;
  let end;

  switch (period) {
    case 'daily':
      start = new Date(date);
      end = new Date(date);
      break;
    case 'weekly': {
      const dayOfWeek = date.getDay();
      start = new Date(date);
      start.setDate(date.getDate() - dayOfWeek);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    }
    case 'fortnightly': {
      const dayOfMonth = date.getDate();
      start = new Date(date);
      if (dayOfMonth <= 15) {
        start.setDate(1);
        end = new Date(date);
        end.setDate(15);
      } else {
        start.setDate(16);
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      }
      break;
    }
    case 'monthly':
      start = new Date(date.getFullYear(), date.getMonth(), 1);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      break;
    case 'trimester': {
      const trimester = Math.floor(date.getMonth() / 4);
      start = new Date(date.getFullYear(), trimester * 4, 1);
      end = new Date(date.getFullYear(), trimester * 4 + 4, 0);
      break;
    }
    case 'semi-annual':
      if (date.getMonth() < 6) {
        start = new Date(date.getFullYear(), 0, 1);
        end = new Date(date.getFullYear(), 5, 30);
      } else {
        start = new Date(date.getFullYear(), 6, 1);
        end = new Date(date.getFullYear(), 11, 31);
      }
      break;
    case 'yearly':
      start = new Date(date.getFullYear(), 0, 1);
      end = new Date(date.getFullYear(), 11, 31);
      break;
    default:
      start = new Date(date.getFullYear(), date.getMonth(), 1);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  return {
    start: toAdDateString(start),
    end: toAdDateString(end),
  };
}

module.exports = {
  addMonthsToDateString,
  diffWholeMonths,
  getDateRange,
  getTodayDateString,
  isLikelyBsDateString,
  toAdDateString,
};
