
export const getLocalDate = (daysToAdd = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);

  return date.toLocaleDateString('en-CA'); // Formats as YYYY-MM-DD
};

export const parseUTCDate = (dateStr: string): Date => {
  // If the date string doesn't end with "Z" or an offset, assume it's UTC and add "Z"
  if (!/([Zz]|[+-]\d{2}:\d{2})$/.test(dateStr)) {
    dateStr = dateStr + 'Z';
  }
  return new Date(dateStr);
};

export const formatDate = (dateStr: string | null, showTime = true): string => {
  if (!dateStr) return '';
  try {
    const date = parseUTCDate(dateStr);
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: showTime ? 'short' : undefined });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatDateWithTimezone = (dateStr: string, timezone: string): string => {
  const date = parseUTCDate(dateStr);
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone });
};

export const formatTime = (time: string) => {
  if (!time) return 'Time TBD';
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return time;
  }
};
