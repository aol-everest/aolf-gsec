import React from 'react';
import { TextField, Autocomplete, Typography, Box, Chip } from '@mui/material';
import { useCountriesWithPriority } from '../hooks/useCountriesWithPriority';

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

interface CountrySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  countries: Country[];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  priorityCountries?: string[];
  showDivider?: boolean;
  placeholder?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  label,
  value,
  onChange,
  countries,
  disabled = false,
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  priorityCountries = ['US', 'CA'],
  showDivider = true,
  placeholder = "Select a country"
}) => {
  const sortedCountries = useCountriesWithPriority(countries, priorityCountries);

  // Group countries for display
  const priorityItems = sortedCountries.filter(country => 
    priorityCountries.includes(country.iso2_code)
  );
  
  const otherItems = sortedCountries.filter(country => 
    !priorityCountries.includes(country.iso2_code)
  );

  // Use sorted countries as options for Autocomplete
  const options = sortedCountries;

  // Find selected country object
  const selectedCountry = sortedCountries.find(country => country.iso2_code === value) || null;

  return (
    <Autocomplete
      fullWidth={fullWidth}
      options={options}
      value={selectedCountry}
      onChange={(_, newValue) => {
        onChange(newValue?.iso2_code || '');
      }}
      getOptionLabel={(option) => `${option.name} (${option.iso2_code})`}
      groupBy={(option) => {
        if (priorityCountries.includes(option.iso2_code)) {
          return 'Frequently Used';
        }
        return showDivider && priorityItems.length > 0 ? 'Other Countries' : '';
      }}
      renderGroup={(params) => (
        <Box key={params.group}>
          {params.group && (
            <Box sx={{ 
              px: 2, 
              py: 1, 
              backgroundColor: 'grey.50',
            //   borderBottom: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="caption" color="grey.600" fontWeight={500}>
                {params.group}
              </Typography>
            </Box>
          )}
          {params.children}
        </Box>
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.iso2_code}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">
              {option.name}
            </Typography>
            <Chip 
              label={option.iso2_code} 
              size="small" 
              variant="outlined"
              sx={{ 
                fontSize: '0.7rem',
                height: '20px',
                backgroundColor: priorityCountries.includes(option.iso2_code) ? 'secondary.light' : 'grey.100',
                color: priorityCountries.includes(option.iso2_code) ? 'text.primary' : 'text.secondary',
                border: '1px solid',
                borderColor: priorityCountries.includes(option.iso2_code) ? 'grey.300' : 'grey.200'
              }}
            />
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          required={required}
          autoComplete="off"
        />
      )}
      disabled={disabled}
      disableClearable={required}
      filterOptions={(options, { inputValue }) => {
        const filtered = options.filter(option =>
          option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.iso2_code.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.iso3_code?.toLowerCase().includes(inputValue.toLowerCase())
        );
        
        // Keep priority order in search results
        const priorityFiltered = filtered.filter(country => 
          priorityCountries.includes(country.iso2_code)
        );
        const otherFiltered = filtered.filter(country => 
          !priorityCountries.includes(country.iso2_code)
        );
        
        return [...priorityFiltered, ...otherFiltered];
      }}
      noOptionsText="No countries found"
      loadingText="Loading countries..."
      isOptionEqualToValue={(option, value) => option.iso2_code === value.iso2_code}
    />
  );
};

export default CountrySelect; 