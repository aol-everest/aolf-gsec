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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
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

interface Location {
  id: number;
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  zip_code: string;
  driving_directions?: string;
  secretariat_internal_notes?: string;
  parking_info?: string;
  created_at: string;
  updated_at?: string;
}

interface LocationFormData {
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  zip_code: string;
  driving_directions?: string;
  secretariat_internal_notes?: string;
  parking_info?: string;
}

const initialFormData: LocationFormData = {
  name: '',
  street_address: '',
  state: '',
  city: '',
  country: '',
  zip_code: '',
  driving_directions: '',
  secretariat_internal_notes: '',
  parking_info: '',
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

export default function LocationsManage() {
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const api = useApi();
  const queryClient = useQueryClient();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isLoaded: mapsLoaded, error: mapsError } = useGoogleMapsScript();

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

  // Mutation for creating/updating locations
  const locationMutation = useMutation({
    mutationFn: async (variables: { id?: number; data: LocationFormData }) => {
      if (variables.id) {
        const { data } = await api.patch<Location>(`/admin/locations/update/${variables.id}`, variables.data);
        return data;
      } else {
        const { data } = await api.post<Location>('/admin/locations/new', variables.data);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      enqueueSnackbar(editingId ? 'Location updated successfully' : 'Location created successfully', { variant: 'success' });
      handleClose();
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
          } else if (types.includes('postal_code')) {
            postalCode = component.long_name;
          }
        });

        const formattedAddress = place.formatted_address || `${streetNumber} ${route}, ${city}, ${state} ${postalCode}, ${country}`;
        const encodedAddress = encodeURIComponent(formattedAddress);
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

        setFormData(prev => ({
          ...prev,
          name: place.name || '',
          street_address: `${streetNumber} ${route}`.trim(),
          city,
          state,
          country,
          zip_code: postalCode,
          driving_directions: directionsUrl,
        }));

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
  }, [mapsLoaded, enqueueSnackbar]);

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
        zip_code: location.zip_code,
        driving_directions: location.driving_directions || '',
        secretariat_internal_notes: location.secretariat_internal_notes || '',
        parking_info: location.parking_info || '',
      });
      setEditingId(location.id);
    } else {
      setFormData(initialFormData);
      setEditingId(null);
    }
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
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

  const columns: GridColDef[] = [
    { 
      field: 'name',
      headerName: 'Name',
      width: 150,
      flex: 1,
    },
    { 
      field: 'street_address',
      headerName: 'Address',
      width: 200,
      flex: 1,
    },
    { 
      field: 'city',
      headerName: 'City',
      width: 120,
      flex: 1,
    },
    { 
      field: 'state',
      headerName: 'State',
      width: 120,
      flex: 1,
    },
    { 
      field: 'country',
      headerName: 'Country',
      width: 120,
      flex: 1,
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleChange}
                      required
                    />
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
                </Grid>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button onClick={handleClose} disabled={locationMutation.isPending}>Cancel</Button>
                <Button 
                  onClick={handleSubmit} 
                  variant="contained"
                  disabled={locationMutation.isPending}
                >
                  {locationMutation.isPending ? (
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
            />
          )}
        </Box>
      </Container>
    </Layout>
  );
} 