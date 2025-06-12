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
import { useQuery } from '@tanstack/react-query';
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
import { useApi } from '../hooks/useApi';

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

interface SubdivisionData {
  id: number;
  country_code: string;
  subdivision_code: string;
  name: string;
  subdivision_type: string;
  is_enabled: boolean;
  full_code: string;
}

interface SubdivisionStateDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStateCodeChange?: (stateCode: string) => void;
  error?: boolean;
  helperText?: string;
  countryCode?: string;
  disabled?: boolean;
}

const SubdivisionStateDropdown: React.FC<SubdivisionStateDropdownProps> = ({
  label,
  value = '',
  onChange,
  onStateCodeChange,
  error,
  helperText,
  countryCode,
  disabled = false,
}) => {
  const api = useApi();
  
  // Fetch subdivisions for the selected country
  const { data: subdivisions = [], isLoading: subdivisionsLoading } = useQuery({
    queryKey: ['subdivisions', countryCode],
    queryFn: async () => {
      if (!countryCode) return [];
      try {
        const { data } = await api.get<SubdivisionData[]>(`/subdivisions/country/${countryCode}`);
        return data;
      } catch (error) {
        console.error('Error fetching subdivisions:', error);
        return [];
      }
    },
    enabled: !!countryCode,
  });

  const handleStateChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const selectedStateName = event.target.value as string;
    const selectedState = subdivisions.find(subdivision => subdivision.name === selectedStateName);
    
    onChange(selectedStateName);
    
    if (selectedState && onStateCodeChange) {
      onStateCodeChange(selectedState.subdivision_code);
    }
  };

  if (!countryCode) {
    return (
      <TextField
        select
        fullWidth
        label={label}
        value=""
        disabled={true}
        helperText="Please select a country first"
        error={error}
      >
        <MenuItem value="">Select a country first</MenuItem>
      </TextField>
    );
  }

  return (
    <TextField
      select
      fullWidth
      label={label}
      value={value}
      onChange={handleStateChange}
      disabled={disabled || subdivisionsLoading}
      error={error}
      helperText={subdivisionsLoading ? "Loading states/provinces..." : helperText}
    >
      {subdivisions.length === 0 && !subdivisionsLoading && (
        <MenuItem value="">No states/provinces available</MenuItem>
      )}
      {subdivisions.map((subdivision) => (
        <MenuItem key={subdivision.subdivision_code} value={subdivision.name}>
          {subdivision.name} ({subdivision.subdivision_type})
        </MenuItem>
      ))}
    </TextField>
  );
};

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
  dignitaryStateCode: string;
  dignitaryCity: string;
  dignitaryHasMetGurudev: boolean;
  pocRelationshipType?: string;
  dignitaryGurudevMeetingDate: string;
  dignitaryGurudevMeetingLocation: string;
  dignitaryGurudevMeetingNotes: string;
}

type DignitarySelectorMode = 'user' | 'admin';

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
  mode?: DignitarySelectorMode;
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
  mode = 'admin',
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
      dignitaryStateCode: '',
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      pocRelationshipType: '',
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

  // Determine which fields to show based on mode
  const isUserMode = mode === 'user';
  const isAdminMode = mode === 'admin';

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
                  {dignitary.title_in_organization && (
                    <Typography variant="body2" color="text.secondary">
                      {dignitary.title_in_organization}
                    </Typography>
                  )}
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
              <Box>
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
                    /* New Dignitary Form - Full Form */
                    <>
                      {/* Honorific Title */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Controller
                          name="dignitaryHonorificTitle"
                          control={dignitaryForm.control}
                          rules={{ required: 'Honorific title is required' }}
                          render={({ field }) => (
                            <EnumSelect
                              enumType="honorificTitle"
                              label="Honorific Title"
                              required
                              error={!!dignitaryForm.formState.errors.dignitaryHonorificTitle}
                              helperText={dignitaryForm.formState.errors.dignitaryHonorificTitle?.message}
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      </Grid>

                      {/* First Name */}
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          label="First Name"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryFirstName', { required: 'First name is required' })}
                          error={!!dignitaryForm.formState.errors.dignitaryFirstName}
                          helperText={dignitaryForm.formState.errors.dignitaryFirstName?.message}
                          required
                        />
                      </Grid>

                      {/* Last Name */}
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryLastName', { required: 'Last name is required' })}
                          error={!!dignitaryForm.formState.errors.dignitaryLastName}
                          helperText={dignitaryForm.formState.errors.dignitaryLastName?.message}
                          required
                        />
                      </Grid>

                      {/* Email */}
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryEmail', { required: 'Email is required' })}
                          error={!!dignitaryForm.formState.errors.dignitaryEmail}
                          helperText={dignitaryForm.formState.errors.dignitaryEmail?.message}
                          required
                        />
                      </Grid>

                      {/* Phone */}
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryPhone')}
                          error={!!dignitaryForm.formState.errors.dignitaryPhone}
                          helperText={dignitaryForm.formState.errors.dignitaryPhone?.message}
                        />
                      </Grid>

                      {/* Organization */}
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          label="Organization"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryOrganization')}
                          error={!!dignitaryForm.formState.errors.dignitaryOrganization}
                          helperText={dignitaryForm.formState.errors.dignitaryOrganization?.message}
                        />
                      </Grid>

                      {/* Title in Organization */}
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          label="Title in Organization"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryTitleInOrganization')}
                          error={!!dignitaryForm.formState.errors.dignitaryTitleInOrganization}
                          helperText={dignitaryForm.formState.errors.dignitaryTitleInOrganization?.message}
                        />
                      </Grid>

                      {/* Primary Domain */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Controller
                          name="dignitaryPrimaryDomain"
                          control={dignitaryForm.control}
                          render={({ field }) => (
                            <EnumSelect
                              enumType="primaryDomain"
                              label="Primary Domain"
                              required
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      </Grid>

                      {/* Primary Domain Other - Show only when "Other" is selected */}
                      {watchPrimaryDomain?.toLowerCase() === 'other' && (
                        <Grid item xs={12} md={6} lg={4}>
                          <TextField
                            fullWidth
                            label="Please specify domain"
                            InputLabelProps={{ shrink: true }}
                            {...dignitaryForm.register('dignitaryPrimaryDomainOther', { 
                              required: 'Please specify the domain' 
                            })}
                            error={!!dignitaryForm.formState.errors.dignitaryPrimaryDomainOther}
                            helperText={dignitaryForm.formState.errors.dignitaryPrimaryDomainOther?.message}
                            required
                            inputProps={{
                              maxLength: 255
                            }}
                          />
                        </Grid>
                      )}

                      {/* Bio Summary */}
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="Bio Summary"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryBioSummary', { required: 'Bio summary is required' })}
                          error={!!dignitaryForm.formState.errors.dignitaryBioSummary}
                          helperText={dignitaryForm.formState.errors.dignitaryBioSummary?.message}
                          required
                        />
                      </Grid>

                      {/* LinkedIn or Website */}
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="LinkedIn or Website URL"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryLinkedInOrWebsite')}
                          error={!!dignitaryForm.formState.errors.dignitaryLinkedInOrWebsite}
                          helperText={dignitaryForm.formState.errors.dignitaryLinkedInOrWebsite?.message}
                        />
                      </Grid>

                      {/* Country */}
                      <Grid item xs={12} md={4}>
                        <Controller
                          name="dignitaryCountryCode"
                          control={dignitaryForm.control}
                          rules={{ required: 'Country is required' }}
                          render={({ field }) => (
                            <TextField
                              select
                              fullWidth
                              label="Country"
                              value={field.value || ''}
                              onChange={(e) => {
                                const countryCode = e.target.value;
                                field.onChange(countryCode);
                                
                                // Find the selected country to get its name
                                const selectedCountry = countries.find(c => c.iso2_code === countryCode);
                                if (selectedCountry) {
                                  dignitaryForm.setValue('dignitaryCountry', selectedCountry.name);
                                  // Update selectedCountryCode for state and city autocomplete
                                  setSelectedCountryCode(countryCode);
                                }
                                
                                // Reset state, state code, and city when country changes
                                dignitaryForm.setValue('dignitaryState', '');
                                dignitaryForm.setValue('dignitaryStateCode', '');
                                dignitaryForm.setValue('dignitaryCity', '');
                              }}
                              disabled={isLoadingCountries}
                              error={!!dignitaryForm.formState.errors.dignitaryCountryCode}
                              helperText={dignitaryForm.formState.errors.dignitaryCountryCode?.message || (isLoadingCountries ? "Loading countries..." : "")}
                              required
                            >
                              <MenuItem value="">
                                <em>Select a country</em>
                              </MenuItem>
                              {countries.map((country) => (
                                <MenuItem key={country.iso2_code} value={country.iso2_code}>
                                  {country.name} ({country.iso2_code})
                                </MenuItem>
                              ))}
                            </TextField>
                          )}
                        />
                      </Grid>

                      {/* State */}
                      <Grid item xs={12} md={4}>
                        <Controller
                          name="dignitaryState"
                          control={dignitaryForm.control}
                          render={({ field }) => (
                            <SubdivisionStateDropdown
                              label="State/Province"
                              value={field.value}
                              onChange={field.onChange}
                              onStateCodeChange={(stateCode) => {
                                dignitaryForm.setValue('dignitaryStateCode', stateCode);
                              }}
                              countryCode={selectedCountryCode}
                              error={!!dignitaryForm.formState.errors.dignitaryState}
                              helperText={dignitaryForm.formState.errors.dignitaryState?.message}
                            />
                          )}
                        />
                      </Grid>

                      {/* City */}
                      <Grid item xs={12} md={4}>
                        <Controller
                          name="dignitaryCity"
                          control={dignitaryForm.control}
                          render={({ field }) => (
                            <LocationAutocomplete
                              label="City"
                              value={field.value}
                              onChange={(value) => {
                                field.onChange(value.split(',')[0]);
                              }}
                              error={!!dignitaryForm.formState.errors.dignitaryCity}
                              helperText={dignitaryForm.formState.errors.dignitaryCity?.message}
                              types={['locality', 'sublocality']}
                              autoComplete="off"
                              componentRestrictions={selectedCountryCode ? { country: selectedCountryCode } : undefined}
                            />
                          )}
                        />
                      </Grid>

                      {/* Has Met Gurudev */}
                      <Grid item xs={12} md={6} lg={4}>
                        <FormControl component="fieldset">
                          <FormLabel component="legend">Has Dignitary Met Gurudev?</FormLabel>
                          <RadioGroup
                            row
                            value={watchHasMetGurudev ? watchHasMetGurudev.toString() : 'false'}
                            onChange={(e) => {
                              const value = e.target.value === 'true';
                              dignitaryForm.setValue('dignitaryHasMetGurudev', value);
                              
                              // Clear meeting details if changing from Yes to No
                              if (!value) {
                                dignitaryForm.setValue('dignitaryGurudevMeetingDate', '');
                                dignitaryForm.setValue('dignitaryGurudevMeetingLocation', '');
                                dignitaryForm.setValue('dignitaryGurudevMeetingNotes', '');
                              }
                            }}
                          >
                            <FormControlLabel value="true" control={<Radio />} label="Yes" />
                            <FormControlLabel value="false" control={<Radio />} label="No" />
                          </RadioGroup>
                        </FormControl>
                      </Grid>

                      {/* Gurudev Meeting Details - Show only if has met Gurudev */}
                      {watchHasMetGurudev && (
                        <>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Meeting Date"
                              type="date"
                              InputLabelProps={{ shrink: true }}
                              {...dignitaryForm.register('dignitaryGurudevMeetingDate')}
                              error={!!dignitaryForm.formState.errors.dignitaryGurudevMeetingDate}
                              helperText={dignitaryForm.formState.errors.dignitaryGurudevMeetingDate?.message}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Meeting Location"
                              InputLabelProps={{ shrink: true }}
                              {...dignitaryForm.register('dignitaryGurudevMeetingLocation')}
                              error={!!dignitaryForm.formState.errors.dignitaryGurudevMeetingLocation}
                              helperText={dignitaryForm.formState.errors.dignitaryGurudevMeetingLocation?.message}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="Meeting Notes"
                              InputLabelProps={{ shrink: true }}
                              {...dignitaryForm.register('dignitaryGurudevMeetingNotes')}
                              error={!!dignitaryForm.formState.errors.dignitaryGurudevMeetingNotes}
                              helperText={dignitaryForm.formState.errors.dignitaryGurudevMeetingNotes?.message}
                            />
                          </Grid>
                        </>
                      )}

                      {/* POC Relationship Type - Show only for user mode */}
                      {isUserMode && (
                        <Grid item xs={12} md={6}>
                          <Controller
                            name="pocRelationshipType"
                            control={dignitaryForm.control}
                            rules={{ required: 'Relationship type is required' }}
                            render={({ field }) => (
                              <EnumSelect
                                enumType="relationshipType"
                                label="Your Relationship to Dignitary"
                                required
                                value={field.value}
                                onChange={field.onChange}
                                error={!!dignitaryForm.formState.errors.pocRelationshipType}
                                helperText={dignitaryForm.formState.errors.pocRelationshipType?.message}
                              />
                            )}
                          />
                        </Grid>
                      )}
                    </>
                  )}

                  {/* Action Buttons */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <SecondaryButton onClick={() => setShowAddForm(false)}>
                        Cancel
                      </SecondaryButton>
                      <PrimaryButton
                        type="button"
                        onClick={dignitaryForm.handleSubmit(
                          watchIsExisting ? handleAddExistingDignitary : handleCreateNewDignitary
                        )}
                      >
                        {watchIsExisting ? 'Add Selected' : 'Create & Add'}
                      </PrimaryButton>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
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