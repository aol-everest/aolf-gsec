import React from 'react';
import { GenericSelect } from './GenericSelect';
import { useEnums } from '../../hooks/useEnums';

interface PrimaryDomainSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
}

export const PrimaryDomainSelect: React.FC<PrimaryDomainSelectProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  placeholder = "Select primary domain"
}) => {
  // Fetch primary domain options from the API
  const { values: primaryDomains, isLoading } = useEnums('primaryDomain');

  // // Define common/priority domains that should appear first
  // const priorityDomains = ['Business', 'Government', 'Education', 'Healthcare', 'Technology'];

  // // Filter priority domains that actually exist in the API data
  // const availablePriorityDomains = priorityDomains.filter(domain => 
  //   primaryDomains.includes(domain)
  // );

  return (
    <GenericSelect
      label={label}
      value={value}
      onChange={onChange}
      options={primaryDomains}
      disabled={disabled || isLoading}
      error={error}
      helperText={helperText || (isLoading ? "Loading domains..." : "")}
      required={required}
      fullWidth={fullWidth}
      // priorityOptions={availablePriorityDomains}
      placeholder={placeholder}
      loading={isLoading}
      // priorityGroupLabel="Common Domains"
      // otherGroupLabel="Other Domains"
      // priorityChipLabel="Common"
      // showPriorityChips={true}
      // showDivider={true}
    />
  );
};

export default PrimaryDomainSelect; 