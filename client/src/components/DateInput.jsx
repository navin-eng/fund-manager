import { useCallback } from 'react';
import { NepaliDatePicker } from 'nepali-datepicker-reactjs';
import 'nepali-datepicker-reactjs/dist/index.css';
import { useLocale } from '../contexts/LocaleContext';

/**
 * DateInput - A date input component that automatically switches between
 * a Nepali (BS) date picker and a standard HTML date input based on the
 * app's calendar setting.
 *
 * Props:
 *   value    - date string in YYYY-MM-DD format
 *   onChange - callback receiving the new date string (YYYY-MM-DD)
 *   className - CSS classes for the input
 *   name     - input name attribute (used for native input)
 *   required - whether the field is required
 */
export default function DateInput({ value, onChange, className = '', name, required }) {
  const { calendar, language } = useLocale();

  const handleNepaliChange = useCallback(
    (val) => {
      // nepali-datepicker-reactjs returns the value as a string
      onChange(val);
    },
    [onChange]
  );

  const handleNativeChange = useCallback(
    (e) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  if (calendar === 'BS') {
    return (
      <NepaliDatePicker
        inputClassName={className}
        value={value || ''}
        onChange={handleNepaliChange}
        options={{
          calenderLocale: language === 'ne' ? 'ne' : 'en',
          valueLocale: 'en',
        }}
      />
    );
  }

  return (
    <input
      type="date"
      name={name}
      value={value || ''}
      onChange={handleNativeChange}
      className={className}
      required={required}
    />
  );
}
