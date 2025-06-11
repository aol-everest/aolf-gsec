import React from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { Controller, Control, useWatch } from 'react-hook-form';
import { StatusMap, SubStatusMap, StatusSubStatusMapping } from '../models/types';
import { EnumSelect } from './EnumSelect';

interface ValidationErrors {
  status?: string;
  sub_status?: string;
  appointment_type?: string;
}

interface StatusSelectorProps {
  control: Control<any>;
  validationErrors: ValidationErrors;
  statusMap: StatusMap;
  subStatusMap: SubStatusMap;
  allSubStatusOptions: string[];
  statusSubStatusMapping: StatusSubStatusMapping | undefined;
  showAppointmentType?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  control,
  validationErrors,
  statusMap,
  subStatusMap,
  allSubStatusOptions,
  statusSubStatusMapping,
  showAppointmentType = true,
}) => {
  // Watch the selected status to filter sub-status options
  const watchStatus = useWatch({
    control,
    name: 'status',
  });

  return (
    <>
      {/* Status */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.status}>
              <EnumSelect
                enumType="appointmentStatus"
                label="Status"
                {...field}
              />
              {validationErrors.status && (
                <FormHelperText error>{validationErrors.status}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Sub-Status */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="sub_status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.sub_status}>
              <InputLabel>Sub-Status</InputLabel>
              <Select
                {...field}
                label="Sub-Status"
                value={field.value || ''}
              >
                {allSubStatusOptions.map((option) => {
                  // Determine if this option should be disabled based on the API mapping
                  const isDisabled = Boolean(
                    watchStatus && 
                    statusSubStatusMapping && 
                    statusSubStatusMapping[watchStatus] && 
                    statusSubStatusMapping[watchStatus].valid_sub_statuses &&
                    !statusSubStatusMapping[watchStatus].valid_sub_statuses.includes(option)
                  );
                  
                  return (
                    <MenuItem 
                      key={option} 
                      value={option}
                      disabled={isDisabled}
                      sx={{
                        '&.Mui-disabled': {
                          opacity: 0.3,
                        }
                      }}
                    >
                      {option}
                    </MenuItem>
                  );
                })}
              </Select>
              {validationErrors.sub_status && (
                <FormHelperText error>{validationErrors.sub_status}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Appointment Type */}
      {showAppointmentType && (
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="appointment_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!validationErrors.appointment_type}>
                <EnumSelect
                  enumType="appointmentType"
                  label="Appointment Type"
                  {...field}
                />
                {validationErrors.appointment_type && (
                  <FormHelperText error>{validationErrors.appointment_type}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
      )}
    </>
  );
};

export default StatusSelector; 