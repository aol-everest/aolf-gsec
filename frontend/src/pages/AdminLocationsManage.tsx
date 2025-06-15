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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EditIcon from '@mui/icons-material/Edit';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import Layout from '../components/Layout';
import LocationTable from '../components/LocationTable';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { PencilIconV2, TrashIconV2, DownloadIconV2 } from '../components/iconsv2';

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
  state_code?: string;
  city: string;
  country: string;
  country_code: string;
  zip_code: string;
  lat?: number;
  lng?: number;
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
  is_active: boolean;
}

interface LocationFormData {
  name: string;
  street_address: string;
  state: string;
  state_code?: string;
  city: string;
  country: string;
  country_code: string;
  zip_code: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  driving_directions?: string;
  secretariat_internal_notes?: string;
  parking_info?: string;
  attachment_path?: string;
  attachment_name?: string;
  attachment_file_type?: string;
  attachment_thumbnail_path?: string;
  is_active: boolean;
}

const initialFormData: LocationFormData = {
  name: '',
  street_address: '',
  state: '',
  state_code: '',
  city: '',
  country: '',
  country_code: '',
  zip_code: '',
  lat: 0,
  lng: 0,
  timezone: '',
  driving_directions: '',
  secretariat_internal_notes: '',
  parking_info: '',
  attachment_path: '',
  attachment_name: '',
  attachment_file_type: '',
  attachment_thumbnail_path: '',
  is_active: true,
};

// Meeting Place Interface
interface MeetingPlace {
  id: number;
  location_id: number;
  name: string;
  description?: string;
  floor?: string;
  room_number?: string;
  building?: string;
  additional_directions?: string;
  is_default: boolean;
  is_active: boolean;
  lat?: number;
  lng?: number;
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
}

interface MeetingPlaceFormData {
  name: string;
  description?: string;
  floor?: string;
  room_number?: string;
  building?: string;
  additional_directions?: string;
  is_default: boolean;
  is_active: boolean;
  lat?: number;
  lng?: number;
}

const initialMeetingPlaceFormData: MeetingPlaceFormData = {
  name: '',
  description: '',
  floor: '',
  room_number: '',
  building: '',
  additional_directions: '',
  is_default: false,
  is_active: true,
  lat: undefined,
  lng: undefined,
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
  const [meetingPlaceFormOpen, setMeetingPlaceFormOpen] = useState(false);
  const [meetingPlaceFormData, setMeetingPlaceFormData] = useState<MeetingPlaceFormData>(initialMeetingPlaceFormData);
  const [editingMeetingPlaceId, setEditingMeetingPlaceId] = useState<number | null>(null);

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

  // Query for fetching locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Location[]>('/admin/locations/all');
        // console.log("locations", data);
        return data;
      } catch (error) {
        enqueueSnackbar('Failed to fetch locations', { variant: 'error' });
        throw error;
      }
    }
  });

  // Query for fetching meeting places for the current location
  const { data: meetingPlaces = [], isLoading: isLoadingMeetingPlaces } = useQuery({
    queryKey: ['locations', editingId, 'meetingPlaces'],
    queryFn: async () => {
      if (!editingId) return []; // Don't fetch if not editing a specific location
      try {
        const { data } = await api.get<MeetingPlace[]>(`/admin/locations/${editingId}/meeting_places`);
        return data;
      } catch (error) {
        enqueueSnackbar('Failed to fetch meeting places', { variant: 'error' });
        console.error("Error fetching meeting places:", error);
        return [];
      }
    },
    enabled: !!editingId, // Only run the query if editingId is set
  });

  // Helper function to geocode a location and return coordinates
  const geocodeLocation = useCallback(async (locationData: Partial<LocationFormData>): Promise<{lat: number, lng: number} | null> => {
    if (!locationData.street_address || !locationData.city || !locationData.country_code) {
      console.log("Insufficient address data for geocoding");
      return null;
    }

    try {
      // Construct address string
      const addressString = `${locationData.street_address}, ${locationData.city}, ${locationData.state || ''}, ${locationData.country}`;
      console.log("Geocoding address:", addressString);
      
      // Call Google Maps Geocoding API
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(geocodingUrl);
      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const { lat, lng } = location;
        console.log("Geocoded coordinates:", lat, lng);
        return { lat, lng };
      } else {
        console.error("Geocoding failed:", data.status);
        return null;
      }
    } catch (error) {
      console.error("Error in geocoding:", error);
      return null;
    }
  }, []);

  // Derive timezone for a location based on country/state
  const deriveTimezoneForLocation = useCallback((locationData: Partial<LocationFormData>, coordinates?: {lat: number, lng: number}) => {
    console.log("Deriving timezone for location", locationData, coordinates);
    // Default timezone value
    let defaultTimezone = '';
    let skipAPICall = false;
    
    // Find matching country in our dropdown list
    const matchedCountry = countries.find(c => 
      c.iso2_code === locationData.country_code || 
      c.name === locationData.country
    );
    
    // Use US state-based logic if applicable
    if (locationData.country_code === 'US' && (locationData.state || locationData.state_code)) {
      // US state-based timezone mapping
      const stateCode = locationData.state_code || (
        locationData.state && 
        (
          locationData.state.length > 2 ? 
          locationData.state.substring(0, 2).toUpperCase() : 
          locationData.state.toUpperCase()
        )
      );
        
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
      
      if (stateCode && usStateTimezones[stateCode]) {
        defaultTimezone = usStateTimezones[stateCode];
        skipAPICall = true; // US state mapping is reliable, no need for API
      } else {
        defaultTimezone = 'America/New_York'; // Default for US
      }
    } 
    // Use country data if available
    else if (matchedCountry && matchedCountry.default_timezone) {
      defaultTimezone = matchedCountry.default_timezone;
      // If country has only one timezone, it's reliable
      skipAPICall = !!(matchedCountry.timezones && matchedCountry.timezones.length === 1);
    } 
    // Try first timezone from country list
    else if (matchedCountry && matchedCountry.timezones && matchedCountry.timezones.length > 0) {
      defaultTimezone = matchedCountry.timezones[0];
    } 
    // Last resort
    else {
      defaultTimezone = 'UTC';
    }
    
    // Set initial timezone
    const result = {
      timezone: defaultTimezone,
      updateTimezone: (newTimezone: string) => {
        setFormData(prev => ({
          ...prev,
          timezone: newTimezone
        }));
      }
    };
    
    // If coordinates are available and API call not skipped, fetch more precise timezone
    if (coordinates && !skipAPICall) {
      const { lat, lng } = coordinates;
      const timestamp = Math.floor(Date.now() / 1000);
      const timezoneApiUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
      
      // Initiate fetch but don't wait for it
      fetch(timezoneApiUrl)
        .then(response => response.json())
        .then(data => {
          if (data.status === "OK" && data.timeZoneId) {
            result.updateTimezone(data.timeZoneId);
          }
        })
        .catch(error => {
          console.error('Error fetching timezone:', error);
          // Default timezone already set, so no need to do anything here
        });
    }
    
    return result;
  }, [countries]);

  // Function to close the form and reset state
  const handleClose = () => {
    setFormOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
    setSelectedFile(null);
    setAttachmentMarkedForDeletion(false);
  };

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

  // Mutation for creating meeting places
  const meetingPlaceMutation = useMutation({
    mutationFn: async (variables: { locationId: number; data: MeetingPlaceFormData }) => {
      const { data } = await api.post<MeetingPlace>(
        `/admin/locations/${variables.locationId}/meeting_places/new`,
        variables.data
      );
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the meeting places query for the current location
      queryClient.invalidateQueries({ queryKey: ['locations', editingId, 'meetingPlaces'] });
      enqueueSnackbar(`Meeting Place '${data.name}' created successfully`, { variant: 'success' });
      setMeetingPlaceFormOpen(false);
      setMeetingPlaceFormData(initialMeetingPlaceFormData);
    },
    onError: (error) => {
      console.error("Error creating meeting place:", error);
      enqueueSnackbar('Failed to create meeting place', { variant: 'error' });
    }
  });

  // Mutation for updating meeting places
  const updateMeetingPlaceMutation = useMutation({
    mutationFn: async (variables: { meetingPlaceId: number; data: MeetingPlaceFormData }) => {
      const { data } = await api.patch<MeetingPlace>(
        `/admin/meeting_places/update/${variables.meetingPlaceId}`,
        variables.data
      );
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the meeting places query for the current location
      queryClient.invalidateQueries({ queryKey: ['locations', editingId, 'meetingPlaces'] });
      enqueueSnackbar(`Meeting Place '${data.name}' updated successfully`, { variant: 'success' });
      setMeetingPlaceFormOpen(false);
      setMeetingPlaceFormData(initialMeetingPlaceFormData);
      setEditingMeetingPlaceId(null);
    },
    onError: (error) => {
      console.error("Error updating meeting place:", error);
      enqueueSnackbar('Failed to update meeting place', { variant: 'error' });
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
        let stateCode = '';
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
            stateCode = component.short_name;
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

        // Get coordinates for timezone lookup and store them
        let lat = 0, lng = 0;
        if (place.geometry?.location) {
          lat = place.geometry.location.lat();
          lng = place.geometry.location.lng();
        }

        // Create location data object with coordinates
        const locationData = {
          name: place.name || '',
          street_address: `${streetNumber} ${route}`.trim(),
          city,
          state,
          state_code: stateCode,
          country: matchedCountry ? matchedCountry.name : country,
          country_code: matchedCountry ? matchedCountry.iso2_code : countryCode,
          zip_code: postalCode,
          lat,
          lng,
          driving_directions: directionsUrl,
        };

        // Use coordinates for timezone if available
        const coordinates = lat && lng ? { lat, lng } : undefined;
        const result = deriveTimezoneForLocation(locationData, coordinates);
        
        // Set form data with all location information including coordinates and derived timezone
        setFormData({
          ...locationData,
          timezone: result.timezone,
          is_active: true // Default to active for new locations
        });

        // Clear the input after selection
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      enqueueSnackbar('Location search failed. Please enter the location manually.', { variant: 'error' });
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
    // First, prepare basic form data and open the form immediately
    if (location) {
      // Create location data from existing location
      const locationData = {
        name: location.name,
        street_address: location.street_address,
        state: location.state,
        state_code: location.state_code || '',
        city: location.city,
        country: location.country,
        country_code: location.country_code,
        zip_code: location.zip_code,
        lat: location.lat || 0,
        lng: location.lng || 0,
        timezone: location.timezone || '',
        driving_directions: location.driving_directions || '',
        secretariat_internal_notes: location.secretariat_internal_notes || '',
        parking_info: location.parking_info || '',
        attachment_path: location.attachment_path || '',
        attachment_name: location.attachment_name || '',
        attachment_file_type: location.attachment_file_type || '',
        attachment_thumbnail_path: location.attachment_thumbnail_path || '',
        is_active: location.is_active,
      };
      
      // Set form data with existing values immediately
      setFormData(locationData);
      setEditingId(location.id);
      
      // After setting the form data, handle geocoding and timezone updates asynchronously
      // This allows the form to render immediately while these processes happen in the background
      setTimeout(async () => {
        // If coordinates are missing, try to geocode the address
        if ((!location.lat || !location.lng) && location.street_address) {
          try {
            const coordinates = await geocodeLocation(locationData);
            if (coordinates) {
              // Update the form data with the new coordinates
              setFormData(prev => ({
                ...prev,
                lat: coordinates.lat,
                lng: coordinates.lng
              }));
              
              // If we don't have a timezone yet, use the coordinates to derive one
              if (!location.timezone || location.timezone.trim() === '') {
                const result = deriveTimezoneForLocation(locationData, coordinates);
                setFormData(prev => ({
                  ...prev,
                  timezone: result.timezone
                }));
              }
            }
          } catch (error) {
            console.error("Error geocoding location:", error);
          }
        } 
        // If timezone is missing but we have coordinates, derive timezone from the coordinates
        else if ((!location.timezone || location.timezone.trim() === '') && location.lat && location.lng) {
          const coordinates = { lat: location.lat, lng: location.lng };
          const result = deriveTimezoneForLocation(locationData, coordinates);
          
          // Update the form data with the derived timezone
          setFormData(prev => ({
            ...prev,
            timezone: result.timezone
          }));
        }
        // If both coordinates and timezone are missing, just use default timezone
        else if (!location.timezone || location.timezone.trim() === '') {
          const result = deriveTimezoneForLocation(locationData);
          
          // Update the form data with the derived timezone
          setFormData(prev => ({
            ...prev,
            timezone: result.timezone
          }));
        }
      }, 0);
    } else {
      setFormData(initialFormData);
      setEditingId(null);
    }
    
    // Always set these immediately
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

  // Handle regular form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const name = e.target.name as keyof LocationFormData;
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handles changing the country in the dropdown
  const handleCountryChange = (e: SelectChangeEvent<string>) => {
    const countryName = e.target.value;
    const selectedCountry = countries.find(c => c.name === countryName);
    
    setFormData(prev => {
      const updatedFormData = {
        ...prev,
        country: countryName,
        country_code: selectedCountry?.iso2_code || ''
      };
      
      // Get timezone for the newly selected country
      const result = deriveTimezoneForLocation(updatedFormData);
      
      return {
        ...updatedFormData,
        timezone: result.timezone
      };
    });
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

  // Open Meeting Place Form for creation
  const handleOpenMeetingPlaceForm = () => {
    // Pre-fill coords from parent location if available
    setMeetingPlaceFormData({
      ...initialMeetingPlaceFormData,
      lat: formData.lat || undefined,
      lng: formData.lng || undefined,
    });
    setEditingMeetingPlaceId(null); // Ensure we're in create mode
    setMeetingPlaceFormOpen(true);
  };

  // Open Meeting Place Form for editing
  const handleEditMeetingPlace = (meetingPlace: MeetingPlace) => {
    setMeetingPlaceFormData({
      name: meetingPlace.name,
      description: meetingPlace.description || '',
      floor: meetingPlace.floor || '',
      room_number: meetingPlace.room_number || '',
      building: meetingPlace.building || '',
      additional_directions: meetingPlace.additional_directions || '',
      is_default: meetingPlace.is_default,
      is_active: meetingPlace.is_active,
      lat: meetingPlace.lat,
      lng: meetingPlace.lng,
    });
    setEditingMeetingPlaceId(meetingPlace.id);
    setMeetingPlaceFormOpen(true);
  };

  // Close Meeting Place Form
  const handleCloseMeetingPlaceForm = () => {
    setMeetingPlaceFormOpen(false);
    setMeetingPlaceFormData(initialMeetingPlaceFormData);
    setEditingMeetingPlaceId(null);
  };

  // Handle Meeting Place Form Input Changes
  const handleMeetingPlaceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        // Cast to HTMLInputElement to access the checked property
        setMeetingPlaceFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number' && e.target instanceof HTMLInputElement) {
        setMeetingPlaceFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
        setMeetingPlaceFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Submit Meeting Place Form
  const handleSubmitMeetingPlace = () => {
    if (editingMeetingPlaceId) {
      // Update existing meeting place
      updateMeetingPlaceMutation.mutate({ 
        meetingPlaceId: editingMeetingPlaceId, 
        data: meetingPlaceFormData 
      });
    } else {
      // Create new meeting place
      if (!editingId) {
        enqueueSnackbar('Cannot add meeting place without a saved location.', { variant: 'error' });
        return;
      }
      meetingPlaceMutation.mutate({ locationId: editingId, data: meetingPlaceFormData });
    }
  };

  // Handle location edit
  const handleEditLocation = (locationId: number) => {
    const location = locations.find(loc => loc.id === locationId);
    if (location) {
      handleOpen(location);
    }
  };

  // Load countries data for new and existing locations
  useEffect(() => {
    if (!countries || countries.length === 0) {
      // Re-fetch countries if needed
      if (locations) {
        // If we have location data and countries are now loaded, update default timezone
        locations.forEach(location => {
          const result = deriveTimezoneForLocation(location);
          setFormData(prev => ({
            ...prev,
            timezone: result.timezone
          }));
        });
      }
    }
  }, [countries, locations]);

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h1">Manage Locations</Typography>
            {!formOpen && (
              <PrimaryButton
                size="medium"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
              >
                Add Location
              </PrimaryButton>
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
                        onChange={handleCountryChange}
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

                        return (
                          <FormControl fullWidth>
                            <InputLabel id="timezone-select-label">Timezone</InputLabel>
                            <Select
                              labelId="timezone-select-label"
                              id="timezone-select"
                              name="timezone"
                              value={formData.timezone || ''}
                              onChange={handleChange}
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
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={formData.is_active} 
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          name="is_active" 
                        />
                      }
                      label="Location is Active"
                      sx={{ mt: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
                      Inactive locations will be hidden from front-end users
                    </Typography>
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
                                    <DownloadIconV2 sx={{ width: 20, height: 20 }} />
                                  </IconButton>
                                )}
                                <IconButton 
                                  onClick={handleRemoveAttachment} 
                                  size="small"
                                >
                                  <TrashIconV2 sx={{ width: 20, height: 20 }} />
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
                                <SecondaryButton 
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
                                </SecondaryButton>
                              </Paper>
                            )}
                            <SecondaryButton
                              size="small"
                              startIcon={<UploadFileIcon />}
                              onClick={triggerFileInput}
                              disabled={attachmentMarkedForDeletion}
                            >
                              Upload Attachment
                            </SecondaryButton>
                          </Box>
                        );
                      })()}
                    </Box>
                  </Grid>
                  {/* Meeting Places Section (only visible when editing) */}
                  {editingId && (
                    <Grid item xs={12}>
                      <Box sx={{ mt: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Meeting Places
                        </Typography>
                        {/* TODO: Add list/grid of existing meeting places here */}
                        {isLoadingMeetingPlaces ? (
                          <CircularProgress size={24} />
                        ) : meetingPlaces.length > 0 ? (
                          <List dense sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            {meetingPlaces.map((mp, index) => (
                              <React.Fragment key={mp.id}>
                                <ListItem>
                                  <ListItemText
                                    primary={mp.name}
                                    secondary={`Building: ${mp.building || 'N/A'}, Floor: ${mp.floor || 'N/A'}, Room: ${mp.room_number || 'N/A'}`}
                                  />
                                  <ListItemSecondaryAction>
                                    {/* Enable Edit button */}
                                    <Tooltip title="Edit Meeting Place">
                                      <IconButton 
                                        edge="end" 
                                        aria-label="edit" 
                                        onClick={() => handleEditMeetingPlace(mp)}
                                      >
                                        <EditIcon fontSize="small"/>
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Meeting Place (Coming Soon)">
                                      <span>
                                        <IconButton edge="end" aria-label="delete" disabled>
                                          <DeleteIcon fontSize="small"/>
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </ListItemSecondaryAction>
                                </ListItem>
                                {index < meetingPlaces.length - 1 && <Divider component="li" />}
                              </React.Fragment>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            No meeting places added yet.
                          </Typography>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={handleOpenMeetingPlaceForm}
                        >
                          Add Meeting Place
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <SecondaryButton 
                  size="medium"
                  onClick={handleClose} 
                  disabled={locationMutation.isPending || isUploading}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton 
                  size="medium"
                  onClick={handleSubmit} 
                  disabled={locationMutation.isPending || isUploading}
                >
                  {(locationMutation.isPending || isUploading) ? (
                    <CircularProgress size={24} />
                  ) : editingId ? 'Update' : 'Create'}
                </PrimaryButton>
              </CardActions>
            </Card>
          </Collapse>

          <LocationTable
            locations={locations}
            onEdit={handleEditLocation}
            baseUrl={api.defaults.baseURL}
            loading={isLoading}
            enableSearch={true}
            searchPlaceholder="Search locations by name, address, city, state, or country..."
            searchableFields={['name', 'street_address', 'city', 'state', 'country']}
          />
        </Box>
      </Container>

      {/* Meeting Place Dialog - Update title and button text based on mode */}
      <Dialog 
        open={meetingPlaceFormOpen} 
        onClose={handleCloseMeetingPlaceForm} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>{editingMeetingPlaceId ? 'Edit Meeting Place' : 'Add New Meeting Place'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meeting Place Name"
                name="name"
                value={meetingPlaceFormData.name}
                onChange={handleMeetingPlaceChange}
                required
                autoFocus
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Building"
                name="building"
                value={meetingPlaceFormData.building || ''}
                onChange={handleMeetingPlaceChange}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Floor"
                name="floor"
                value={meetingPlaceFormData.floor || ''}
                onChange={handleMeetingPlaceChange}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Room Number"
                name="room_number"
                value={meetingPlaceFormData.room_number || ''}
                onChange={handleMeetingPlaceChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={meetingPlaceFormData.description || ''}
                onChange={handleMeetingPlaceChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Directions"
                name="additional_directions"
                value={meetingPlaceFormData.additional_directions || ''}
                onChange={handleMeetingPlaceChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Latitude (Optional)"
                name="lat"
                type="number"
                value={meetingPlaceFormData.lat ?? ''} // Use ?? to show empty string for undefined
                onChange={handleMeetingPlaceChange}
                inputProps={{ step: "any" }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Longitude (Optional)"
                name="lng"
                type="number"
                value={meetingPlaceFormData.lng ?? ''} // Use ?? to show empty string for undefined
                onChange={handleMeetingPlaceChange}
                inputProps={{ step: "any" }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Switch checked={meetingPlaceFormData.is_default} onChange={handleMeetingPlaceChange} name="is_default" />}
                label="Default Meeting Place"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Switch checked={meetingPlaceFormData.is_active} onChange={handleMeetingPlaceChange} name="is_active" />}
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={handleCloseMeetingPlaceForm}>Cancel</SecondaryButton>
          <PrimaryButton 
            onClick={handleSubmitMeetingPlace} 
            disabled={(meetingPlaceMutation.isPending || updateMeetingPlaceMutation.isPending) || !meetingPlaceFormData.name}
          >
            {(meetingPlaceMutation.isPending || updateMeetingPlaceMutation.isPending) ? 
              <CircularProgress size={24} /> : 
              editingMeetingPlaceId ? 'Update Meeting Place' : 'Add Meeting Place'
            }
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Layout>
  );
} 