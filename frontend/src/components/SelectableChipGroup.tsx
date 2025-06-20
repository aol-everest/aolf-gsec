import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

interface SelectableChipGroupProps {
  options: string[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  title?: string;
  description?: string;
  helperText?: string;
  disabled?: boolean;
  multiple?: boolean;
  selectedValues?: string[];
  onMultipleSelectionChange?: (values: string[]) => void;
  sx?: any;
}

export const SelectableChipGroup: React.FC<SelectableChipGroupProps> = ({
  options,
  selectedValue,
  onSelectionChange,
  title,
  description,
  helperText,
  disabled = false,
  multiple = false,
  selectedValues = [],
  onMultipleSelectionChange,
  sx = {}
}) => {
  const handleChipClick = (option: string) => {
    if (disabled) return;
    
    if (multiple && onMultipleSelectionChange) {
      const newSelectedValues = selectedValues.includes(option)
        ? selectedValues.filter(v => v !== option)
        : [...selectedValues, option];
      onMultipleSelectionChange(newSelectedValues);
    } else {
      onSelectionChange(option);
    }
  };

  const isSelected = (option: string) => {
    if (multiple) {
      return selectedValues.includes(option);
    }
    return selectedValue === option;
  };

  return (
    <Box sx={{ ...sx }}>
      {title && (
        <Typography variant="subtitle1" gutterBottom sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        {options.map((option) => (
          <Chip 
            key={option}
            label={option}
            variant={isSelected(option) ? "filled" : "outlined"}
            onClick={() => handleChipClick(option)}
            disabled={disabled}
            sx={{
              height: '32px',
              pl: 0.5,
              pr: 0.5,
              color: isSelected(option) ? '#3D8BE8' : '#9598A6',
              border: `1px solid ${isSelected(option) ? 'rgba(61, 139, 232, 0.2)' : 'rgba(149, 152, 166, 0.2)'}`,
              fontSize: '0.81rem',
              fontWeight: isSelected(option) ? '600' : '500',
              backgroundColor: isSelected(option) ? 'rgba(61, 139, 232, 0.1)' : '#fff',
              borderRadius: '13px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              '&:hover': {
                color: disabled ? undefined : '#3D8BE8',
                border: disabled ? undefined : '1px solid rgba(61, 139, 232, 0.2)',
                fontWeight: disabled ? undefined : '500',
                backgroundColor: disabled ? undefined : 'rgba(61, 139, 232, 0.1)',
              },
              '&.MuiChip-filled': {
                color: '#3D8BE8',
                fontWeight: '600',
                border: '1px solid rgba(61, 139, 232, 0.2)',
              },
              '&.Mui-disabled': {
                opacity: 0.6,
                '&:hover': {
                  backgroundColor: 'transparent',
                }
              }
            }}
          />
        ))}
      </Box>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default SelectableChipGroup; 