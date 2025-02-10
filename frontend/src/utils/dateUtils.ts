
export const getLocalDate = (daysToAdd = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);

  return date.toLocaleDateString('en-CA'); // Formats as YYYY-MM-DD
};