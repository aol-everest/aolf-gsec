import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Avatar, 
  Grid,
  TextField, 
  FormGroup,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  MenuItem,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  Chip,
  OutlinedInput,
  ListItemText
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SecondaryButton } from '../components/SecondaryButton';
import { PrimaryButton } from '../components/PrimaryButton';
import WarningButton from '../components/WarningButton';
import { LogoutIconV2 } from '../components/iconsv2';
import ProfileBackground from '../components/ProfileBackground';

interface NotificationPreferences {
  appointment_created: boolean;
  appointment_updated: boolean;
  new_appointment_request: boolean;
  bcc_on_all_emails: boolean;
}

interface UserUpdateData {
  phone_number: string;
  email_notification_preferences: NotificationPreferences;
  country_code: string;
  title_in_organization?: string;
  organization?: string;
  state_province?: string;
  state_province_code?: string;
  city?: string;
  teacher_status: string;
  teacher_code?: string;
  programs_taught?: string[];
  aol_affiliations?: string[];
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  appointment_created: true,
  appointment_updated: true,
  new_appointment_request: false,
  bcc_on_all_emails: false,
};

// New StateDropdown component that uses subdivision API
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

interface SubdivisionData {
  id: number;
  country_code: string;
  subdivision_code: string;
  name: string;
  subdivision_type: string;
  is_enabled: boolean;
  full_code: string;
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

const Profile: React.FC = () => {
  const { userInfo, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Fetch user profile data using React Query
  const { data: userData, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        // If your API has a specific endpoint for user profile, use that instead
        // This is a placeholder assuming userInfo from auth context is sufficient
        return userInfo;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        enqueueSnackbar('Failed to fetch user profile', { variant: 'error' });
        throw error;
      }
    },
    // Use initial data from auth context to avoid loading state if data is already available
    initialData: userInfo,
    enabled: !!userInfo // Only run the query if userInfo exists
  });

  // Fetch countries from the backend
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<any[]>('/countries/all');
        return data;
      } catch (error) {
        console.error('Error fetching countries:', error);
        enqueueSnackbar('Failed to fetch countries', { variant: 'error' });
        return [];
      }
    },
  });

  // Fetch AOL Teacher Status options
  const { data: teacherStatusOptions = [], isLoading: teacherStatusLoading } = useQuery({
    queryKey: ['aol-teacher-status-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/users/aol-teacher-status-options');
        return data.map(status => ({ value: status, label: status === 'Not a Teacher' ? 'No' : status }));
      } catch (error) {
        console.error('Error fetching teacher status options:', error);
        return [
          { value: 'Not a Teacher', label: 'No' },
          { value: 'Part-time Teacher', label: 'Yes - Part-time' },
          { value: 'Full-time Teacher', label: 'Yes - Full-time' }
        ];
      }
    },
  });

  // Fetch AOL Program Type options
  const { data: programTypeOptions = [], isLoading: programTypeLoading } = useQuery({
    queryKey: ['aol-program-type-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/users/aol-program-type-options');
        return data;
      } catch (error) {
        console.error('Error fetching program type options:', error);
        return ['HP', 'Silence Program', 'Higher level Programs - DSN / VTP / TTP / Sanyam', 'Sahaj', 'AE/YES!', 'SSY'];
      }
    },
  });

  // Fetch AOL Affiliation options
  const { data: affiliationOptions = [], isLoading: affiliationLoading } = useQuery({
    queryKey: ['aol-affiliation-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/users/aol-affiliation-options');
        return data;
      } catch (error) {
        console.error('Error fetching affiliation options:', error);
        return ['Ashramite', 'Ashram Sevak (Short-term)', 'Swamiji / Brahmachari', 'Ashram HOD', 'Trustee', 'State Apex / STC'];
      }
    },
  });

  const [phoneNumber, setPhoneNumber] = useState(userData?.phone_number || '');
  const [countryCode, setCountryCode] = useState(userData?.country_code || '');
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  
  // Updated field names and new field
  const [titleInOrganization, setTitleInOrganization] = useState(userData?.title_in_organization || '');
  const [organization, setOrganization] = useState(userData?.organization || '');
  const [stateProvince, setStateProvince] = useState(userData?.state_province || '');
  const [stateProvinceCode, setStateProvinceCode] = useState(userData?.state_province_code || '');
  const [city, setCity] = useState(userData?.city || '');
  const [teacherStatus, setTeacherStatus] = useState(userData?.teacher_status || 'Not a Teacher');
  const [teacherCode, setTeacherCode] = useState(userData?.teacher_code || '');
  const [programsTaught, setProgramsTaught] = useState<string[]>(userData?.programs_taught || []);
  const [aolAffiliations, setAolAffiliations] = useState<string[]>(userData?.aol_affiliations || []);

  // Update local state when userData changes
  useEffect(() => {
    if (userData) {
      setPhoneNumber(userData.phone_number || '');
      setCountryCode(userData.country_code || '');
      setTitleInOrganization(userData.title_in_organization || '');
      setOrganization(userData.organization || '');
      setStateProvince(userData.state_province || '');
      setStateProvinceCode(userData.state_province_code || '');
      setCity(userData.city || '');
      setTeacherStatus(userData.teacher_status || 'Not a Teacher');
      setTeacherCode(userData.teacher_code || '');
      setProgramsTaught(userData.programs_taught || []);
      setAolAffiliations(userData.aol_affiliations || []);
      
      // Cast the empty object as a partial NotificationPreferences
      const userPrefs = (userData.email_notification_preferences || {}) as Partial<NotificationPreferences>;
      
      // Ensure all necessary properties are present
      setNotificationPreferences({
        appointment_created: userPrefs.appointment_created ?? DEFAULT_PREFERENCES.appointment_created,
        appointment_updated: userPrefs.appointment_updated ?? DEFAULT_PREFERENCES.appointment_updated,
        new_appointment_request: userPrefs.new_appointment_request ?? DEFAULT_PREFERENCES.new_appointment_request,
        bcc_on_all_emails: userPrefs.bcc_on_all_emails ?? DEFAULT_PREFERENCES.bcc_on_all_emails,
      });
    }
  }, [userData]);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: UserUpdateData) => {
      const { data } = await api.patch('/users/me/update', updateData);
      return data;
    },
    onSuccess: () => {
      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      setIsEditing(false);
      // Invalidate and refetch user profile data
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      enqueueSnackbar('Error updating profile', { variant: 'error' });
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate({ 
      phone_number: phoneNumber,
      country_code: countryCode,
      email_notification_preferences: notificationPreferences,
      title_in_organization: titleInOrganization,
      organization: organization,
      state_province: stateProvince,
      state_province_code: stateProvinceCode,
      city,
      teacher_status: teacherStatus,
      teacher_code: teacherCode,
      programs_taught: programsTaught,
      aol_affiliations: aolAffiliations
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPhoneNumber(userData?.phone_number || '');
    setCountryCode(userData?.country_code || '');
    setTitleInOrganization(userData?.title_in_organization || '');
    setOrganization(userData?.organization || '');
    setStateProvince(userData?.state_province || '');
    setStateProvinceCode(userData?.state_province_code || '');
    setCity(userData?.city || '');
    setTeacherStatus(userData?.teacher_status || 'Not a Teacher');
    setTeacherCode(userData?.teacher_code || '');
    setProgramsTaught(userData?.programs_taught || []);
    setAolAffiliations(userData?.aol_affiliations || []);
    
    // Cast the empty object as a partial NotificationPreferences
    const userPrefs = (userData?.email_notification_preferences || {}) as Partial<NotificationPreferences>;
    
    setNotificationPreferences({
      appointment_created: userPrefs.appointment_created ?? DEFAULT_PREFERENCES.appointment_created,
      appointment_updated: userPrefs.appointment_updated ?? DEFAULT_PREFERENCES.appointment_updated,
      new_appointment_request: userPrefs.new_appointment_request ?? DEFAULT_PREFERENCES.new_appointment_request,
      bcc_on_all_emails: userPrefs.bcc_on_all_emails ?? DEFAULT_PREFERENCES.bcc_on_all_emails,
    });
  };

  const handleNotificationChange = (key: keyof NotificationPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: event.target.checked
    }));
  };

  const getNotificationLabel = (key: keyof NotificationPreferences): string => {
    switch (key) {
      case 'appointment_created':
        return 'When I create a new appointment request';
      case 'appointment_updated':
        return 'When my appointment request is updated';
      case 'new_appointment_request':
        return 'When new appointment requests are created (Secretariat only)';
      case 'bcc_on_all_emails':
        return 'Receive BCC copies of all appointment-related emails sent to users (Secretariat only)';
      default:
        return key;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <ProfileBackground />
      <Container maxWidth="md">
        <Box sx={{ zIndex: 1 }}>
          <Paper sx={{ p: 4, position: 'relative' }}>
            {/* Logout button in top right corner */}
            <Box sx={{ position: 'absolute', top: 30, right: 30 }}>
              <WarningButton 
                size="small" 
                onClick={logout}
                leftIcon={<LogoutIconV2 sx={{ width: 24, height: 24 }} />}
              >
                Logout
              </WarningButton>
            </Box>

            {/* User info section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md="auto" sx={{ maxWidth: 160 }}>
                  {userData?.picture && (
                    <Avatar
                      src={userData.picture}
                      alt={userData.name}
                      sx={{ width: 130, height: 130, mr: 4, border: '5px solid #fff', boxShadow: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)' }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md>
                  <Typography variant="h1" gutterBottom>
                    {(userData?.first_name || 'User Name') + " " + (userData?.last_name || 'User Name')}
                  </Typography>
                  <Typography color="textSecondary" sx={{ textWrap: 'break-word' }}>
                    {userData?.email || ''}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Contact Information section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Contact Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!isEditing}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Country"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={!isEditing || countriesLoading}
                    helperText={countriesLoading ? "Loading countries..." : ""}
                  >
                    {countries.map((country) => (
                      <MenuItem key={country.iso2_code} value={country.iso2_code}>
                        {country.name} ({country.iso2_code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SubdivisionStateDropdown
                    label="State/Province"
                    value={stateProvince}
                    onChange={setStateProvince}
                    onStateCodeChange={setStateProvinceCode}
                    countryCode={countryCode}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isEditing}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Professional Information section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Professional Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Title in Organization"
                    value={titleInOrganization}
                    onChange={(e) => setTitleInOrganization(e.target.value)}
                    disabled={!isEditing}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    disabled={!isEditing}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Art of Living Information section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Art of Living Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Are you an Art of Living teacher?"
                    value={teacherStatus}
                    onChange={(e) => setTeacherStatus(e.target.value)}
                    disabled={!isEditing || teacherStatusLoading}
                    helperText={teacherStatusLoading ? "Loading options..." : ""}
                  >
                    {teacherStatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {teacherStatus !== 'Not a Teacher' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Teacher Code"
                      value={teacherCode}
                      onChange={(e) => setTeacherCode(e.target.value)}
                      disabled={!isEditing}
                      fullWidth
                    />
                  </Grid>
                )}
              </Grid>

              {teacherStatus !== 'Not a Teacher' && (
                <Box sx={{ mt: 3 }}>
                  <FormControl fullWidth disabled={!isEditing || programTypeLoading}>
                    <InputLabel>Programs you teach</InputLabel>
                    <Select
                      multiple
                      value={programsTaught}
                      onChange={(e) => setProgramsTaught(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                      input={<OutlinedInput label="Programs you teach" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {programTypeOptions.map((program) => (
                        <MenuItem key={program} value={program}>
                          <Checkbox checked={programsTaught.indexOf(program) > -1} />
                          <ListItemText primary={program} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth disabled={!isEditing || affiliationLoading}>
                  <InputLabel>Art of Living Affiliations (if applicable)</InputLabel>
                  <Select
                    multiple
                    value={aolAffiliations}
                    onChange={(e) => setAolAffiliations(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput label="Art of Living Affiliations (if applicable)" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {affiliationOptions.map((affiliation) => (
                      <MenuItem key={affiliation} value={affiliation}>
                        <Checkbox checked={aolAffiliations.indexOf(affiliation) > -1} />
                        <ListItemText primary={affiliation} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Notification Preferences section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Email Notification Preferences
              </Typography>
              
              <FormGroup>
                {Object.keys(notificationPreferences).map((key) => {
                  // Only show new_appointment_request and bcc_on_all_emails to secretariat users
                  if ((key === 'new_appointment_request' || key === 'bcc_on_all_emails') && userData?.role !== 'SECRETARIAT' && userData?.role !== 'ADMIN') {
                    return null;
                  }
                  
                  return (
                    <FormControlLabel
                      key={key}
                      control={
                        <Switch
                          checked={notificationPreferences[key as keyof NotificationPreferences]}
                          onChange={handleNotificationChange(key as keyof NotificationPreferences)}
                          disabled={!isEditing}
                        />
                      }
                      label={getNotificationLabel(key as keyof NotificationPreferences)}
                    />
                  );
                })}
              </FormGroup>
            </Box>

            {/* Action buttons at bottom */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {!isEditing ? (
                <PrimaryButton onClick={() => setIsEditing(true)}>
                  Edit Profile
                </PrimaryButton>
              ) : (
                <>
                  <SecondaryButton onClick={handleCancel}>
                    Cancel
                  </SecondaryButton>
                  <PrimaryButton 
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Save Changes'
                    )}
                  </PrimaryButton>
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default Profile; 