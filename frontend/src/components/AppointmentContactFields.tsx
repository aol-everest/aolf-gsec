import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import {
  Grid,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  TextField,
} from '@mui/material';
import { EnumSelect } from './EnumSelect';

// Interface matching appointmentContact.py engagement fields
export interface AppointmentEngagementData {
  role_in_team_project?: string;
  role_in_team_project_other?: string;
  comments?: string;
  has_met_gurudev_recently?: boolean | null;
  is_attending_course?: boolean | null;
  course_attending?: string;
  is_doing_seva?: boolean | null;
  seva_type?: string;
}

interface AppointmentContactFieldsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  fieldPrefix?: string; // Prefix for field names (e.g., 'engagement.')
  showRoleFields?: boolean; // Whether to show team project role fields
  showAllFields?: boolean; // Whether to show all engagement fields
}

export const AppointmentContactFields: React.FC<AppointmentContactFieldsProps> = ({
  control,
  errors,
  fieldPrefix = '',
  showRoleFields = false,
  showAllFields = true,
}) => {
  const getFieldName = (fieldName: string) => fieldPrefix ? `${fieldPrefix}${fieldName}` : fieldName;
  const getFieldError = (fieldName: string) => {
    if (fieldPrefix) {
      const prefixError = errors[fieldPrefix];
      return prefixError && typeof prefixError === 'object' ? (prefixError as any)[fieldName] : undefined;
    }
    return errors[fieldName];
  };

  return (
    <>
      {/* Team Project Role Fields */}
      {showRoleFields && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Team Project Information
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name={getFieldName('role_in_team_project')}
              control={control}
              render={({ field }) => (
                <EnumSelect
                  enumType="roleInTeamProject"
                  label="Role in Team/Project"
                  error={!!getFieldError('role_in_team_project')}
                  helperText={getFieldError('role_in_team_project')?.message}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name={getFieldName('role_in_team_project_other')}
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="Other Role (if applicable)"
                  InputLabelProps={{ shrink: true }}
                  error={!!getFieldError('role_in_team_project_other')}
                  helperText={getFieldError('role_in_team_project_other')?.message}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>
        </>
      )}

      {/* Engagement and Participation Fields */}
      {showAllFields && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Engagement & Participation
            </Typography>
          </Grid>

          {/* Has Met Gurudev Recently */}
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset" error={!!getFieldError('has_met_gurudev_recently')}>
              <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                Have you met Gurudev recently?
              </FormLabel>
              <Controller
                name={getFieldName('has_met_gurudev_recently')}
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    row
                    value={field.value === null ? '' : field.value?.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? null : value === 'true');
                    }}
                  >
                    <FormControlLabel value="true" control={<Radio />} label="Yes" />
                    <FormControlLabel value="false" control={<Radio />} label="No" />
                    <FormControlLabel value="" control={<Radio />} label="Prefer not to answer" />
                  </RadioGroup>
                )}
              />
            </FormControl>
          </Grid>

          {/* Is Attending Course */}
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset" error={!!getFieldError('is_attending_course')}>
              <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                Are you currently attending any course?
              </FormLabel>
              <Controller
                name={getFieldName('is_attending_course')}
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    row
                    value={field.value === null ? '' : field.value?.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? null : value === 'true');
                    }}
                  >
                    <FormControlLabel value="true" control={<Radio />} label="Yes" />
                    <FormControlLabel value="false" control={<Radio />} label="No" />
                    <FormControlLabel value="" control={<Radio />} label="Prefer not to answer" />
                  </RadioGroup>
                )}
              />
            </FormControl>
          </Grid>

          {/* Course Attending */}
          <Grid item xs={12} md={6}>
            <Controller
              name={getFieldName('course_attending')}
              control={control}
              render={({ field }) => (
                <EnumSelect
                  enumType="courseType"
                  label="Which course are you attending?"
                  error={!!getFieldError('course_attending')}
                  helperText={getFieldError('course_attending')?.message}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>

          {/* Is Doing Seva */}
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset" error={!!getFieldError('is_doing_seva')}>
              <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                Are you currently doing seva?
              </FormLabel>
              <Controller
                name={getFieldName('is_doing_seva')}
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    row
                    value={field.value === null ? '' : field.value?.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? null : value === 'true');
                    }}
                  >
                    <FormControlLabel value="true" control={<Radio />} label="Yes" />
                    <FormControlLabel value="false" control={<Radio />} label="No" />
                    <FormControlLabel value="" control={<Radio />} label="Prefer not to answer" />
                  </RadioGroup>
                )}
              />
            </FormControl>
          </Grid>

          {/* Seva Type */}
          <Grid item xs={12} md={6}>
            <Controller
              name={getFieldName('seva_type')}
              control={control}
              render={({ field }) => (
                <EnumSelect
                  enumType="sevaType"
                  label="What type of seva are you doing?"
                  error={!!getFieldError('seva_type')}
                  helperText={getFieldError('seva_type')?.message}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>
        </>
      )}
    </>
  );
}; 