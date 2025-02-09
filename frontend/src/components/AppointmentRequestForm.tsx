import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

interface AppointmentFormData {
  dignitary: string;
  date: string;
  time: string;
  purpose: string;
}

export const AppointmentRequestForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentFormData>();

  const onSubmit = (data: AppointmentFormData) => {
    // TODO: Submit to API
    console.log(data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="dignitary-label">Select Dignitary</InputLabel>
        <Select
          labelId="dignitary-label"
          label="Select Dignitary"
          {...register('dignitary', { required: 'Please select a dignitary' })}
          error={!!errors.dignitary}
        >
          <MenuItem value="Sri Sri Ravi Shankar">Sri Sri Ravi Shankar</MenuItem>
          <MenuItem value="John Doe">John Doe</MenuItem>
          <MenuItem value="Jane Smith">Jane Smith</MenuItem>
        </Select>
        {errors.dignitary && (
          <Typography color="error" variant="caption">
            {errors.dignitary.message}
          </Typography>
        )}
      </FormControl>

      <TextField
        fullWidth
        type="date"
        label="Preferred Date"
        InputLabelProps={{ shrink: true }}
        {...register('date', { required: 'Please select a date' })}
        error={!!errors.date}
        helperText={errors.date?.message}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        type="time"
        label="Preferred Time"
        InputLabelProps={{ shrink: true }}
        {...register('time', { required: 'Please select a time' })}
        error={!!errors.time}
        helperText={errors.time?.message}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Purpose of Meeting"
        {...register('purpose', { required: 'Please provide the purpose of meeting' })}
        error={!!errors.purpose}
        helperText={errors.purpose?.message}
        sx={{ mb: 2 }}
      />

      <Button type="submit" variant="contained" fullWidth>
        Submit Request
      </Button>
    </Box>
  );
};

export default AppointmentRequestForm; 