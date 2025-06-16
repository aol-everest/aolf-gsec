import React from 'react';
import { TextField, Autocomplete, Typography, Box, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { SubdivisionData } from '../models/types';

interface SubdivisionStateDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStateCodeChange?: (stateCode: string) => void;
  error?: boolean;
  helperText?: string;
  countryCode?: string;
  disabled?: boolean;
}

export const SubdivisionStateDropdown: React.FC<SubdivisionStateDropdownProps> = ({
  label,
  value = '',
  onChange,
  onStateCodeChange,
  error,
  helperText,
  countryCode,
  disabled = false,
}) => {
  const api = useApi();
  
  const { data: subdivisions = [], isLoading: subdivisionsLoading } = useQuery({
    queryKey: ['subdivisions', countryCode],
    queryFn: async () => {
      if (!countryCode) return [];
      try {
        const { data } = await api.get<SubdivisionData[]>(`/subdivisions/country/${countryCode}`);
        return data;
      } catch (error) {
        console.error('Error fetching subdivisions:', error);
        return [];
      }
    },
    enabled: !!countryCode,
  });

  // Find selected subdivision object
  const selectedSubdivision = subdivisions.find(subdivision => subdivision.name === value) || null;

  if (!countryCode) {
    return (
      <Autocomplete
        fullWidth
        options={[]}
        value={null}
        disabled={true}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder="Please select a country first"
            error={error}
            helperText="Please select a country first"
          />
        )}
        noOptionsText="Please select a country first"
      />
    );
  }

  return (
    <Autocomplete
      fullWidth
      options={subdivisions}
      value={selectedSubdivision}
      onChange={(_, newValue) => {
        const stateName = newValue?.name || '';
        onChange(stateName);
        
        if (newValue && onStateCodeChange) {
          onStateCodeChange(newValue.subdivision_code);
        } else if (!newValue && onStateCodeChange) {
          onStateCodeChange('');
        }
      }}
      getOptionLabel={(option) => `${option.name} (${option.subdivision_type})`}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.subdivision_code}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">
              {option.name}
            </Typography>
            <Chip 
              label={option.subdivision_type} 
              size="small" 
              variant="outlined"
              sx={{ 
                fontSize: '0.7rem',
                height: '20px',
                backgroundColor: 'grey.100',
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            />
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Search states/provinces..."
          error={error}
          helperText={subdivisionsLoading ? "Loading states/provinces..." : helperText}
        />
      )}
      disabled={disabled || subdivisionsLoading}
      loading={subdivisionsLoading}
      filterOptions={(options, { inputValue }) => {
        return options.filter(option =>
          option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.subdivision_code.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.subdivision_type.toLowerCase().includes(inputValue.toLowerCase())
        );
      }}
      noOptionsText={
        subdivisions.length === 0 && !subdivisionsLoading 
          ? "No states/provinces available" 
          : "No matching states/provinces found"
      }
      loadingText="Loading states/provinces..."
      isOptionEqualToValue={(option, value) => option.subdivision_code === value.subdivision_code}
    />
  );
};

export default SubdivisionStateDropdown; 