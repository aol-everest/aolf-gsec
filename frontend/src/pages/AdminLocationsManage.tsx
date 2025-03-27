import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Grid,
  Container,
  Card,
  CardContent,
  CardActions,
  Collapse,
  CircularProgress,
  Link,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import Layout from '../components/Layout';
import GenericDataGrid from '../components/GenericDataGrid';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';

// Google Maps types
interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceResult {
  name?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  formatted_address?: string;
  address_components?: AddressComponent[];
}

interface GoogleMapsAutocomplete {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => PlaceResult;
}

declare global {
  interface Window {
    initGooglePlaces: () => void;
  }
}

// Country interface based on the backend model
interface Country {
  iso2_code: string;
  name: string;
  iso3_code: string;
  region?: string;
  sub_region?: string;
  intermediate_region?: string;
  country_groups?: string[];
  alt_names?: string[];
  timezones?: string[];
  default_timezone?: string;
}

interface Location {
  id: number;
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  country_code: string;
  zip_code: string;
  timezone?: string;
  driving_directions?: string;
  secretariat_internal_notes?: string;
  parking_info?: string;
  attachment_path?: string;
  attachment_name?: string;
  attachment_file_type?: string;
  created_at: string;
  updated_at?: string;
  created_by: number;
  updated_by?: number;
  created_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  updated_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  attachment_thumbnail_path?: string;
}

interface LocationFormData {
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  country_code: string;
  zip_code: string;
  timezone?: string;
  driving_directions?: string;
  secretariat_internal_notes?: string;
  parking_info?: string;
  attachment_path?: string;
  attachment_name?: string;
  attachment_file_type?: string;
  attachment_thumbnail_path?: string;
}

const initialFormData: LocationFormData = {
  name: '',
  street_address: '',
  state: '',
  city: '',
  country: '',
  country_code: '',
  zip_code: '',
  timezone: '',
  driving_directions: '',
  secretariat_internal_notes: '',
  parking_info: '',
  attachment_path: '',
  attachment_name: '',
  attachment_file_type: '',
  attachment_thumbnail_path: '',
};

// Move Google Maps script loading to a custom hook
const useGoogleMapsScript = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    const scriptId = 'google-places-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    const handleScriptLoad = () => setIsLoaded(true);
    const handleScriptError = () => {
      setError('Failed to load Google Maps script');
      script.remove();
    };

    script.addEventListener('load', handleScriptLoad);
    script.addEventListener('error', handleScriptError);

    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleScriptLoad);
      script.removeEventListener('error', handleScriptError);
    };
  }, []);

  return { isLoaded, error };
};

export default function AdminLocationsManage() {
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentMarkedForDeletion, setAttachmentMarkedForDeletion] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const api = useApi();
  const queryClient = useQueryClient();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isLoaded: mapsLoaded, error: mapsError } = useGoogleMapsScript();

  // Function to close the form and reset state
  const handleClose = () => {
    setFormOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
    setSelectedFile(null);
    setAttachmentMarkedForDeletion(false);
  };

  // Query for fetching locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Location[]>('/admin/locations/all');
        return data;
      } catch (error) {
        enqueueSnackbar('Failed to fetch locations', { variant: 'error' });
        throw error;
      }
    }
  });

  // Query for fetching countries
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Country[]>('/countries/all');
        return data;
      } catch (error) {
        enqueueSnackbar('Failed to fetch countries', { variant: 'error' });
        throw error;
      }
    }
  });

  // Mutation for creating/updating locations
  const locationMutation = useMutation({
    mutationFn: async (variables: { id?: number; data: LocationFormData }) => {
      // If attachment is marked for deletion and we're editing an existing location
      if (attachmentMarkedForDeletion && variables.id) {
        try {
          // Delete the attachment first
          await api.delete<Location>(`/admin/locations/${variables.id}/attachment`);
          // Clear attachment fields in the form data
          variables.data = {
            ...variables.data,
            attachment_path: '',
            attachment_name: '',
            attachment_file_type: '',
          };
        } catch (error) {
          enqueueSnackbar('Failed to remove attachment', { variant: 'error' });
          throw error;
        }
      }

      // If there's a file to upload, handle it first
      if (selectedFile) {
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          
          // Use the new location-specific attachment endpoint if we have a location ID
          if (variables.id) {
            const uploadResponse = await api.post<Location>(`/admin/locations/${variables.id}/attachment`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            
            // The response now includes the updated location with attachment info
            return uploadResponse.data;
          } else {
            // For new locations, we'll upload the attachment after creating the location
            // So we just continue with the create operation
          }
        } catch (error) {
          enqueueSnackbar('Failed to upload attachment', { variant: 'error' });
          throw error;
        } finally {
          setIsUploading(false);
        }
      }
      
      if (variables.id) {
        const { data } = await api.patch<Location>(`/admin/locations/update/${variables.id}`, variables.data);
        return data;
      } else {
        // Create the location first
        const { data } = await api.post<Location>('/admin/locations/new', variables.data);
        
        // If we have a file to upload, attach it to the newly created location
        if (selectedFile) {
          setIsUploading(true);
          try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            const uploadResponse = await api.post<Location>(`/admin/locations/${data.id}/attachment`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            
            setIsUploading(false);
            return uploadResponse.data;
          } catch (error) {
            enqueueSnackbar('Location created but failed to upload attachment', { variant: 'warning' });
            setIsUploading(false);
            return data;
          }
        }
        
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      enqueueSnackbar(editingId ? 'Location updated successfully' : 'Location created successfully', { variant: 'success' });
      handleClose();
      setAttachmentMarkedForDeletion(false);
    },
    onError: () => {
      enqueueSnackbar('Failed to save location', { variant: 'error' });
    }
  });

  // Initialize autocomplete
  const initializeAutocomplete = useCallback(() => {
    if (!mapsLoaded || !inputRef.current) return;

    try {
      // Clean up existing instance
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['name', 'geometry', 'formatted_address', 'address_components'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry) {
          enqueueSnackbar('Please select a location from the dropdown', { variant: 'warning' });
          return;
        }

        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let country = '';
        let countryCode = '';
        let postalCode = '';

        place.address_components?.forEach((component) => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
            countryCode = component.short_name;
          } else if (types.includes('postal_code')) {
            postalCode = component.long_name;
          }
        });

        const formattedAddress = place.formatted_address || `${streetNumber} ${route}, ${city}, ${state} ${postalCode}, ${country}`;
        const encodedAddress = encodeURIComponent(formattedAddress);
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

        // Find matching country in our dropdown list
        const matchedCountry = countries.find(c => 
          c.iso2_code.toLowerCase() === countryCode.toLowerCase() || 
          c.name.toLowerCase() === country.toLowerCase()
        );

        // Set initial location data
        const initialLocationData = {
          name: place.name || '',
          street_address: `${streetNumber} ${route}`.trim(),
          city,
          state,
          country: matchedCountry ? matchedCountry.name : country,
          country_code: matchedCountry ? matchedCountry.iso2_code : countryCode,
          zip_code: postalCode,
          driving_directions: directionsUrl,
        };

        // Set default timezone based on country/state
        let defaultTimezone = '';
        let fetchedTimezoneFromAPI = true;
        
        // Try to get timezone from country data first
        if (countryCode === 'US' && state) {
          // US state-based timezone mapping (only used if country data doesn't have timezone)
          const stateCode = state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase();
          const usStateTimezones: {[key: string]: string} = {
            'AL': 'America/Chicago',     // Alabama
            'AK': 'America/Anchorage',   // Alaska
            'AZ': 'America/Phoenix',     // Arizona
            'AR': 'America/Chicago',     // Arkansas
            'CA': 'America/Los_Angeles', // California
            'CO': 'America/Denver',      // Colorado
            'CT': 'America/New_York',    // Connecticut
            'DE': 'America/New_York',    // Delaware
            'FL': 'America/New_York',    // Florida
            'GA': 'America/New_York',    // Georgia
            'HI': 'Pacific/Honolulu',    // Hawaii
            'ID': 'America/Denver',      // Idaho
            'IL': 'America/Chicago',     // Illinois
            'IN': 'America/New_York',    // Indiana
            'IA': 'America/Chicago',     // Iowa
            'KS': 'America/Chicago',     // Kansas
            'KY': 'America/New_York',    // Kentucky
            'LA': 'America/Chicago',     // Louisiana
            'ME': 'America/New_York',    // Maine
            'MD': 'America/New_York',    // Maryland
            'MA': 'America/New_York',    // Massachusetts
            'MI': 'America/New_York',    // Michigan
            'MN': 'America/Chicago',     // Minnesota
            'MS': 'America/Chicago',     // Mississippi
            'MO': 'America/Chicago',     // Missouri
            'MT': 'America/Denver',      // Montana
            'NE': 'America/Chicago',     // Nebraska
            'NV': 'America/Los_Angeles', // Nevada
            'NH': 'America/New_York',    // New Hampshire
            'NJ': 'America/New_York',    // New Jersey
            'NM': 'America/Denver',      // New Mexico
            'NY': 'America/New_York',    // New York
            'NC': 'America/New_York',    // North Carolina
            'ND': 'America/Chicago',     // North Dakota
            'OH': 'America/New_York',    // Ohio
            'OK': 'America/Chicago',     // Oklahoma
            'OR': 'America/Los_Angeles', // Oregon
            'PA': 'America/New_York',    // Pennsylvania
            'RI': 'America/New_York',    // Rhode Island
            'SC': 'America/New_York',    // South Carolina
            'SD': 'America/Chicago',     // South Dakota
            'TN': 'America/Chicago',     // Tennessee
            'TX': 'America/Chicago',     // Texas
            'UT': 'America/Denver',      // Utah
            'VT': 'America/New_York',    // Vermont
            'VA': 'America/New_York',    // Virginia
            'WA': 'America/Los_Angeles', // Washington
            'WV': 'America/New_York',    // West Virginia
            'WI': 'America/Chicago',     // Wisconsin
            'WY': 'America/Denver',      // Wyoming
          };
          if (usStateTimezones[stateCode]) {
            defaultTimezone = usStateTimezones[stateCode];
            fetchedTimezoneFromAPI = false;
          } else {
            defaultTimezone = 'America/New_York';
          }
        } else if (matchedCountry && matchedCountry.default_timezone) {
          defaultTimezone = matchedCountry.default_timezone;
        } else if (matchedCountry && matchedCountry.timezones && matchedCountry.timezones.length > 0) {
          // Use first timezone from country's list
          defaultTimezone = matchedCountry.timezones[0];
        } else {
          // Last resort, use UTC
          defaultTimezone = 'UTC';
        }

        if (matchedCountry && matchedCountry.timezones && matchedCountry.timezones.length === 1) {
          fetchedTimezoneFromAPI = false;
        }

        // Set the form data with the timezone included
        setFormData({
          ...initialLocationData,
          timezone: defaultTimezone
        });

        // If coordinates are available, try to get a more accurate timezone from Google's API
        if (fetchedTimezoneFromAPI && place.geometry?.location) {
          console.log("Fetching timezone from API");
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          // Use Google's Timezone API to get the timezone ID
          const timestamp = Math.floor(Date.now() / 1000);
          const timezoneApiUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
          
          fetch(timezoneApiUrl)
            .then(response => response.json())
            .then(data => {
              if (data.status === "OK" && data.timeZoneId) {
                // Update only the timezone if API returns a valid timezone
                setFormData(prev => ({
                  ...prev,
                  timezone: data.timeZoneId, // Store the IANA timezone identifier
                }));
              }
            })
            .catch(error => {
              console.error('Error fetching timezone:', error);
              // Default timezone already set, so no need to do anything here
            });
        }

        // Clear the input after selection
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      enqueueSnackbar('Error initializing location search', { variant: 'error' });
    }
  }, [mapsLoaded, enqueueSnackbar, countries]);

  // Initialize autocomplete when form opens
  useEffect(() => {
    if (formOpen && !editingId && mapsLoaded) {
      initializeAutocomplete();
    }
  }, [formOpen, editingId, mapsLoaded, initializeAutocomplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  const handleOpen = (location?: Location) => {
    if (location) {
      setFormData({
        name: location.name,
        street_address: location.street_address,
        state: location.state,
        city: location.city,
        country: location.country,
        country_code: location.country_code,
        zip_code: location.zip_code,
        timezone: location.timezone || '',
        driving_directions: location.driving_directions || '',
        secretariat_internal_notes: location.secretariat_internal_notes || '',
        parking_info: location.parking_info || '',
        attachment_path: location.attachment_path || '',
        attachment_name: location.attachment_name || '',
        attachment_file_type: location.attachment_file_type || '',
        attachment_thumbnail_path: location.attachment_thumbnail_path || '',
      });
      setEditingId(location.id);
    } else {
      setFormData(initialFormData);
      setEditingId(null);
    }
    setSelectedFile(null);
    setAttachmentMarkedForDeletion(false);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    locationMutation.mutate({
      id: editingId || undefined,
      data: formData
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add a handler for select changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as keyof LocationFormData;
    const value = e.target.value;
    
    if (name === 'country_code') {
      const selectedCountry = countries.find(c => c.iso2_code === value);
      if (selectedCountry) {
        // Create updated form data with country information
        const updatedFormData = { 
          ...formData, 
          country_code: selectedCountry.iso2_code,
          country: selectedCountry.name
        };
        
        // Add timezone from country if not already set
        if (selectedCountry.default_timezone && (!formData.timezone || formData.timezone === '')) {
          updatedFormData.timezone = selectedCountry.default_timezone;
        }
        
        // Update the form data
        setFormData(updatedFormData);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveAttachment = () => {
    if (editingId) {
      // Instead of immediately deleting, just mark it for deletion
      setAttachmentMarkedForDeletion(true);
      // Visually update the form to show the attachment is marked for deletion
      setFormData(prev => ({
        ...prev,
        attachment_path: '',
        attachment_name: '',
        attachment_file_type: '',
      }));
    } else {
      // For new locations, just clear the selected file
      setSelectedFile(null);
      setFormData(prev => ({
        ...prev,
        attachment_path: '',
        attachment_name: '',
        attachment_file_type: '',
      }));
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'name',
      headerName: 'Name',
      width: 150,
      flex: 1.3,
    },
    { 
      field: 'street_address',
      headerName: 'Address',
      width: 200,
      flex: 1.5,
    },
    { 
      field: 'city',
      headerName: 'City',
      width: 120,
      flex: 0.5,
    },
    { 
      field: 'state',
      headerName: 'State',
      width: 120,
      flex: 0.5,
    },
    { 
      field: 'country',
      headerName: 'Country',
      width: 120,
      flex: 0.5,
    },
    { 
      field: 'timezone',
      headerName: 'Timezone',
      width: 150,
      flex: 0.7,
    },
    {
      field: 'created_by_name',
      headerName: 'Created By',
      width: 150,
      flex: 0.8,
      renderCell: (params) => params.row.created_by_user 
        ? `${params.row.created_by_user.first_name} ${params.row.created_by_user.last_name}`
        : 'System'
    },
    {
      field: 'updated_by_name',
      headerName: 'Updated By',
      width: 150,
      flex: 0.8,
      renderCell: (params) => params.row.updated_by_user 
        ? `${params.row.updated_by_user.first_name} ${params.row.updated_by_user.last_name}`
        : '-'
    },
    {
      field: 'attachment',
      headerName: 'Attachment',
      width: 120,
      flex: 0.5,
      renderCell: (params) => {
        if (!params.row.attachment_path) return null;
        
        const isImage = params.row.attachment_file_type?.startsWith('image/');
        
        // Use the new public endpoint for accessing attachments
        const attachmentUrl = `${api.defaults.baseURL}/locations/${params.row.id}/attachment`;
        
        // For thumbnails, use the thumbnail endpoint
        const thumbnailUrl = `${api.defaults.baseURL}/locations/${params.row.id}/thumbnail`;
        
        return (
          <Link 
            href={attachmentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            {isImage ? (
              <img 
                src={thumbnailUrl} 
                alt={params.row.attachment_name}
                style={{ width: 24, height: 24, marginRight: 4, objectFit: 'cover' }}
              />
            ) : (
              <AttachFileIcon />
            )}
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {params.row.attachment_name?.split('.').pop()?.toUpperCase()}
            </Typography>
          </Link>
        );
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpen(params.row)}
        />,
      ],
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">Manage Locations</Typography>
            {!formOpen && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
              >
                Add Location
              </Button>
            )}
          </Box>

          <Collapse in={formOpen}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{editingId ? 'Edit Location' : 'Add New Location'}</Typography>
                  <IconButton onClick={handleClose} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Please use the location search box to automatically populate address details.
                </Typography>
                <Grid container spacing={2}>
                  {!editingId && (
                    <Grid item xs={12}>
                      <TextField
                        inputRef={inputRef}
                        fullWidth
                        label="Search for a location"
                        placeholder="Start typing to search..."
                        disabled={!mapsLoaded}
                        helperText={mapsError || (!mapsLoaded && 'Loading Google Maps...')}
                        error={!!mapsError}
                        InputProps={{
                          autoComplete: 'off',
                        }}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth required>
                      <InputLabel id="country-select-label">Country</InputLabel>
                      <Select
                        labelId="country-select-label"
                        id="country-select"
                        name="country_code"
                        value={formData.country_code}
                        onChange={handleSelectChange}
                        label="Country"
                        disabled={isLoadingCountries}
                      >
                        {countries.map((country) => (
                          <MenuItem key={country.iso2_code} value={country.iso2_code}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {isLoadingCountries && (
                        <FormHelperText>Loading countries...</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    {/* If the country has timezones, show a dropdown, otherwise show text field */}
                    {(() => {
                      const selectedCountry = countries.find(c => c.iso2_code === formData.country_code);
                      const hasTimezones = selectedCountry && selectedCountry.timezones && selectedCountry.timezones.length > 0;
                      
                      if (hasTimezones) {
                        // Get the list of available timezones
                        let availableTimezones = [...(selectedCountry.timezones || [])];
                        
                        // If current timezone isn't in the list but has a value, add it to ensure it's selectable
                        if (formData.timezone && !availableTimezones.includes(formData.timezone)) {
                          availableTimezones = [formData.timezone, ...availableTimezones];
                        }

                        console.log(availableTimezones);
                        console.log(formData.timezone);
                        
                        return (
                          <FormControl fullWidth>
                            <InputLabel id="timezone-select-label">Timezone</InputLabel>
                            <Select
                              labelId="timezone-select-label"
                              id="timezone-select"
                              name="timezone"
                              value={formData.timezone || ''}
                              onChange={handleSelectChange}
                              label="Timezone"
                            >
                              {availableTimezones.map((timezone) => (
                                <MenuItem key={timezone} value={timezone}>
                                  {timezone}
                                </MenuItem>
                              ))}
                            </Select>
                            <FormHelperText>Timezone for this location</FormHelperText>
                          </FormControl>
                        );
                      } else {
                        return (
                          <TextField
                            fullWidth
                            label="Timezone"
                            name="timezone"
                            value={formData.timezone || ''}
                            onChange={handleChange}
                            helperText="IANA timezone ID (e.g. America/New_York)"
                          />
                        );
                      }
                    })()}
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Driving Directions"
                      name="driving_directions"
                      value={formData.driving_directions}
                      onChange={handleChange}
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Parking Information"
                      name="parking_info"
                      value={formData.parking_info}
                      onChange={handleChange}
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Internal Notes"
                      name="secretariat_internal_notes"
                      value={formData.secretariat_internal_notes}
                      onChange={handleChange}
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Attachment
                      </Typography>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                      />
                      
                      {(() => {
                        if ((formData.attachment_path || selectedFile) && !attachmentMarkedForDeletion) {
                          return (
                            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {selectedFile && selectedFile.type.startsWith('image/') ? (
                                  <img 
                                    src={URL.createObjectURL(selectedFile)} 
                                    alt="Preview" 
                                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                                  />
                                ) : formData.attachment_file_type?.startsWith('image/') ? (
                                  <img 
                                    src={editingId ? 
                                      `${api.defaults.baseURL}/locations/${editingId}/thumbnail` : 
                                      ''
                                    } 
                                    alt="Attachment" 
                                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                                  />
                                ) : (
                                  <AttachFileIcon />
                                )}
                                <Box>
                                  <Typography>
                                    {selectedFile ? selectedFile.name : formData.attachment_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {selectedFile ? 
                                      `${(selectedFile.size / 1024).toFixed(1)} KB - ${selectedFile.type}` : 
                                      formData.attachment_file_type
                                    }
                                  </Typography>
                                </Box>
                              </Box>
                              <Box>
                                {formData.attachment_path && (
                                  <IconButton 
                                    component="a" 
                                    href={editingId ? `${api.defaults.baseURL}/locations/${editingId}/attachment` : formData.attachment_path} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    size="small"
                                    sx={{ mr: 1 }}
                                  >
                                    <UploadFileIcon fontSize="small" />
                                  </IconButton>
                                )}
                                <IconButton 
                                  onClick={handleRemoveAttachment} 
                                  size="small"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Paper>
                          );
                        }
                        
                        return (
                          <Box>
                            {attachmentMarkedForDeletion && editingId && (
                              <Paper 
                                variant="outlined" 
                                sx={{ 
                                  p: 2, 
                                  mb: 2, 
                                  bgcolor: 'warning.light',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <Typography variant="body2">
                                  Attachment will be removed when you save this location
                                </Typography>
                                <Button 
                                  size="small" 
                                  onClick={() => {
                                    // Restore the original attachment data
                                    const location = locations.find(loc => loc.id === editingId);
                                    if (location) {
                                      setFormData(prev => ({
                                        ...prev,
                                        attachment_path: location.attachment_path || '',
                                        attachment_name: location.attachment_name || '',
                                        attachment_file_type: location.attachment_file_type || '',
                                      }));
                                    }
                                    setAttachmentMarkedForDeletion(false);
                                  }}
                                >
                                  Undo
                                </Button>
                              </Paper>
                            )}
                            <Button
                              variant="outlined"
                              startIcon={<UploadFileIcon />}
                              onClick={triggerFileInput}
                              disabled={attachmentMarkedForDeletion}
                            >
                              Upload Attachment
                            </Button>
                          </Box>
                        );
                      })()}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button onClick={handleClose} disabled={locationMutation.isPending || isUploading}>Cancel</Button>
                <Button 
                  onClick={handleSubmit} 
                  variant="contained"
                  disabled={locationMutation.isPending || isUploading}
                >
                  {(locationMutation.isPending || isUploading) ? (
                    <CircularProgress size={24} />
                  ) : editingId ? 'Update' : 'Create'}
                </Button>
              </CardActions>
            </Card>
          </Collapse>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <GenericDataGrid
              rows={locations}
              columns={columns}
              loading={isLoading}
              defaultVisibleColumns={['name', 'street_address', 'city', 'attachment', 'actions']}
            />
          )}
        </Box>
      </Container>
    </Layout>
  );
} 