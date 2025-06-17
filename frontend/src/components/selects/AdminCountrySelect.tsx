import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { GenericCountrySelect } from './GenericCountrySelect';

interface Country {
  iso2_code: string;
  name: string;
  iso3_code: string;
  region?: string;
  sub_region?: string;
  intermediate_region?: string;
  country_groups?: string[];
  alt_names?: string[];
  is_enabled: boolean;
}

interface AdminCountrySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  priorityCountries?: string[];
  showDivider?: boolean;
  placeholder?: string;
  allowedCountries?: string[];
}

export const AdminCountrySelect: React.FC<AdminCountrySelectProps> = (props) => {
  const api = useApi();
  
  const { data: countries = [], isLoading } = useQuery({
    queryKey: ['countries', 'admin', 'enabled'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Country[]>('/admin/countries/enabled');
        return data;
      } catch (error) {
        console.error('Error fetching admin countries:', error);
        return [];
      }
    },
  });

  return (
    <GenericCountrySelect
      {...props}
      countries={countries}
      loading={isLoading}
    />
  );
};

export default AdminCountrySelect; 