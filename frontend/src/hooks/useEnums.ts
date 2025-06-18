import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

/**
 * Enum types available from the backend
 */
export type EnumType = 'userRole' | 'appointmentStatus' | 'appointmentSubStatus' | 
  'appointmentType' | 'appointmentTimeOfDay' | 'honorificTitle' | 'primaryDomain' | 
  'relationshipType' | 'personRelationshipType' | 'attachmentType' | 'accessLevel' | 'entityType' |
  'courseType' | 'sevaType' | 'roleInTeamProject';

// Map enum types to their endpoint paths
const enumEndpoints: Record<EnumType, string> = {
  userRole: '/admin/user-role-options',
  appointmentStatus: '/appointments/status-options',
  appointmentSubStatus: '/appointments/sub-status-options',
  appointmentType: '/appointments/type-options',
  appointmentTimeOfDay: '/appointments/time-of-day-options',
  honorificTitle: '/dignitaries/honorific-title-options',
  primaryDomain: '/dignitaries/primary-domain-options',
  relationshipType: '/dignitaries/relationship-type-options',
  personRelationshipType: '/appointments/person-relationship-type-options',
  attachmentType: '/attachments/type-options',
  accessLevel: '/admin/access-level-options',
  entityType: '/admin/entity-type-options',
  courseType: '/user-contacts/course-type-options',
  sevaType: '/user-contacts/seva-type-options',
  roleInTeamProject: '/appointments/role-in-team-project-options'
};

/**
 * Hook to fetch and cache enum values from the backend
 * 
 * Note: This hook uses React Query for caching. Multiple calls to useEnums with the same
 * enumType will reuse the same cached data and only trigger a single API request.
 * This means it's safe to call this hook in multiple components that need the same enum values.
 */
export const useEnums = (enumType: EnumType) => {
  const api = useApi();

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['enums', enumType],
    queryFn: async () => {
      try {
        const endpoint = enumEndpoints[enumType];
        if (!endpoint) {
          throw new Error(`Unknown enum type: ${enumType}`);
        }
        
        const { data } = await api.get<string[]>(endpoint);
        return data;
      } catch (err) {
        console.error(`Error fetching ${enumType} enum values:`, err);
        return [];
      }
    },
  });

  return {
    values: data,
    isLoading,
    error
  };
}; 

const enumMapEndpoints: Record<EnumType, string> = {
  userRole: '/admin/user-role-options-map',
  appointmentStatus: '/appointments/status-options-map',
  appointmentSubStatus: '/appointments/sub-status-options-map',
  appointmentType: '/appointments/type-options-map',
  appointmentTimeOfDay: '/appointments/time-of-day-options-map',
  honorificTitle: '/dignitaries/honorific-title-options-map',
  primaryDomain: '/dignitaries/primary-domain-options-map',
  relationshipType: '/dignitaries/relationship-type-options-map',
  personRelationshipType: '/appointments/person-relationship-type-options-map',
  attachmentType: '/attachments/type-options-map',
  accessLevel: '/admin/access-level-options-map',
  entityType: '/admin/entity-type-options-map',
  courseType: '/user-contacts/course-type-options-map',
  sevaType: '/user-contacts/seva-type-options-map',
  roleInTeamProject: '/appointments/role-in-team-project-options-map'
};

export const useEnumsMap = (enumType: EnumType) => {
  const api = useApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ['enums-map', enumType],
    queryFn: async () => {
      const endpoint = enumMapEndpoints[enumType];
      if (!endpoint) {
        throw new Error(`Unknown enum type: ${enumType}`);
      }

      const { data } = await api.get<Record<string, string>>(endpoint);
      return data;
    }
  });

  return {
    values: data,
    isLoading,
    error
  };
};
