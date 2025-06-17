import React from 'react';
import { GenericSelect } from './GenericSelect';

interface GenericSimpleSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  loading?: boolean;
}

/**
 * A simplified wrapper around GenericSelect for basic use cases.
 * Shows a clean autocomplete list without priority grouping or chips.
 * Perfect for status dropdowns, simple categories, or basic enum selections.
 */
export const GenericSimpleSelect: React.FC<GenericSimpleSelectProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  placeholder = "Select an option",
  loading = false
}) => {
  return (
    <GenericSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      error={error}
      helperText={helperText}
      required={required}
      fullWidth={fullWidth}
      placeholder={placeholder}
      loading={loading}
      // No priorityOptions provided - this will show a simple list without grouping
    />
  );
};

export default GenericSimpleSelect; 