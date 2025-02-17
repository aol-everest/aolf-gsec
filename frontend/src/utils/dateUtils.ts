
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

export const formatDate = (dateStr: string): string => {
  const date = parseUTCDate(dateStr);
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatDateWithTimezone = (dateStr: string, timezone: string): string => {
  const date = parseUTCDate(dateStr);
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone });
};
