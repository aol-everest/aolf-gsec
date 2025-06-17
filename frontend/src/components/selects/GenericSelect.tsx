import React from 'react';
import { TextField, Autocomplete, Typography, Box, Chip } from '@mui/material';

interface GenericSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  priorityOptions?: string[];
  showDivider?: boolean;
  placeholder?: string;
  allowedOptions?: string[];
  loading?: boolean;
  priorityGroupLabel?: string;
  otherGroupLabel?: string;
  priorityChipLabel?: string | null;
  showPriorityChips?: boolean;
}

export const GenericSelect: React.FC<GenericSelectProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  priorityOptions = [],
  showDivider = true,
  placeholder = "Select an option",
  allowedOptions,
  loading = false,
  priorityGroupLabel = "Common",
  otherGroupLabel = "Other",
  priorityChipLabel = null,
  showPriorityChips = true
}) => {
  // Filter options based on allowedOptions if provided
  const filteredOptions = allowedOptions 
    ? options.filter(option => allowedOptions.includes(option))
    : options;

  // Check if we should show grouping (only if priority items exist and are found in filtered options)
  const hasPriorityItems = priorityOptions.length > 0;
  const priorityItems = hasPriorityItems 
    ? filteredOptions.filter(option => priorityOptions.includes(option))
    : [];
  const shouldShowGrouping = hasPriorityItems && priorityItems.length > 0;
  
  // Organize options - if no grouping, just use filtered options as-is
  const finalOptions = shouldShowGrouping 
    ? [
        ...priorityItems,
        ...filteredOptions.filter(option => !priorityOptions.includes(option))
      ]
    : filteredOptions;

  // Find selected option
  const selectedOption = value || null;

  return (
    <Autocomplete
      fullWidth={fullWidth}
      options={finalOptions}
      value={selectedOption}
      onChange={(_, newValue) => {
        onChange(newValue || '');
      }}
      getOptionLabel={(option) => option}
      groupBy={shouldShowGrouping ? (option) => {
        if (priorityOptions.includes(option)) {
          return priorityGroupLabel;
        }
        return showDivider ? otherGroupLabel : '';
      } : undefined}
      renderGroup={shouldShowGrouping ? (params) => (
        <Box key={params.group}>
          {params.group && (
            <Box sx={{ 
              px: 2, 
              py: 1, 
              backgroundColor: 'grey.50',
              borderColor: 'grey.200'
            }}>
              <Typography variant="caption" color="grey.600" fontWeight={500}>
                {params.group}
              </Typography>
            </Box>
          )}
          {params.children}
        </Box>
      ) : undefined}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">
              {option}
            </Typography>
            {shouldShowGrouping && showPriorityChips && priorityOptions.includes(option) && priorityChipLabel && (
              <Chip 
                label={priorityChipLabel} 
                size="small" 
                variant="outlined"
                sx={{ 
                  fontSize: '0.7rem',
                  height: '20px',
                  backgroundColor: 'secondary.light',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'grey.300'
                }}
              />
            )}
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
      disabled={disabled || loading}
      disableClearable={required}
      filterOptions={(options, { inputValue }) => {
        const filtered = options.filter(option =>
          option.toLowerCase().includes(inputValue.toLowerCase())
        );
        
        // If we have grouping, maintain priority order in search results
        if (shouldShowGrouping) {
          const priorityFiltered = filtered.filter(option => 
            priorityOptions.includes(option)
          );
          const otherFiltered = filtered.filter(option => 
            !priorityOptions.includes(option)
          );
          return [...priorityFiltered, ...otherFiltered];
        }
        
        return filtered;
      }}
      noOptionsText="No options found"
      loadingText="Loading options..."
      loading={loading}
      isOptionEqualToValue={(option, value) => option === value}
    />
  );
};

export default GenericSelect; 