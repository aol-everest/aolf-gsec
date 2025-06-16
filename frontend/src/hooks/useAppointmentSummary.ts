import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';
import { useAuth } from '../contexts/AuthContext';

export interface AppointmentInfo {
  id: number;
  status: string;
  purpose: string;
  date: string | null;
}

export interface AppointmentSummary {
  [requestType: string]: {
    count: number;
    appointments: AppointmentInfo[];
  };
}

export const useAppointmentSummary = () => {
  const api = useApi();
  const { userInfo, isAuthenticated } = useAuth();

  return useQuery<AppointmentSummary>({
    queryKey: ['appointment-summary', userInfo?.email],
    queryFn: async () => {
      const { data } = await api.get<AppointmentSummary>('/appointments/summary');
      return data;
    },
    enabled: !!isAuthenticated && !!userInfo,
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    gcTime: 1000 * 60 * 15, // Cache is kept for 15 minutes
    refetchOnWindowFocus: false,
  });
};

// Helper function to check if user has existing appointments for a request type
export const hasExistingAppointments = (
  summary: AppointmentSummary | undefined,
  requestType: string
): { hasExisting: boolean; count: number } => {
  if (!summary || !summary[requestType]) {
    return { hasExisting: false, count: 0 };
  }
  
  const count = summary[requestType].count;
  return { hasExisting: count > 0, count };
}; 