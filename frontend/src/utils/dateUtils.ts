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
  for (let hour = 0; hour < 24; hour++) {
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

// Helper function to find the time option object from a time string
export const findTimeOption = (timeString: string | null, timeOptions: { value: string; label: string }[]) => {
  if (!timeString) return null;
  return timeOptions.find(option => option.value === timeString) || null;
};

export const parseUTCDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN); // Return invalid date for empty strings
  
  try {
    console.log('dateStr', dateStr);
    let safeDateStr = dateStr.trim();
    
    // Handle specific date formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(safeDateStr)) {
      // If date is in YYYY-MM-DD format, add time component
      safeDateStr += 'T00:00:00.000Z';
    } else if (!/([Zz]|[+-]\d{2}:\d{2})$/.test(safeDateStr)) {
      // If there's no explicit timezone, assume UTC
      safeDateStr += 'Z';
    }
    
    // Try parsing with date-fns first (best cross-platform compatibility)
    const parsedDate = parseISO(safeDateStr);
    console.log('parsedDate', parsedDate);
    
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
  if (!dateStr) return '';
  try {
    const date = parseUTCDate(dateStr);
    if (!isValid(date)) return ''; // Return empty string for invalid dates
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: showTime ? 'short' : undefined });
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
