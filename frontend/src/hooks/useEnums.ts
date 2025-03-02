import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

/**
 * Enum types available from the backend
 */
export type EnumType = 'honorificTitle' | 'primaryDomain' | 'relationshipType' | 'appointmentStatus' | 'appointmentSubStatus' | 'appointmentType' | 'timeOfDay';

/**
 * Hook to fetch and cache enum values from the backend
 * 
 * Note: This hook uses React Query for caching. Multiple calls to useEnums with the same
 * enumType will reuse the same cached data and only trigger a single API request.
 * This means it's safe to call this hook in multiple components that need the same enum values.
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
      console.log(`Fetching enum values for ${enumType}`);
      const { data } = await api.get<T[]>(getEndpoint(enumType));
      console.log(`Received enum values for ${enumType}:`, data);
      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Log each time this hook returns values
  console.log(`useEnums(${enumType}) returning:`, data || []);

  return {
    values: data || [],
    isLoading,
    error,
  };
} 