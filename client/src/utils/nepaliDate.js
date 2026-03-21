/**
 * Nepali Bikram Sambat (BS) Date Utility
 * Complete BS calendar data and conversion functions for fund management app.
 *
 * Reference point: 2000/01/01 BS = 1943/04/14 AD
 */

// --------------------------------------------------------------------------
// 1. BS Calendar Data  (days in each month for BS years 2000 - 2100)
// --------------------------------------------------------------------------
const bsCalendarData = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2096: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2097: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2098: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2099: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2100: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
};

// --------------------------------------------------------------------------
// 2. Month and Day Name Constants
// --------------------------------------------------------------------------
const bsMonthsNe = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत',
];

const bsMonthsEn = [
  'Baisakh', 'Jestha', 'Ashar', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

const bsDaysNe = [
  'आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार',
  'बिहिबार', 'शुक्रबार', 'शनिबार',
];

const bsDaysEn = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

// Reference point: 2000/01/01 BS = 1943/04/14 AD
const BS_EPOCH_YEAR = 2000;
const BS_EPOCH_MONTH = 1;
const BS_EPOCH_DAY = 1;
const AD_EPOCH = new Date(1943, 3, 14); // months are 0-indexed in JS

// --------------------------------------------------------------------------
// 3. Helper – total days in a BS year
// --------------------------------------------------------------------------
function getTotalDaysInBsYear(year) {
  if (!bsCalendarData[year]) {
    throw new RangeError(`BS year ${year} is out of supported range (2000-2100)`);
  }
  return bsCalendarData[year].reduce((sum, d) => sum + d, 0);
}

// --------------------------------------------------------------------------
// 4. Core Conversion Functions
// --------------------------------------------------------------------------

/**
 * Get the number of days in a given BS month.
 * @param {number} year  - BS year (2000-2100)
 * @param {number} month - BS month (1-12)
 * @returns {number} days in that month
 */
export function getBsDaysInMonth(year, month) {
  if (!bsCalendarData[year]) {
    throw new RangeError(`BS year ${year} is out of supported range (2000-2100)`);
  }
  if (month < 1 || month > 12) {
    throw new RangeError(`BS month must be between 1 and 12, got ${month}`);
  }
  return bsCalendarData[year][month - 1];
}

/**
 * Convert an AD (Gregorian) date to BS date.
 * @param {Date|string} adDate - JS Date object or 'YYYY-MM-DD' string
 * @returns {{ year: number, month: number, day: number }}
 */
export function adToBs(adDate) {
  let date;
  if (typeof adDate === 'string') {
    const parts = adDate.split('-').map(Number);
    date = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    date = new Date(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());
  }

  if (isNaN(date.getTime())) {
    throw new TypeError('Invalid date provided to adToBs');
  }

  // Calculate the difference in days from the AD epoch
  const diffMs = date.getTime() - AD_EPOCH.getTime();
  let daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    throw new RangeError('Date is before the supported BS range (before 2000/01/01 BS)');
  }

  let bsYear = BS_EPOCH_YEAR;
  let bsMonth = BS_EPOCH_MONTH;
  let bsDay = BS_EPOCH_DAY;

  // Walk through years
  while (daysDiff > 0) {
    if (!bsCalendarData[bsYear]) {
      throw new RangeError('Date exceeds supported BS range (2000-2100)');
    }
    const daysInYear = getTotalDaysInBsYear(bsYear);
    const daysRemainingInYear = daysInYear - dayCountUpTo(bsYear, bsMonth, bsDay);

    if (daysDiff >= daysRemainingInYear + 1) {
      // Not in this year – but we need to be careful if we're mid-year
      // Simpler approach: walk month by month
    }
    // Walk day by day is too slow; walk month by month instead
    break;
  }

  // Reset and use month-level walking for efficiency
  bsYear = BS_EPOCH_YEAR;
  bsMonth = 1;
  bsDay = 1;

  // Subtract full years
  while (daysDiff > 0) {
    if (!bsCalendarData[bsYear]) {
      throw new RangeError('Date exceeds supported BS range (2000-2100)');
    }
    const daysInYear = getTotalDaysInBsYear(bsYear);
    if (daysDiff >= daysInYear) {
      daysDiff -= daysInYear;
      bsYear++;
    } else {
      break;
    }
  }

  // Subtract full months
  while (daysDiff > 0) {
    if (!bsCalendarData[bsYear]) {
      throw new RangeError('Date exceeds supported BS range (2000-2100)');
    }
    const daysInMonth = bsCalendarData[bsYear][bsMonth - 1];
    if (daysDiff >= daysInMonth) {
      daysDiff -= daysInMonth;
      bsMonth++;
      if (bsMonth > 12) {
        bsMonth = 1;
        bsYear++;
      }
    } else {
      break;
    }
  }

  bsDay += daysDiff;

  return { year: bsYear, month: bsMonth, day: bsDay };
}

/**
 * Helper: count days elapsed in a BS year up to (but not including) a given date.
 */
function dayCountUpTo(year, month, day) {
  let count = 0;
  for (let m = 1; m < month; m++) {
    count += bsCalendarData[year][m - 1];
  }
  count += day - 1;
  return count;
}

/**
 * Convert a BS date to AD (Gregorian) date.
 * @param {number} bsYear  - BS year
 * @param {number} bsMonth - BS month (1-12)
 * @param {number} bsDay   - BS day
 * @returns {Date} JS Date object in AD
 */
export function bsToAd(bsYear, bsMonth, bsDay) {
  if (!bsCalendarData[bsYear]) {
    throw new RangeError(`BS year ${bsYear} is out of supported range (2000-2100)`);
  }
  if (bsMonth < 1 || bsMonth > 12) {
    throw new RangeError(`BS month must be between 1 and 12, got ${bsMonth}`);
  }
  const maxDay = bsCalendarData[bsYear][bsMonth - 1];
  if (bsDay < 1 || bsDay > maxDay) {
    throw new RangeError(`BS day must be between 1 and ${maxDay} for ${bsYear}/${bsMonth}, got ${bsDay}`);
  }

  // Total days from BS epoch to the target BS date
  let totalDays = 0;

  // Add full years
  for (let y = BS_EPOCH_YEAR; y < bsYear; y++) {
    totalDays += getTotalDaysInBsYear(y);
  }

  // Add full months of the target year
  for (let m = 1; m < bsMonth; m++) {
    totalDays += bsCalendarData[bsYear][m - 1];
  }

  // Add remaining days (minus 1 because epoch day itself is day 0)
  totalDays += bsDay - 1;

  // Add to AD epoch
  const result = new Date(AD_EPOCH.getTime());
  result.setDate(result.getDate() + totalDays);
  return result;
}

// --------------------------------------------------------------------------
// 5. Formatting Functions
// --------------------------------------------------------------------------

/**
 * Convert a number to Nepali numeral string.
 * @param {number|string} num
 * @returns {string} Nepali numeral representation
 */
export function toNepaliNumeral(num) {
  return String(num)
    .split('')
    .map((ch) => {
      const digit = parseInt(ch, 10);
      return isNaN(digit) ? ch : nepaliDigits[digit];
    })
    .join('');
}

/**
 * Get BS month name.
 * @param {number} month - 1-12
 * @param {'ne'|'en'} [lang='en']
 * @returns {string}
 */
export function getBsMonthName(month, lang = 'en') {
  if (month < 1 || month > 12) {
    throw new RangeError(`Month must be between 1 and 12, got ${month}`);
  }
  return lang === 'ne' ? bsMonthsNe[month - 1] : bsMonthsEn[month - 1];
}

/**
 * Get BS day name.
 * @param {number} dayIndex - 0 (Sunday) - 6 (Saturday)
 * @param {'ne'|'en'} [lang='en']
 * @returns {string}
 */
export function getBsDayName(dayIndex, lang = 'en') {
  if (dayIndex < 0 || dayIndex > 6) {
    throw new RangeError(`Day index must be between 0 and 6, got ${dayIndex}`);
  }
  return lang === 'ne' ? bsDaysNe[dayIndex] : bsDaysEn[dayIndex];
}

/**
 * Pad a number to 2 digits.
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Format a BS date object.
 * @param {{ year: number, month: number, day: number }} bsDate
 * @param {'YYYY-MM-DD'|'YYYY/MM/DD'|'DD-MM-YYYY'|'full'} [format='YYYY-MM-DD']
 * @param {'ne'|'en'} [lang='en']
 * @returns {string}
 */
export function formatBsDate(bsDate, format = 'YYYY-MM-DD', lang = 'en') {
  const { year, month, day } = bsDate;
  const y = lang === 'ne' ? toNepaliNumeral(year) : String(year);
  const m = lang === 'ne' ? toNepaliNumeral(pad2(month)) : pad2(month);
  const d = lang === 'ne' ? toNepaliNumeral(pad2(day)) : pad2(day);

  switch (format) {
    case 'YYYY/MM/DD':
      return `${y}/${m}/${d}`;
    case 'DD-MM-YYYY':
      return `${d}-${m}-${y}`;
    case 'full': {
      const monthName = getBsMonthName(month, lang);
      const dayNum = lang === 'ne' ? toNepaliNumeral(day) : String(day);
      const yearNum = lang === 'ne' ? toNepaliNumeral(year) : String(year);
      return `${dayNum} ${monthName} ${yearNum}`;
    }
    case 'YYYY-MM-DD':
    default:
      return `${y}-${m}-${d}`;
  }
}

// --------------------------------------------------------------------------
// 6. Convenience Functions
// --------------------------------------------------------------------------

/**
 * Get today's date in BS.
 * @returns {{ year: number, month: number, day: number }}
 */
export function getTodayBs() {
  return adToBs(new Date());
}

/**
 * Format a date string based on the chosen calendar system.
 * @param {string} adDateStr - AD date in 'YYYY-MM-DD' format
 * @param {'AD'|'BS'} [calendar='AD']
 * @param {'en'|'ne'} [lang='en']
 * @returns {string} formatted date string
 */
export function formatDateByCalendar(adDateStr, calendar = 'AD', lang = 'en') {
  if (!adDateStr) return '';

  if (calendar === 'BS') {
    try {
      const bsDate = adToBs(adDateStr);
      return formatBsDate(bsDate, 'YYYY-MM-DD', lang);
    } catch {
      // If conversion fails, fall back to AD
      return adDateStr;
    }
  }

  // AD calendar
  if (lang === 'ne') {
    // Return AD date with Nepali numerals
    return toNepaliNumeral(adDateStr);
  }
  return adDateStr;
}

// --------------------------------------------------------------------------
// 7. Exports (named exports above; also provide a default bundle)
// --------------------------------------------------------------------------
export default {
  adToBs,
  bsToAd,
  formatBsDate,
  getBsMonthName,
  getBsDayName,
  getBsDaysInMonth,
  getTodayBs,
  toNepaliNumeral,
  formatDateByCalendar,
  bsCalendarData,
  bsMonthsNe,
  bsMonthsEn,
  bsDaysNe,
  bsDaysEn,
};
