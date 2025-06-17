import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Grid,
  Typography,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  Collapse,
  IconButton,
  Divider,
  FormHelperText,
  Autocomplete,
  Chip,
} from '@mui/material';
import { Dignitary } from '../../models/types';
import { formatHonorificTitle } from '../../utils/formattingUtils';
import { PersonSelectionChip } from '../PersonSelectionChip';
import { PrimaryButton } from '../PrimaryButton';
import SecondaryButton from '../SecondaryButton';
import { HonorificTitleSelect } from './HonorificTitleSelect';
import { PrimaryDomainSelect } from './PrimaryDomainSelect';
import { CountrySelect } from './CountrySelect';
import { SubdivisionStateDropdown } from './SubdivisionStateDropdown';
import LocationAutocomplete from '../LocationAutocomplete';
import { EnumSelect } from '../EnumSelect';
import AddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Form data interface for dignitary creation/editing
export interface DignitaryFormData {
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

// Extended dignitary interface for selected dignitaries
export interface SelectedDignitary extends Partial<Dignitary> {
  id: number;
  isNew?: boolean;
  relationshipType?: string;
  previousId?: number;
  poc_relationship_type?: string;
  first_name: string;
  last_name: string;
  created_by?: number;
  created_at?: string;
}

// Configuration interface for customizing behavior
export interface DignitarySelectorConfig {
  showRelationshipType?: boolean;
  showGurudevMeetingFields?: boolean;
  showAllFields?: boolean;
  allowCreateNew?: boolean;
  allowEditExisting?: boolean;
  requireBioSummary?: boolean;
  requireOrganization?: boolean;
  maxDignitaries?: number;
  title?: string;
  description?: string;
}

// Props interface for the generic component
export interface GenericDignitarySelectorProps {
  // Data
  dignitaries: Dignitary[];
  selectedDignitaries: SelectedDignitary[];
  
  // Callbacks
  onDignitaryAdd: (dignitary: SelectedDignitary) => void;
  onDignitaryRemove: (index: number) => void;
  onDignitaryCreate: (formData: any) => Promise<Dignitary>;
  onDignitaryUpdate?: (id: number, formData: any) => Promise<Dignitary>;
  
  // Configuration
  config?: DignitarySelectorConfig;
  
  // UI State
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const defaultConfig: DignitarySelectorConfig = {
  showRelationshipType: true,
  showGurudevMeetingFields: true,
  showAllFields: true,
  allowCreateNew: true,
  allowEditExisting: true,
  requireBioSummary: true,
  requireOrganization: false,
  maxDignitaries: 8,
  title: "Select Dignitaries",
  description: "Select existing dignitaries or create new ones for this appointment.",
};

export const GenericDignitarySelector: React.FC<GenericDignitarySelectorProps> = ({
  dignitaries,
  selectedDignitaries,
  onDignitaryAdd,
  onDignitaryRemove,
  onDignitaryCreate,
  onDignitaryUpdate,
  config = {},
  required = false,
  disabled = false,
  error,
}) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  // State management
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDignitaryIndex, setEditingDignitaryIndex] = useState<number | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [isDignitaryModified, setIsDignitaryModified] = useState(false);
  const [selectedDignitary, setSelectedDignitary] = useState<Dignitary | null>(null);

  // Form setup
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

  // Helper functions
  const populateDignitaryForm = (dignitary: Dignitary) => {
    dignitaryForm.setValue('dignitaryHonorificTitle', dignitary.honorific_title);
    dignitaryForm.setValue('dignitaryFirstName', dignitary.first_name);
    dignitaryForm.setValue('dignitaryLastName', dignitary.last_name);
    dignitaryForm.setValue('dignitaryEmail', dignitary.email);
    dignitaryForm.setValue('dignitaryPhone', dignitary.phone || '');
    dignitaryForm.setValue('dignitaryPrimaryDomain', dignitary.primary_domain);
    dignitaryForm.setValue('dignitaryPrimaryDomainOther', dignitary.primary_domain_other || '');
    dignitaryForm.setValue('dignitaryTitleInOrganization', dignitary.title_in_organization);
    dignitaryForm.setValue('dignitaryOrganization', dignitary.organization);
    dignitaryForm.setValue('dignitaryBioSummary', dignitary.bio_summary);
    dignitaryForm.setValue('dignitaryLinkedInOrWebsite', dignitary.linked_in_or_website || '');
    dignitaryForm.setValue('dignitaryCountry', dignitary.country || '');
    dignitaryForm.setValue('dignitaryCountryCode', dignitary.country_code || '');
    
    if (dignitary.country_code) {
      setSelectedCountryCode(dignitary.country_code);
    }
    
    dignitaryForm.setValue('dignitaryState', dignitary.state || '');
    dignitaryForm.setValue('dignitaryStateCode', '');
    dignitaryForm.setValue('dignitaryCity', dignitary.city || '');
    dignitaryForm.setValue('dignitaryHasMetGurudev', dignitary.has_dignitary_met_gurudev);
    dignitaryForm.setValue('dignitaryGurudevMeetingDate', dignitary.gurudev_meeting_date || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingLocation', dignitary.gurudev_meeting_location || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingNotes', dignitary.gurudev_meeting_notes || '');
    
    if (dignitary.relationship_type && finalConfig.showRelationshipType) {
      dignitaryForm.setValue('pocRelationshipType', dignitary.relationship_type);
    }
    
    setIsDignitaryModified(false);
  };

  const resetDignitaryForm = () => {
    dignitaryForm.reset({
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
    });
    setSelectedDignitary(null);
    setIsDignitaryModified(false);
    setSelectedCountryCode('');
  };

  // Event handlers
  const handleAddDignitary = async () => {
    const isValid = await dignitaryForm.trigger();
    if (!isValid) return;

    const formData = dignitaryForm.getValues();
    const wasInEditMode = isEditMode;
    
    try {
      let dignitaryToAdd: SelectedDignitary;
      
      if (formData.isExistingDignitary && formData.selectedDignitaryId) {
        if (!wasInEditMode && selectedDignitaries.some(d => d.id === formData.selectedDignitaryId)) {
          return; // Already added
        }
        
        if (isDignitaryModified && onDignitaryUpdate) {
          const dignitaryUpdateData = {
            honorific_title: formData.dignitaryHonorificTitle,
            first_name: formData.dignitaryFirstName,
            last_name: formData.dignitaryLastName,
            email: formData.dignitaryEmail,
            phone: formData.dignitaryPhone,
            primary_domain: formData.dignitaryPrimaryDomain,
            primary_domain_other: formData.dignitaryPrimaryDomain?.toLowerCase() === 'other' ? formData.dignitaryPrimaryDomainOther : null,
            title_in_organization: formData.dignitaryTitleInOrganization,
            organization: formData.dignitaryOrganization,
            bio_summary: formData.dignitaryBioSummary,
            linked_in_or_website: formData.dignitaryLinkedInOrWebsite,
            country: formData.dignitaryCountry,
            country_code: formData.dignitaryCountryCode,
            state: formData.dignitaryState,
            state_code: formData.dignitaryStateCode,
            city: formData.dignitaryCity,
            has_dignitary_met_gurudev: formData.dignitaryHasMetGurudev,
            gurudev_meeting_date: formData.dignitaryGurudevMeetingDate,
            gurudev_meeting_location: formData.dignitaryGurudevMeetingLocation,
            gurudev_meeting_notes: formData.dignitaryGurudevMeetingNotes,
            poc_relationship_type: formData.pocRelationshipType,
          };
          
          const cleanedData = Object.fromEntries(
            Object.entries(dignitaryUpdateData).map(([key, value]) => [key, value === '' ? null : value])
          );
          
          const updatedDignitary = await onDignitaryUpdate(formData.selectedDignitaryId, cleanedData);
          dignitaryToAdd = { ...updatedDignitary, relationshipType: formData.pocRelationshipType };
        } else {
          const existingDignitary = dignitaries.find(d => d.id === formData.selectedDignitaryId);
          if (!existingDignitary) return;
          
          dignitaryToAdd = { ...existingDignitary, relationshipType: formData.pocRelationshipType };
        }
      } else {
        const dignitaryCreateData = {
          honorific_title: formData.dignitaryHonorificTitle,
          first_name: formData.dignitaryFirstName,
          last_name: formData.dignitaryLastName,
          email: formData.dignitaryEmail,
          phone: formData.dignitaryPhone || null,
          primary_domain: formData.dignitaryPrimaryDomain,
          primary_domain_other: formData.dignitaryPrimaryDomain?.toLowerCase() === 'other' ? formData.dignitaryPrimaryDomainOther : null,
          title_in_organization: formData.dignitaryTitleInOrganization,
          organization: formData.dignitaryOrganization,
          bio_summary: formData.dignitaryBioSummary,
          linked_in_or_website: formData.dignitaryLinkedInOrWebsite,
          country: formData.dignitaryCountry,
          country_code: formData.dignitaryCountryCode,
          state: formData.dignitaryState,
          state_code: formData.dignitaryStateCode,
          city: formData.dignitaryCity,
          poc_relationship_type: formData.pocRelationshipType,
          has_dignitary_met_gurudev: formData.dignitaryHasMetGurudev,
          gurudev_meeting_date: formData.dignitaryGurudevMeetingDate,
          gurudev_meeting_location: formData.dignitaryGurudevMeetingLocation,
          gurudev_meeting_notes: formData.dignitaryGurudevMeetingNotes,
        };
        
        const cleanedData = Object.fromEntries(
          Object.entries(dignitaryCreateData).map(([key, value]) => [key, value === '' ? null : value])
        );
        
        const newDignitary = await onDignitaryCreate(cleanedData);
        dignitaryToAdd = { ...newDignitary, relationshipType: formData.pocRelationshipType };
      }

      if (wasInEditMode && editingDignitaryIndex !== null) {
        // Update existing in list - handled by parent
        const updatedDignitaries = [...selectedDignitaries];
        updatedDignitaries[editingDignitaryIndex] = dignitaryToAdd;
        // Parent should handle this through onDignitaryAdd with special logic
      } else {
        onDignitaryAdd(dignitaryToAdd);
      }

      resetDignitaryForm();
      setIsFormExpanded(false);
      setIsEditMode(false);
      setEditingDignitaryIndex(null);
    } catch (error) {
      console.error('Error processing dignitary:', error);
    }
  };

  const handleEditDignitary = (index: number) => {
    setIsEditMode(true);
    setEditingDignitaryIndex(index);
    const dignitary = selectedDignitaries[index];
    
    setSelectedDignitary(dignitary as unknown as Dignitary);
    dignitaryForm.setValue('isExistingDignitary', true);
    dignitaryForm.setValue('selectedDignitaryId', dignitary.id);
    populateDignitaryForm(dignitary as unknown as Dignitary);
    setIsFormExpanded(true);
  };

  // Watch for form changes to detect modifications
  useEffect(() => {
    const subscription = dignitaryForm.watch((value, { name, type }) => {
      if (dignitaryForm.getValues().isExistingDignitary && selectedDignitary) {
        const currentValues = dignitaryForm.getValues();
        const hasChanges = 
          selectedDignitary.honorific_title !== currentValues.dignitaryHonorificTitle ||
          selectedDignitary.first_name !== currentValues.dignitaryFirstName ||
          selectedDignitary.last_name !== currentValues.dignitaryLastName ||
          selectedDignitary.email !== currentValues.dignitaryEmail ||
          selectedDignitary.phone !== currentValues.dignitaryPhone ||
          selectedDignitary.primary_domain !== currentValues.dignitaryPrimaryDomain ||
          selectedDignitary.title_in_organization !== currentValues.dignitaryTitleInOrganization ||
          selectedDignitary.organization !== currentValues.dignitaryOrganization ||
          selectedDignitary.bio_summary !== currentValues.dignitaryBioSummary ||
          selectedDignitary.linked_in_or_website !== currentValues.dignitaryLinkedInOrWebsite ||
          selectedDignitary.country !== currentValues.dignitaryCountry ||
          selectedDignitary.country_code !== currentValues.dignitaryCountryCode ||
          selectedDignitary.state !== currentValues.dignitaryState ||
          selectedDignitary.city !== currentValues.dignitaryCity ||
          selectedDignitary.has_dignitary_met_gurudev !== currentValues.dignitaryHasMetGurudev ||
          selectedDignitary.gurudev_meeting_date !== currentValues.dignitaryGurudevMeetingDate ||
          selectedDignitary.gurudev_meeting_location !== currentValues.dignitaryGurudevMeetingLocation ||
          selectedDignitary.gurudev_meeting_notes !== currentValues.dignitaryGurudevMeetingNotes ||
          selectedDignitary.relationship_type !== currentValues.pocRelationshipType;
          
        setIsDignitaryModified(hasChanges);
      }
    });
    return () => subscription.unsubscribe();
  }, [dignitaryForm, selectedDignitary]);

  const availableDignitaries = dignitaries.filter(
    d => !selectedDignitaries.some(selected => selected.id === d.id)
  );

  const getButtonText = () => {
    if (isEditMode) {
      return "Save Changes";
    } else if (dignitaryForm.watch('isExistingDignitary') && isDignitaryModified) {
      return "Save and Add";
    } else {
      return "Save and Add";
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          {finalConfig.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {finalConfig.description}
        </Typography>
        {error && (
          <Typography variant="body2" color="error" gutterBottom>
            {error}
          </Typography>
        )}
      </Grid>

      {/* Selected Dignitaries Display */}
      {selectedDignitaries.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Selected Dignitaries ({selectedDignitaries.length} of {finalConfig.maxDignitaries})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {selectedDignitaries.map((dignitary, index) => {
              const displayName = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`;
              const titleCompany = [dignitary.title_in_organization, dignitary.organization].filter(Boolean).join(', ');
              const fullDisplayName = titleCompany ? `${displayName} - ${titleCompany}` : displayName;
              
              return (
                <PersonSelectionChip
                  key={index}
                  id={dignitary.id}
                  firstName={dignitary.first_name}
                  lastName={dignitary.last_name}
                  displayName={fullDisplayName}
                  onDelete={() => onDignitaryRemove(index)}
                  onEdit={finalConfig.allowEditExisting ? () => handleEditDignitary(index) : undefined}
                  editIcon={<EditIcon />}
                />
              );
            })}
          </Box>
        </Grid>
      )}

      {/* Add Dignitary Button */}
      {!isFormExpanded && selectedDignitaries.length < finalConfig.maxDignitaries! && (
        <Grid item xs={12}>
          <PrimaryButton
            size="medium"
            startIcon={<AddIcon />}
            onClick={() => {
              setIsFormExpanded(true);
              if (dignitaries.length > 0) {
                const availableDignitary = dignitaries.find(d => 
                  !selectedDignitaries.some(sd => sd.id === d.id)
                );
                
                if (availableDignitary) {
                  dignitaryForm.setValue('isExistingDignitary', true);
                  dignitaryForm.setValue('selectedDignitaryId', availableDignitary.id);
                  setSelectedDignitary(availableDignitary);
                  populateDignitaryForm(availableDignitary);
                } else {
                  resetDignitaryForm();
                }
              } else {
                resetDignitaryForm();
              }
            }}
            sx={{ mt: 2 }}
            disabled={disabled || selectedDignitaries.length >= finalConfig.maxDignitaries!}
          >
            {selectedDignitaries.length < finalConfig.maxDignitaries!
              ? `Add Dignitary ${selectedDignitaries.length + 1} of ${finalConfig.maxDignitaries}`
              : `All ${finalConfig.maxDignitaries} dignitaries added`}
          </PrimaryButton>
        </Grid>
      )}

      {/* Dignitary Form */}
      {isFormExpanded && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                ...(isEditMode ? {
                  bgcolor: 'rgba(33, 150, 243, 0.1)',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'primary.main',
                } : {})
              }}
            >
              {isEditMode && <EditIcon color="primary" sx={{ mr: 1 }} />}
              <Typography variant="subtitle1" color={isEditMode ? 'primary' : 'inherit'}>
                {isEditMode ? 'Edit Dignitary Details' : 'Add a Dignitary'}
              </Typography>
              {isEditMode && selectedDignitaries.length > 0 && editingDignitaryIndex !== null && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Editing: {formatHonorificTitle(selectedDignitaries[editingDignitaryIndex].honorific_title || '')} {selectedDignitaries[editingDignitaryIndex].first_name} {selectedDignitaries[editingDignitaryIndex].last_name}
                </Typography>
              )}
              {!isEditMode && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Adding dignitary {selectedDignitaries.length + 1} of {finalConfig.maxDignitaries}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Existing vs New Toggle */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <RadioGroup
                value={dignitaryForm.watch('isExistingDignitary').toString()}
                onChange={(e) => {
                  if (isEditMode) return;
                  
                  const isExisting = e.target.value === 'true';
                  dignitaryForm.setValue('isExistingDignitary', isExisting);
                  
                  if (!isExisting) {
                    if (selectedDignitary) {
                      setSelectedDignitary({
                        ...selectedDignitary,
                        previousId: dignitaryForm.getValues().selectedDignitaryId
                      } as any);
                    }
                    dignitaryForm.setValue('selectedDignitaryId', undefined);
                    dignitaryForm.reset({
                      ...dignitaryForm.getValues(),
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
                    });
                  } else {
                    if (selectedDignitary) {
                      populateDignitaryForm(selectedDignitary);
                      dignitaryForm.setValue('selectedDignitaryId', (selectedDignitary as any).previousId || selectedDignitary.id);
                    } else if (dignitaries.length > 0) {
                      const availableDignitary = dignitaries.find(d => 
                        !selectedDignitaries.some(sd => sd.id === d.id)
                      );
                      
                      if (availableDignitary) {
                        dignitaryForm.setValue('selectedDignitaryId', availableDignitary.id);
                        setSelectedDignitary(availableDignitary);
                        populateDignitaryForm(availableDignitary);
                      } else {
                        const defaultDignitary = dignitaries[0];
                        dignitaryForm.setValue('selectedDignitaryId', defaultDignitary.id);
                        setSelectedDignitary(defaultDignitary);
                        populateDignitaryForm(defaultDignitary);
                      }
                    }
                  }
                }}
              >
                <FormControlLabel 
                  value="true" 
                  control={<Radio />} 
                  label="Select an existing dignitary"
                  disabled={dignitaries.length === 0 || isEditMode}
                />
                <FormControlLabel 
                  value="false" 
                  control={<Radio />} 
                  label="Add a new dignitary" 
                  disabled={isEditMode || !finalConfig.allowCreateNew}
                />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          {/* Dignitary Selection Dropdown */}
          {dignitaryForm.watch('isExistingDignitary') && (
            <Grid item xs={12} md={6}>
              <Controller
                name="selectedDignitaryId"
                control={dignitaryForm.control}
                render={({ field }) => (
                  <Autocomplete
                    fullWidth
                    options={dignitaries}
                    value={dignitaries.find(d => d.id === field.value) || undefined}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.id || '');
                      if (newValue) {
                        setSelectedDignitary(newValue);
                        populateDignitaryForm(newValue);
                      } else {
                        setSelectedDignitary(null);
                      }
                    }}
                    getOptionLabel={(dignitary) => 
                      `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`
                    }
                    getOptionDisabled={(dignitary) => 
                      !isEditMode && selectedDignitaries.some(d => d.id === dignitary.id)
                    }
                    renderOption={(props, dignitary) => {
                      const isAlreadyAdded = !isEditMode && selectedDignitaries.some(d => d.id === dignitary.id);
                      const titleCompany = [dignitary.title_in_organization, dignitary.organization].filter(Boolean).join(', ');
                      
                      return (
                        <Box component="li" {...props} key={dignitary.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2">
                                {`${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`}
                              </Typography>
                              {titleCompany && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {titleCompany}
                                </Typography>
                              )}
                            </Box>
                            {isAlreadyAdded && (
                              <Chip 
                                label="Already Added" 
                                size="small" 
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  color: 'text.secondary',
                                  borderColor: 'grey.400'
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Dignitary"
                        placeholder="Search for a dignitary..."
                        autoComplete="off"
                      />
                    )}
                    disabled={isEditMode}
                    disableClearable
                    filterOptions={(options, { inputValue }) => {
                      return options.filter(dignitary => {
                        const fullName = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`.toLowerCase();
                        const organization = (dignitary.organization || '').toLowerCase();
                        const title = (dignitary.title_in_organization || '').toLowerCase();
                        const searchTerm = inputValue.toLowerCase();
                        
                        return fullName.includes(searchTerm) || 
                               organization.includes(searchTerm) || 
                               title.includes(searchTerm);
                      });
                    }}
                    noOptionsText="No dignitaries found"
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                  />
                )}
              />
            </Grid>
          )}

          {/* Relationship Type Field */}
          {finalConfig.showRelationshipType && (
            <Grid item xs={12} md={6} lg={4}>
              <Controller
                name="pocRelationshipType"
                control={dignitaryForm.control}
                rules={{ required: 'Relationship type is required' }}
                render={({ field }) => (
                  <EnumSelect
                    enumType="relationshipType"
                    label="Relationship Type"
                    required
                    error={!!dignitaryForm.formState.errors.pocRelationshipType}
                    helperText={dignitaryForm.formState.errors.pocRelationshipType?.message}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Grid>
          )}

          <Grid item xs={12} sx={{ my: 2 }}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          {/* Basic Information Fields */}
          <Grid item xs={12} md={6} lg={4}>
            <Controller
              name="dignitaryHonorificTitle"
              control={dignitaryForm.control}
              rules={{ required: 'Honorific title is required' }}
              render={({ field }) => (
                <HonorificTitleSelect
                  label="Honorific Title"
                  value={field.value || ''}
                  onChange={field.onChange}
                  required
                  error={!!dignitaryForm.formState.errors.dignitaryHonorificTitle}
                  helperText={dignitaryForm.formState.errors.dignitaryHonorificTitle?.message}
                  placeholder="Search for honorific title..."
                />
              )}
            />
          </Grid>
                      
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
          
          {finalConfig.showAllFields && (
            <>
              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  fullWidth
                  label="Organization"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryOrganization', {
                    required: finalConfig.requireOrganization ? 'Organization is required' : false
                  })}
                  error={!!dignitaryForm.formState.errors.dignitaryOrganization}
                  helperText={dignitaryForm.formState.errors.dignitaryOrganization?.message}
                  required={finalConfig.requireOrganization}
                />
              </Grid>

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
              
              <Grid item xs={12} md={6} lg={4}>
                <Controller
                  name="dignitaryPrimaryDomain"
                  control={dignitaryForm.control}
                  rules={{ required: 'Primary domain is required' }}
                  render={({ field }) => (
                    <PrimaryDomainSelect
                      label="Primary Domain"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={!!dignitaryForm.formState.errors.dignitaryPrimaryDomain}
                      helperText={dignitaryForm.formState.errors.dignitaryPrimaryDomain?.message}
                    />
                  )}
                />
              </Grid>

              {dignitaryForm.watch('dignitaryPrimaryDomain')?.toLowerCase() === 'other' && (
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
                    inputProps={{ maxLength: 255 }}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Bio Summary"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryBioSummary', { 
                    required: finalConfig.requireBioSummary ? 'Bio summary is required' : false 
                  })}
                  error={!!dignitaryForm.formState.errors.dignitaryBioSummary}
                  helperText={dignitaryForm.formState.errors.dignitaryBioSummary?.message}
                  required={finalConfig.requireBioSummary}
                />
              </Grid>
              
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

              {/* Location Fields */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="dignitaryCountryCode"
                  control={dignitaryForm.control}
                  rules={{ required: 'Country is required' }}
                  render={({ field }) => (
                    <CountrySelect
                      label="Country"
                      value={field.value || ''}
                      onChange={(countryCode) => {
                        field.onChange(countryCode);
                        
                        // Find the selected country to get its name
                        // This would need to be passed as a prop or fetched internally
                        // For now, we'll just set the country code
                        setSelectedCountryCode(countryCode);
                        
                        // Reset state and city when country changes
                        dignitaryForm.setValue('dignitaryState', '');
                        dignitaryForm.setValue('dignitaryCity', '');
                      }}
                      error={!!dignitaryForm.formState.errors.dignitaryCountryCode}
                      helperText={dignitaryForm.formState.errors.dignitaryCountryCode?.message}
                      required
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Controller
                  name="dignitaryState"
                  control={dignitaryForm.control}
                  render={({ field }) => (
                    <SubdivisionStateDropdown
                      label="State/Province"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                      onStateCodeChange={(stateCode) => {
                        dignitaryForm.setValue('dignitaryStateCode', stateCode);
                      }}
                      error={!!dignitaryForm.formState.errors.dignitaryState}
                      helperText={dignitaryForm.formState.errors.dignitaryState?.message}
                      countryCode={selectedCountryCode}
                    />
                  )}
                />
              </Grid>
              
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
            </>
          )}

          {/* Gurudev Meeting Fields */}
          {finalConfig.showGurudevMeetingFields && (
            <>
              <Grid item xs={12} md={6} lg={4}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Has Dignitary Met Gurudev?</FormLabel>
                  <RadioGroup
                    row
                    value={dignitaryForm.watch('dignitaryHasMetGurudev') ? dignitaryForm.watch('dignitaryHasMetGurudev').toString() : 'false'}
                    onChange={(e) => {
                      const value = e.target.value === 'true';
                      dignitaryForm.setValue('dignitaryHasMetGurudev', value);
                      
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

              {dignitaryForm.watch('dignitaryHasMetGurudev') && (
                <>
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      type="date"
                      label="When did they meet Gurudev?"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryGurudevMeetingDate')}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="Where did they meet Gurudev?"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryGurudevMeetingLocation')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Additional notes from the meeting with Gurudev"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryGurudevMeetingNotes')}
                    />
                  </Grid>
                </>
              )}
            </>
          )}

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'flex-end',
                gap: 2,
                mt: 2 
              }}
            >
              <SecondaryButton
                size="medium"
                startIcon={<CancelIcon />}
                onClick={() => {
                  if (isEditMode) {
                    setIsEditMode(false);
                    setEditingDignitaryIndex(null);
                  }
                  resetDignitaryForm();
                  setIsFormExpanded(false);
                }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                size="medium"
                startIcon={isEditMode ? <SaveIcon /> : <AddIcon />}
                onClick={handleAddDignitary}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {getButtonText()}
              </PrimaryButton>
            </Box>
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default GenericDignitarySelector; 