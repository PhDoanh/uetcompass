import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../style/datepicker.css';

function parseISODate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatISODate(date) {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function DatePicker({
  value,
  onChange,
  id,
  className,
  placeholder,
  popperClassName,
  calendarClassName,
  showMonthYearPicker = false,
  dateFormat = 'dd/MM/yyyy',
}) {
  const selected = parseISODate(value);

  const handleChange = (date) => {
    const normalized = showMonthYearPicker && date instanceof Date ? new Date(date.getFullYear(), date.getMonth(), 1) : date;
    const synthetic = { target: { value: formatISODate(normalized) } };
    if (typeof onChange === 'function') onChange(synthetic);
  };

  return (
    <ReactDatePicker
      id={id}
      selected={selected}
      onChange={handleChange}
      dateFormat={dateFormat}
      placeholderText={placeholder || 'dd/mm/yyyy'}
      className={className}
      wrapperClassName="uet-datepicker-wrapper"
      popperClassName={popperClassName}
      calendarClassName={calendarClassName}
      showMonthYearPicker={showMonthYearPicker}
      popperPlacement="bottom-start"
    />
  );
}
