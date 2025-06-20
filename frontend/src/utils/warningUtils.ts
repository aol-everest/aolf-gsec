import { SystemWarningCode } from '../models/types';
import { useEnumsMap } from '../hooks/useEnums';

/**
 * Hook to get system warning code messages from the backend
 */
export const useWarningMessages = () => {
  return useEnumsMap('systemWarningCodeMessages');
};

/**
 * Get a user-friendly warning message from a warning code using the provided messages map
 */
export const getWarningMessage = (code: SystemWarningCode, messagesMap: Record<string, string>): string => {
  return messagesMap[code] || `Unknown warning (${code})`;
};

/**
 * Get multiple warning messages from an array of warning codes using the provided messages map
 */
export const getWarningMessages = (codes: SystemWarningCode[], messagesMap: Record<string, string>): string[] => {
  return codes.map(code => getWarningMessage(code, messagesMap));
};

/**
 * Check if a warning code is contact-related
 */
export const isContactWarning = (code: SystemWarningCode): boolean => {
  return code.startsWith("1");
};

/**
 * Check if a warning code is appointment-related
 */
export const isAppointmentWarning = (code: SystemWarningCode): boolean => {
  return code.startsWith("2");
};

/**
 * Check if a warning code is calendar-related
 */
export const isCalendarWarning = (code: SystemWarningCode): boolean => {
  return code.startsWith("3");
};

/**
 * Get the category name for a warning code
 */
export const getWarningCategory = (code: SystemWarningCode): string => {
  const prefix = code[0];
  const categories: Record<string, string> = {
    "1": "Contact/User",
    "2": "Appointment",
    "3": "Calendar/Event", 
    "4": "Authentication/Authorization",
    "5": "System/General"
  };
  return categories[prefix] || "Unknown";
}; 