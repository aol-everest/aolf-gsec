import React from 'react';
import { TextField, MenuItem, Divider, Typography } from '@mui/material';
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

  const renderMenuItems = () => {
    if (sortedCountries.length === 0) {
      return (
        <MenuItem value="" disabled>
          No countries available
        </MenuItem>
      );
    }

    const priorityItems = sortedCountries.filter(country => 
      priorityCountries.includes(country.iso2_code)
    );
    
    const otherItems = sortedCountries.filter(country => 
      !priorityCountries.includes(country.iso2_code)
    );

    return [
      // Priority countries
      ...priorityItems.map(country => (
        <MenuItem key={country.iso2_code} value={country.iso2_code}>
          {country.name} ({country.iso2_code})
        </MenuItem>
      )),
      
      // Divider between priority and other countries (only if both exist)
      ...(showDivider && priorityItems.length > 0 && otherItems.length > 0 ? [
        <Divider key="divider" />,
        <MenuItem key="other-countries-header" disabled>
          <Typography variant="caption" color="text.secondary">
            Other Countries
          </Typography>
        </MenuItem>
      ] : []),
      
      // Other countries
      ...otherItems.map(country => (
        <MenuItem key={country.iso2_code} value={country.iso2_code}>
          {country.name} ({country.iso2_code})
        </MenuItem>
      ))
    ];
  };

  return (
    <TextField
      select
      fullWidth={fullWidth}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      error={error}
      helperText={helperText}
      required={required}
    >
      <MenuItem value="">
        <em>{placeholder}</em>
      </MenuItem>
      {renderMenuItems()}
    </TextField>
  );
};

export default CountrySelect; 