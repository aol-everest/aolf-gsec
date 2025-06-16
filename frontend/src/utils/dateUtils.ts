import { parseISO, isValid, format, addDays } from 'date-fns';

export const getLocalDateString = (daysToAdd = 0, formatStr = 'yyyy-MM-dd'): string => {
  const date = addDays(new Date(), daysToAdd);
  return format(date, formatStr);
};

export const getLocalTimeString = (formatStr = 'HH:mm'): string => {
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(Math.floor(now.getMinutes() / 15) * 15);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return format(rounded, formatStr);
};

export const getTimeOptions = (interval = 15): { value: string; label: string }[] => {
  const options = [];
  for (let hour = 7; hour < 23; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const hourFormatted = hour.toString().padStart(2, '0');
      const minuteFormatted = minute.toString().padStart(2, '0');
      const value = `${hourFormatted}:${minuteFormatted}`;
      const label = `${hour % 12 === 0 ? 12 : hour % 12}:${minuteFormatted} ${hour < 12 ? 'AM' : 'PM'}`;
      options.push({ value, label });
    }
  }
  return options;
};

export const defaultTimeOptions = getTimeOptions();

export const getDurationOptions = () => [15, 30, 45, 60, 90, 120].map(minutes => ({
  value: minutes,
  label: `${minutes} minutes`
}));

// Check if the time is outside normal hours (before 8am or after 10pm)
export const isTimeOffHours = (timeValue: string): boolean => {
  const hour = parseInt(timeValue.split(':')[0], 10);
  return !((hour >= 9 && hour < 14) || (hour >= 16 && hour < 21));
};

// Helper function to find the time option object from a time string
export const findTimeOption = (timeString: string | null, timeOptions: { value: string; label: string }[]) => {
  if (!timeString) return null;
  return timeOptions.find(option => option.value === timeString) || null;
};

export const parseUTCDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN); // Return invalid date for empty strings
  
  try {
    // console.log('dateStr', dateStr);
    let safeDateStr = dateStr.trim();
    
    // Handle specific date formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(safeDateStr)) {
      // If date is in YYYY-MM-DD format, add time component
      // safeDateStr += 'T00:00:00.000Z';
      safeDateStr += 'T00:00:00.000';
    } else if (!/([Zz]|[+-]\d{2}:\d{2})$/.test(safeDateStr)) {
      // If there's no explicit timezone, assume UTC
      // safeDateStr += 'Z';
      safeDateStr += '';
    }
    
    // Try parsing with date-fns first (best cross-platform compatibility)
    const parsedDate = parseISO(safeDateStr);
    // console.log('parsedDate', parsedDate);
    
    // Check if date is valid
    if (isValid(parsedDate)) {
      return parsedDate;
    }
    
    // Last resort: try native Date parsing
    const nativeDate = new Date(safeDateStr);
    return nativeDate;
  } catch (error) {
    console.error('Error parsing date:', error, dateStr);
    return new Date(NaN); // Return invalid date on error
  }
};

export const formatDate = (dateStr?: string, showTime = true): string => {
  // console.log('formatDate', dateStr, showTime);
  if (!dateStr) return '';
  try {
    const date = parseUTCDate(dateStr);
    // console.log('date', date);
    if (!isValid(date)) return ''; // Return empty string for invalid dates
    const formattedDate = date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: showTime ? 'short' : undefined });
    // console.log('formattedDate', formattedDate);
    return formattedDate;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatDateWithTimezone = (dateStr?: string, timezone?: string, showTime = true): string => {
  if (!dateStr) return '';
  try {
    const date = parseUTCDate(dateStr);
    if (!isValid(date)) return '';
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: showTime ? 'short' : undefined, timeZone: timezone });
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return '';
  }
};

export const formatTime = (time: string) => {
  if (!time) return 'Time TBD';
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    if (!isValid(date)) return time;
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
};

// Date range validation utilities
export const validateDateRange = (startDate: string, endDate: string): { isValid: boolean; error?: string } => {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Both start and end dates are required' };
  }

  // Parse dates in local timezone to avoid timezone issues
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  // Check if dates are valid
  if (!isValid(start) || !isValid(end)) {
    return { isValid: false, error: 'Invalid date format' };
  }

  // Check if start date is today or in the future (allow today)
  if (start < today) {
    return { isValid: false, error: 'Start date cannot be in the past' };
  }

  // Check if end date is on or after start date
  if (end < start) {
    return { isValid: false, error: 'End date must be on or after start date' };
  }

  // Check 30-day maximum range
  const daysDifference = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDifference > 30) {
    return { isValid: false, error: 'Date range cannot exceed 30 days' };
  }

  return { isValid: true };
};

// Single date validation utility
export const validateSingleDate = (dateValue: string): { isValid: boolean; error?: string } => {
  if (!dateValue) {
    return { isValid: false, error: 'Date is required' };
  }

  // Parse date in local timezone to avoid timezone issues
  const selectedDate = new Date(dateValue + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  // Check if date is valid
  if (!isValid(selectedDate)) {
    return { isValid: false, error: 'Invalid date format' };
  }

  // Check if date is today or in the future (allow today)
  if (selectedDate < today) {
    return { isValid: false, error: 'Date cannot be in the past' };
  }

  return { isValid: true };
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return '';
  
  try {
    // Parse dates in local timezone to avoid timezone issues
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    if (!isValid(start) || !isValid(end)) return '';
    
    // If same date, return single date
    if (startDate === endDate) {
      return format(start, 'MMM d, yyyy');
    }
    
    // Check if same month and year
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    const endMonth = end.getMonth();
    const endYear = end.getFullYear();
    
    if (startMonth === endMonth && startYear === endYear) {
      // Same month and year: "Jun 17-18, 2025"
      const startDay = format(start, 'd');
      const endDay = format(end, 'd');
      return `${format(start, 'MMM')} ${startDay}-${endDay}, ${startYear}`;
    } else if (startYear === endYear) {
      // Same year, different months: "Jun 30 - Jul 2, 2025"
      const startFormatted = format(start, 'MMM d');
      const endFormatted = format(end, 'MMM d');
      return `${startFormatted} - ${endFormatted}, ${startYear}`;
    } else {
      // Different years: "Dec 30, 2024 - Jan 2, 2025"
      const startFormatted = format(start, 'MMM d, yyyy');
      const endFormatted = format(end, 'MMM d, yyyy');
      return `${startFormatted} - ${endFormatted}`;
    }
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '';
  }
};
