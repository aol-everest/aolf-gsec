import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText, CircularProgress, SelectProps } from '@mui/material';
import { useEnums, EnumType } from '../hooks/useEnums';

interface EnumSelectProps extends Omit<SelectProps, 'children'> {
  enumType: EnumType;
  label: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
}

/**
 * A reusable select component that fetches and displays enum values from the backend
 */
export const EnumSelect: React.FC<EnumSelectProps> = ({
  enumType,
  label,
  error,
  helperText,
  required = false,
  fullWidth = true,
  ...selectProps
}) => {
  const { values, isLoading } = useEnums(enumType);

  // Add more detailed logging to track component renders and props
  console.log(`EnumSelect(${enumType}) rendering with:`, { 
    label, 
    value: selectProps.value,
    valueType: typeof selectProps.value,
    enumValues: values,
    loading: isLoading 
  });

  return (
    <FormControl fullWidth={fullWidth} required={required} error={error}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        {...selectProps}
        value={selectProps.value || ''}
        disabled={isLoading || selectProps.disabled}
        endAdornment={
          isLoading ? (
            <CircularProgress size={20} color="inherit" sx={{ marginRight: 2 }} />
          ) : (
            selectProps.endAdornment
          )
        }
      >
        {values.map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}; 