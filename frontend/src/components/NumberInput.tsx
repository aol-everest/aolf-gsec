import React from 'react';
import {
  TextField,
  IconButton,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  increment?: number;
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 100,
  increment = 1,
  label,
  error,
  helperText,
  required,
  fullWidth = true,
  disabled = false,
}) => {
  const handleIncrement = () => {
    if (!disabled && value < max) {
      const newValue = Math.min(value + increment, max);
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    if (!disabled && value > min) {
      const newValue = Math.max(value - increment, min);
      onChange(newValue);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <TextField
      fullWidth={fullWidth}
      type="number"
      label={label}
      value={value || ''}
      onChange={handleInputChange}
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      InputLabelProps={{ shrink: true }}
      inputProps={{ 
        min, 
        max,
        style: { textAlign: 'center' }
      }}
      sx={{
        '& input[type=number]': {
          '-moz-appearance': 'textfield',
        },
        '& input[type=number]::-webkit-outer-spin-button': {
          '-webkit-appearance': 'none',
          margin: 0,
        },
        '& input[type=number]::-webkit-inner-spin-button': {
          '-webkit-appearance': 'none',
          margin: 0,
        },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <IconButton
              onClick={handleDecrement}
              disabled={disabled || value <= min}
              size="small"
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '4px',
                width: 32,
                height: 32,
              }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={handleIncrement}
              disabled={disabled || value >= max}
              size="small"
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '4px',
                width: 32,
                height: 32,
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default NumberInput; 