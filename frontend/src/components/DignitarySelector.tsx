import React, { useState } from 'react';
import {
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
  Box,
  Card,
  CardContent,
  IconButton,
  Divider,
  Collapse,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from '@mui/material';
import { Controller, Control, useForm } from 'react-hook-form';
import { Dignitary } from '../models/types';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { EnumSelect } from './EnumSelect';
import LocationAutocomplete from './LocationAutocomplete';
import { PrimaryButton } from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { PencilIconV2, TrashIconV2 } from './iconsv2';
import AddIcon from '@mui/icons-material/LibraryAdd';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ValidationErrors {
  selectedDignitaryId?: string;
  dignitaryFirstName?: string;
  dignitaryLastName?: string;
  dignitaryEmail?: string;
  dignitaryHonorificTitle?: string;
  dignitaryBioSummary?: string;
  dignitaryCountryCode?: string;
  dignitaryPrimaryDomain?: string;
  dignitaryPrimaryDomainOther?: string;
}

interface DignitaryFormData {
  isExistingDignitary: boolean;
  selectedDignitaryId?: number;
  dignitaryHonorificTitle: string;
  dignitaryFirstName: string;
  dignitaryLastName: string;
  dignitaryEmail: string;
  dignitaryPhone: string;
  dignitaryPrimaryDomain: string;
  dignitaryPrimaryDomainOther: string;
  dignitaryTitleInOrganization: string;
  dignitaryOrganization: string;
  dignitaryBioSummary: string;
  dignitaryLinkedInOrWebsite: string;
  dignitaryCountry: string;
  dignitaryCountryCode: string;
  dignitaryState: string;
  dignitaryCity: string;
  dignitaryHasMetGurudev: boolean;
  dignitaryGurudevMeetingDate: string;
  dignitaryGurudevMeetingLocation: string;
  dignitaryGurudevMeetingNotes: string;
}

interface DignitarySelectorProps {
  dignitaries: Dignitary[];
  selectedDignitaries: Dignitary[];
  onDignitaryAdd: (dignitary: Dignitary) => void;
  onDignitaryRemove: (index: number) => void;
  onDignitaryCreate: (formData: DignitaryFormData) => Promise<Dignitary>;
  countries: Array<{ iso2_code: string; name: string }>;
  isLoadingCountries: boolean;
  maxDignitaries?: number;
  required?: boolean;
  title?: string;
  description?: string;
}

export const DignitarySelector: React.FC<DignitarySelectorProps> = ({
  dignitaries,
  selectedDignitaries,
  onDignitaryAdd,
  onDignitaryRemove,
  onDignitaryCreate,
  countries,
  isLoadingCountries,
  maxDignitaries = 8,
  required = false,
  title = "Select Dignitaries",
  description = "Select existing dignitaries or create new ones for this appointment.",
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

  const dignitaryForm = useForm<DignitaryFormData>({
    defaultValues: {
      isExistingDignitary: false,
      selectedDignitaryId: undefined,
      dignitaryHonorificTitle: '(Not Applicable)',
      dignitaryFirstName: '',
      dignitaryLastName: '',
      dignitaryEmail: '',
      dignitaryPhone: '',
      dignitaryPrimaryDomain: '',
      dignitaryPrimaryDomainOther: '',
      dignitaryTitleInOrganization: '',
      dignitaryOrganization: '',
      dignitaryBioSummary: '',
      dignitaryLinkedInOrWebsite: '',
      dignitaryCountry: '',
      dignitaryCountryCode: '',
      dignitaryState: '',
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      dignitaryGurudevMeetingDate: '',
      dignitaryGurudevMeetingLocation: '',
      dignitaryGurudevMeetingNotes: '',
    }
  });

  const watchIsExisting = dignitaryForm.watch('isExistingDignitary');
  const watchSelectedId = dignitaryForm.watch('selectedDignitaryId');
  const watchPrimaryDomain = dignitaryForm.watch('dignitaryPrimaryDomain');
  const watchHasMetGurudev = dignitaryForm.watch('dignitaryHasMetGurudev');

  const handleAddExistingDignitary = () => {
    const selectedDignitary = dignitaries.find(d => d.id === watchSelectedId);
    if (selectedDignitary) {
      onDignitaryAdd(selectedDignitary);
      dignitaryForm.reset();
      setShowAddForm(false);
    }
  };

  const handleCreateNewDignitary = async (data: DignitaryFormData) => {
    try {
      const newDignitary = await onDignitaryCreate(data);
      onDignitaryAdd(newDignitary);
      dignitaryForm.reset();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating dignitary:', error);
    }
  };

  const availableDignitaries = dignitaries.filter(
    d => !selectedDignitaries.some(selected => selected.id === d.id)
  );

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {description}
        </Typography>
      </Grid>

      {/* Selected Dignitaries Display */}
      {selectedDignitaries.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Dignitaries ({selectedDignitaries.length}/{maxDignitaries})
          </Typography>
          {selectedDignitaries.map((dignitary, index) => (
            <Card key={dignitary.id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2">
                    {formatHonorificTitle(dignitary.honorific_title || '')} {dignitary.first_name} {dignitary.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dignitary.email} • {dignitary.organization}
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => onDignitaryRemove(index)}
                  color="error"
                  size="small"
                >
                  <TrashIconV2 />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </Grid>
      )}

      {/* Add Dignitary Section */}
      {selectedDignitaries.length < maxDignitaries && (
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setShowAddForm(!showAddForm)}
              sx={{ textTransform: 'none' }}
            >
              {showAddForm ? 'Cancel' : 'Add Dignitary'}
            </Button>
            {showAddForm && (
              <IconButton onClick={() => setShowAddForm(false)}>
                <ExpandLessIcon />
              </IconButton>
            )}
          </Box>

          <Collapse in={showAddForm}>
            <Card variant="outlined" sx={{ p: 3 }}>
              <form onSubmit={dignitaryForm.handleSubmit(watchIsExisting ? handleAddExistingDignitary : handleCreateNewDignitary)}>
                <Grid container spacing={3}>
                  {/* Existing vs New Toggle */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Dignitary Source</FormLabel>
                      <RadioGroup
                        row
                        value={watchIsExisting.toString()}
                        onChange={(e) => {
                          const isExisting = e.target.value === 'true';
                          dignitaryForm.setValue('isExistingDignitary', isExisting);
                        }}
                      >
                        <FormControlLabel value="true" control={<Radio />} label="Select Existing" />
                        <FormControlLabel value="false" control={<Radio />} label="Create New" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {watchIsExisting ? (
                    /* Existing Dignitary Selection */
                    <Grid item xs={12}>
                      <Controller
                        name="selectedDignitaryId"
                        control={dignitaryForm.control}
                        rules={{ required: 'Please select a dignitary' }}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!dignitaryForm.formState.errors.selectedDignitaryId}>
                            <InputLabel>Select Dignitary</InputLabel>
                            <Select
                              {...field}
                              label="Select Dignitary"
                              value={field.value || ''}
                            >
                              <MenuItem value="">
                                <em>Select a dignitary</em>
                              </MenuItem>
                              {availableDignitaries.map((dignitary) => (
                                <MenuItem key={dignitary.id} value={dignitary.id}>
                                  {formatHonorificTitle(dignitary.honorific_title || '')} {dignitary.first_name} {dignitary.last_name} - {dignitary.organization}
                                </MenuItem>
                              ))}
                            </Select>
                            {dignitaryForm.formState.errors.selectedDignitaryId && (
                              <FormHelperText>{dignitaryForm.formState.errors.selectedDignitaryId.message}</FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    </Grid>
                  ) : (
                    /* New Dignitary Form - Simplified */
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="First Name"
                          {...dignitaryForm.register('dignitaryFirstName', { required: 'First name is required' })}
                          error={!!dignitaryForm.formState.errors.dignitaryFirstName}
                          helperText={dignitaryForm.formState.errors.dignitaryFirstName?.message}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          {...dignitaryForm.register('dignitaryLastName', { required: 'Last name is required' })}
                          error={!!dignitaryForm.formState.errors.dignitaryLastName}
                          helperText={dignitaryForm.formState.errors.dignitaryLastName?.message}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          {...dignitaryForm.register('dignitaryEmail', { required: 'Email is required' })}
                          error={!!dignitaryForm.formState.errors.dignitaryEmail}
                          helperText={dignitaryForm.formState.errors.dignitaryEmail?.message}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Organization"
                          {...dignitaryForm.register('dignitaryOrganization')}
                        />
                      </Grid>
                    </>
                  )}

                  {/* Action Buttons */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <SecondaryButton onClick={() => setShowAddForm(false)}>
                        Cancel
                      </SecondaryButton>
                      <PrimaryButton type="submit">
                        {watchIsExisting ? 'Add Selected' : 'Create & Add'}
                      </PrimaryButton>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Card>
          </Collapse>
        </Grid>
      )}

      {/* Validation message for required field */}
      {required && selectedDignitaries.length === 0 && (
        <Grid item xs={12}>
          <Typography variant="body2" color="error">
            At least one dignitary is required for this appointment.
          </Typography>
        </Grid>
      )}
    </Grid>
  );
};

export default DignitarySelector; 