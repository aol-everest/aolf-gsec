import React from 'react';
import { GenericSelect } from './GenericSelect';
import { useEnums } from '../../hooks/useEnums';

interface HonorificTitleSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  priorityTitles?: string[];
  showDivider?: boolean;
  placeholder?: string;
  allowedTitles?: string[];
}

export const HonorificTitleSelect: React.FC<HonorificTitleSelectProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  priorityTitles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', '(Not Applicable)'],
  showDivider = true,
  placeholder = "Select honorific title",
  allowedTitles
}) => {
  // Fetch honorific title options from the API
  const { values: honorificTitles, isLoading } = useEnums('honorificTitle');

  // Filter priority titles that actually exist in the API data
  const availablePriorityTitles = priorityTitles.filter(title => 
    honorificTitles.includes(title)
  );

  return (
    <GenericSelect
      label={label}
      value={value}
      onChange={onChange}
      options={honorificTitles}
      disabled={disabled || isLoading}
      error={error}
      helperText={helperText || (isLoading ? "Loading titles..." : "")}
      required={required}
      fullWidth={fullWidth}
      priorityOptions={availablePriorityTitles}
      showDivider={showDivider}
      placeholder={placeholder}
      allowedOptions={allowedTitles}
      loading={isLoading}
      priorityGroupLabel="Common Titles"
      otherGroupLabel="Other Titles"
      showPriorityChips={true}
    />
  );
};

export default HonorificTitleSelect; 