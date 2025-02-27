import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

/**
 * Enum types available from the backend
 */
export type EnumType = 'honorificTitle' | 'primaryDomain' | 'relationshipType' | 'appointmentStatus' | 'appointmentSubStatus' | 'appointmentType' | 'timeOfDay';

/**
 * Hook to fetch and cache enum values from the backend
 */
export function useEnums<T extends string = string>(enumType: EnumType) {
  const api = useApi();
  
  // Map enum type to API endpoint
  const getEndpoint = (type: EnumType): string => {
    switch (type) {
      case 'honorificTitle':
        return '/dignitaries/honorific-title-options';
      case 'primaryDomain':
        return '/dignitaries/primary-domain-options';
      case 'relationshipType':
        return '/dignitaries/relationship-type-options';
      case 'appointmentStatus':
        return '/appointments/status-options';
      case 'appointmentSubStatus':
        return '/appointments/sub-status-options';
      case 'appointmentType':
        return '/appointments/type-options';
      case 'timeOfDay':
        return '/appointments/time-of-day-options';
      default:
        throw new Error(`Unknown enum type: ${type}`);
    }
  };

  // Fetch enum values from the backend
  const { data, isLoading, error } = useQuery<T[]>({
    queryKey: [`enum-${enumType}`],
    queryFn: async () => {
      const { data } = await api.get<T[]>(getEndpoint(enumType));
      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return {
    values: data || [],
    isLoading,
    error,
  };
} 