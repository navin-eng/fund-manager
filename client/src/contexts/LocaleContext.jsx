import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { t as translate, formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from '../utils/localization';
import { ADtoBS, BStoAD, NepaliDate } from 'nepali-date-library';

const LocaleContext = createContext(null);

const englishMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Nepali numeral conversion for dates
const nepaliNumerals = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function toNepaliNumerals(str) {
  return String(str).replace(/[0-9]/g, (d) => nepaliNumerals[parseInt(d, 10)]);
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light';
}

function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

function toAdDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeDateOnlyValue(value) {
  return String(value).trim().slice(0, 10);
}

function isLikelyBsDate(dateStr) {
  if (!DATE_ONLY_PATTERN.test(dateStr)) return false;

  const [year] = dateStr.split('-').map(Number);
  const currentAdYear = new Date().getFullYear();

  if (year < currentAdYear + 30 || year > currentAdYear + 90) {
    return false;
  }

  try {
    new NepaliDate(dateStr);
    return true;
  } catch {
    return false;
  }
}

function formatBSDate(dateStr, lang) {
  try {
    const bsDate = new NepaliDate(dateStr);
    return bsDate.format(lang === 'ne' ? 'd mmmm yyyy' : 'D MMMM YYYY');
  } catch {
    return dateStr;
  }
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

  const [theme, setThemeState] = useState(() => {
    return normalizeTheme(localStorage.getItem('app_theme'));
  });

  const [currency, setCurrency] = useState('NPR');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

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
          if (settings.theme) {
            const normalizedTheme = normalizeTheme(settings.theme);
            setThemeState(normalizedTheme);
            localStorage.setItem('app_theme', normalizedTheme);
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

  const setTheme = useCallback((nextTheme) => {
    const resolvedTheme = normalizeTheme(nextTheme);
    setThemeState(resolvedTheme);
    localStorage.setItem('app_theme', resolvedTheme);
    applyThemeToDocument(resolvedTheme);
  }, []);

  const toDateInputValue = useCallback((value) => {
    if (!value) return '';

    const normalizedValue = normalizeDateOnlyValue(value);
    if (isLikelyBsDate(normalizedValue)) {
      return normalizedValue;
    }

    const adDate = new Date(value);
    if (isNaN(adDate.getTime())) {
      return normalizedValue;
    }

    return toAdDateInputValue(adDate);
  }, []);

  const getTodayDateInputValue = useCallback(() => {
    const todayAd = toAdDateInputValue(new Date());
    if (calendar === 'BS') {
      return ADtoBS(todayAd);
    }
    return todayAd;
  }, [calendar]);

  // Translation function bound to current language
  const t = useCallback((key) => {
    return translate(key, language);
  }, [language]);

  // Format date using current calendar and language settings
  const formatDate = useCallback((value) => {
    if (!value) return '';

    if (value instanceof Date) {
      const adValue = toAdDateInputValue(value);
      return calendar === 'BS' ? formatBSDate(ADtoBS(adValue), language) : formatADDate(value, language);
    }

    const normalizedValue = normalizeDateOnlyValue(value);

    if (isLikelyBsDate(normalizedValue)) {
      if (calendar === 'BS') {
        return formatBSDate(normalizedValue, language);
      }

      try {
        return formatADDate(BStoAD(normalizedValue), language);
      } catch {
        return normalizedValue;
      }
    }

    const adDate = new Date(value);
    if (isNaN(adDate.getTime())) return String(value);

    if (calendar === 'BS') {
      return formatBSDate(ADtoBS(toAdDateInputValue(adDate)), language);
    }

    return formatADDate(adDate, language);
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
    theme,
    setTheme,
    currency,
    setCurrency,
    t,
    formatDate,
    toDateInputValue,
    getTodayDateInputValue,
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
