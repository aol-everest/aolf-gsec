import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  Container,
  Card,
  CardContent,
  CardActions,
  Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import { useApi } from '../hooks/useApi';
import Layout from '../components/Layout';

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

export default function LocationsManage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const api = useApi();

  const initializeAutocomplete = useCallback(() => {
    const input = document.getElementById('google-places-autocomplete') as HTMLInputElement;
    if (input && (window as any).google?.maps?.places?.Autocomplete) {
      const autocompleteInstance = new (window as any).google.maps.places.Autocomplete(input, {
        types: ['establishment', 'geocode'],
        fields: ['name', 'geometry', 'address_components'],
      }) as GoogleMapsAutocomplete;
      
      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (!place.geometry) {
          enqueueSnackbar('No details available for this place', { variant: 'warning' });
          return;
        }

        // Extract address components
        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let country = '';
        let postalCode = '';

        place.address_components?.forEach((component: AddressComponent) => {
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

        setFormData(prev => ({
          ...prev,
          name: place.name || '',
          street_address: `${streetNumber} ${route}`.trim(),
          city,
          state,
          country,
          zip_code: postalCode,
        }));
      });
    }
  }, [enqueueSnackbar]);

  // Load Google Places API script
  useEffect(() => {
    if (!scriptLoaded && !window.google) {
      const existingScript = document.getElementById('google-places-script');
      if (!existingScript) {
        const googlePlacesScript = document.createElement('script');
        googlePlacesScript.id = 'google-places-script';
        googlePlacesScript.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
        googlePlacesScript.async = true;
        googlePlacesScript.defer = true;
        googlePlacesScript.onload = () => {
          setScriptLoaded(true);
        };
        document.head.appendChild(googlePlacesScript);
      }
    }
  }, [scriptLoaded]);

  // Initialize autocomplete when form opens
  useEffect(() => {
    if (formOpen && scriptLoaded && !editingId) {
      initializeAutocomplete();
    }
  }, [formOpen, scriptLoaded, editingId, initializeAutocomplete]);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get<Location[]>('/admin/locations/all');
      setLocations(data);
    } catch (error) {
      enqueueSnackbar('Failed to fetch locations', { variant: 'error' });
    }
  };

  useEffect(() => {
    fetchLocations();
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

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await api.patch(`/admin/locations/update/${editingId}`, formData);
        enqueueSnackbar('Location updated successfully', { variant: 'success' });
      } else {
        await api.post('/admin/locations/new', formData);
        enqueueSnackbar('Location created successfully', { variant: 'success' });
      }
      handleClose();
      fetchLocations();
    } catch (error) {
      enqueueSnackbar('Failed to save location', { variant: 'error' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
                        id="google-places-autocomplete"
                        fullWidth
                        label="Search for a location"
                        placeholder="Start typing to search..."
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
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </CardActions>
            </Card>
          </Collapse>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>{location.name}</TableCell>
                    <TableCell>{location.street_address}</TableCell>
                    <TableCell>{location.city}</TableCell>
                    <TableCell>{location.state}</TableCell>
                    <TableCell>{location.country}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpen(location)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>
    </Layout>
  );
} 