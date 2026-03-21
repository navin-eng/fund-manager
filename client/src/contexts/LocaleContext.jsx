import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { t as translate, formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from '../utils/localization';

const LocaleContext = createContext(null);

// Nepali month names for BS calendar display
const nepaliMonths = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत्र'
];

const englishMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Nepali numeral conversion for dates
const nepaliNumerals = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function toNepaliNumerals(str) {
  return String(str).replace(/[0-9]/g, (d) => nepaliNumerals[parseInt(d, 10)]);
}

/**
 * Simple AD to BS date conversion.
 * Uses a lookup-based approach for years 2000-2090 BS (approx 1943-2034 AD).
 * Each entry contains the total days in each BS month for that year.
 */
const bsMonthDays = {
  2070: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2073: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2074: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2077: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2078: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2079: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2080: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2088: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
};

// Reference date: 2070/01/01 BS = 2013/04/14 AD
const bsRefYear = 2070;
const bsRefMonth = 1;
const bsRefDay = 1;
const adRefDate = new Date(2013, 3, 14); // April 14, 2013

/**
 * Convert AD date to BS date.
 * Returns { year, month, day } in BS or null if out of range.
 */
function adToBS(adDate) {
  const date = new Date(adDate);
  date.setHours(0, 0, 0, 0);

  let daysDiff = Math.floor((date - adRefDate) / (1000 * 60 * 60 * 24));

  let bsYear = bsRefYear;
  let bsMonth = bsRefMonth;
  let bsDay = bsRefDay;

  if (daysDiff >= 0) {
    // Forward from reference
    while (daysDiff > 0) {
      const monthDays = bsMonthDays[bsYear];
      if (!monthDays) {
        // Out of range, return approximate
        return null;
      }
      const daysInMonth = monthDays[bsMonth - 1];
      const daysRemaining = daysInMonth - bsDay;

      if (daysDiff <= daysRemaining) {
        bsDay += daysDiff;
        daysDiff = 0;
      } else {
        daysDiff -= (daysRemaining + 1);
        bsMonth++;
        bsDay = 1;
        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear++;
        }
      }
    }
  } else {
    // Before reference date
    daysDiff = Math.abs(daysDiff);
    while (daysDiff > 0) {
      bsDay--;
      if (bsDay === 0) {
        bsMonth--;
        if (bsMonth === 0) {
          bsMonth = 12;
          bsYear--;
        }
        const monthDays = bsMonthDays[bsYear];
        if (!monthDays) return null;
        bsDay = monthDays[bsMonth - 1];
      }
      daysDiff--;
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay };
}

/**
 * Format a BS date object into a readable string.
 */
function formatBSDate(bsDate, lang) {
  if (!bsDate) return '';
  const { year, month, day } = bsDate;
  const monthName = nepaliMonths[month - 1];

  if (lang === 'ne') {
    return `${toNepaliNumerals(day)} ${monthName} ${toNepaliNumerals(year)}`;
  }
  return `${day} ${monthName} ${year}`;
}

/**
 * Format an AD date into a readable string.
 */
function formatADDate(date, lang) {
  const d = new Date(date);
  const day = d.getDate();
  const month = englishMonths[d.getMonth()];
  const year = d.getFullYear();

  if (lang === 'ne') {
    return `${toNepaliNumerals(day)} ${month} ${toNepaliNumerals(year)}`;
  }
  return `${day} ${month} ${year}`;
}

export function LocaleProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  const [calendar, setCalendarState] = useState(() => {
    return localStorage.getItem('app_calendar') || 'AD';
  });

  const [currency, setCurrency] = useState('NPR');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Fetch settings from API on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          if (settings.language) {
            setLanguageState(settings.language);
            localStorage.setItem('app_language', settings.language);
          }
          if (settings.calendar) {
            setCalendarState(settings.calendar);
            localStorage.setItem('app_calendar', settings.calendar);
          }
          if (settings.currency) {
            setCurrency(settings.currency);
          }
        }
      } catch (err) {
        // Settings fetch failed; use localStorage/defaults
        console.warn('Could not fetch settings, using local defaults:', err.message);
      } finally {
        setSettingsLoaded(true);
      }
    };

    fetchSettings();
  }, []);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  }, []);

  const setCalendar = useCallback((cal) => {
    setCalendarState(cal);
    localStorage.setItem('app_calendar', cal);
  }, []);

  // Translation function bound to current language
  const t = useCallback((key) => {
    return translate(key, language);
  }, [language]);

  // Format date using current calendar and language settings
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    if (calendar === 'BS') {
      const bsDate = adToBS(date);
      if (bsDate) {
        return formatBSDate(bsDate, language);
      }
      // Fall back to AD if BS conversion fails (out of range)
      return formatADDate(date, language);
    }

    return formatADDate(date, language);
  }, [calendar, language]);

  // Format currency using current language and currency settings
  const formatCurrency = useCallback((amount) => {
    return formatCurrencyUtil(amount, currency, language);
  }, [currency, language]);

  // Format number using current language
  const formatNumber = useCallback((num) => {
    return formatNumberUtil(num, language);
  }, [language]);

  const value = {
    language,
    setLanguage,
    calendar,
    setCalendar,
    currency,
    setCurrency,
    t,
    formatDate,
    formatCurrency,
    formatNumber,
    settingsLoaded,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access locale context values.
 * Must be used within a LocaleProvider.
 */
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

export default LocaleContext;
