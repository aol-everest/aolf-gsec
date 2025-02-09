import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useEffect, useState, useCallback } from 'react';

// Add proper type declarations for Google Maps
declare namespace google.maps {
  namespace places {
    class AutocompleteService {
      getPlacePredictions(
        request: AutocompletionRequest,
        callback?: (predictions: AutocompletePrediction[], status: PlacesServiceStatus) => void
      ): Promise<{ predictions: AutocompletePrediction[] }>;
    }

    class PlacesService {
      constructor(attrContainer: Element);
      getDetails(
        request: { placeId: string },
        callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void
      ): void;
    }

    interface AutocompletePrediction {
      description: string;
      place_id: string;
      structured_formatting: {
        main_text: string;
        secondary_text: string;
      };
      terms: Array<{
        offset: number;
        value: string;
      }>;
      types: string[];
    }

    interface PlaceResult {
      address_components?: AddressComponent[];
      formatted_address?: string;
      geometry?: {
        location: LatLng;
        viewport?: LatLngBounds;
      };
      name?: string;
      place_id?: string;
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    enum PlacesServiceStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      INVALID_REQUEST = 'INVALID_REQUEST'
    }

    interface AutocompletionRequest {
      input: string;
      types?: string[];
      componentRestrictions?: {
        country?: string | string[];
      };
    }
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  class LatLngBounds {
    constructor(sw: LatLng, ne: LatLng);
    getNorthEast(): LatLng;
    getSouthWest(): LatLng;
  }
}

interface Place {
  description: string;
  place_id: string;
  terms?: Array<{
    value: string;
    offset: number;
  }>;
  address_components?: google.maps.places.AddressComponent[];
  formatted_address?: string;
}

interface LocationAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  types?: string[];
  componentRestrictions?: { country?: string | string[] };
  onPlaceSelect?: (place: Place) => void;
}

declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: typeof google.maps.places.AutocompleteService;
          PlacesService: typeof google.maps.places.PlacesService;
          PlacesServiceStatus: typeof google.maps.places.PlacesServiceStatus;
        };
      };
    };
    initGoogleMapsCallback: () => void;
    googleMapsInitialized: boolean;
  }
}

// Get API key from environment variable
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

// Debug log the API key (remove in production)
// console.log('Google Maps API Key:', GOOGLE_MAPS_API_KEY);

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  value = '',
  onChange,
  error,
  helperText,
  types = ['(cities)'],
  componentRestrictions,
  onPlaceSelect,
}) => {
  console.log(`[${label}] Rendering with:`, {
    value,
    types,
    componentRestrictions,
  });

  const [inputValue, setInputValue] = useState<string>(value || '');
  const [options, setOptions] = useState<Place[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    console.log(`[${label}] Value changed to:`, value);
    setInputValue(value || '');
  }, [value, label]);

  const initializeAutocompleteService = useCallback(() => {
    console.log(`[${label}] Initializing AutocompleteService`);
    if (!window.google?.maps?.places) {
      console.error(`[${label}] Google Maps Places API not available`);
      setUseGoogleMaps(false);
      return;
    }

    try {
      const service = new window.google.maps.places.AutocompleteService();
      console.log(`[${label}] AutocompleteService created successfully`);
      setAutocompleteService(service);
    } catch (error) {
      console.error(`[${label}] Error initializing AutocompleteService:`, error);
      setUseGoogleMaps(false);
    }
  }, [label]);

  useEffect(() => {
    console.log(`[${label}] Setting up Google Maps with API key:`, GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error(`[${label}] No API key provided`);
      setUseGoogleMaps(false);
      return;
    }

    const setupService = () => {
      console.log(`[${label}] Setting up service after script load`);
      window.googleMapsInitialized = true;
      initializeAutocompleteService();
    };

    // Check if Google Maps is already fully loaded
    if (window.google?.maps?.places) {
      console.log(`[${label}] Google Maps already loaded, setting up service`);
      setupService();
      return;
    }

    // If the script exists but hasn't loaded yet
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      console.log(`[${label}] Script exists but not loaded, adding load listener`);
      const loadHandler = () => {
        console.log(`[${label}] Existing script loaded`);
        setupService();
      };
      existingScript.addEventListener('load', loadHandler);
      return () => existingScript.removeEventListener('load', loadHandler);
    }

    // Add new script if none exists
    console.log(`[${label}] No script found, adding new one`);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    const loadHandler = () => {
      console.log(`[${label}] New script loaded`);
      setupService();
    };

    script.addEventListener('load', loadHandler);
    script.addEventListener('error', (error) => {
      console.error(`[${label}] Failed to load Google Maps script:`, error);
      setScriptError('Failed to load Google Maps script');
      setUseGoogleMaps(false);
    });

    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', loadHandler);
    };
  }, [initializeAutocompleteService, label]);

  // Mark this component as using Google Maps
  useEffect(() => {
    const marker = document.createElement('div');
    marker.setAttribute('data-using-google-maps', 'true');
    marker.style.display = 'none';
    document.body.appendChild(marker);

    return () => {
      marker.remove();
    };
  }, []);

  useEffect(() => {
    if (window.google?.maps?.places) {
      // Create a dummy div for PlacesService (required but not used)
      const dummyElement = document.createElement('div');
      const service = new window.google.maps.places.PlacesService(dummyElement);
      setPlacesService(service);
    }
  }, []);

  const getPlaceDetails = async (placeId: string): Promise<Place | null> => {
    if (!placesService) return null;

    return new Promise((resolve) => {
      placesService.getDetails(
        { placeId },
        (
          result: google.maps.places.PlaceResult | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            resolve({
              description: result.formatted_address || '',
              place_id: placeId,
              address_components: result.address_components || [],
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  const fetchPlacePredictions = async (input: string) => {
    console.log(`[${label}] Fetching predictions for:`, {
      input,
      types,
      componentRestrictions,
      hasService: !!autocompleteService,
      useGoogleMaps
    });

    if (!input || !autocompleteService || !useGoogleMaps) {
      console.log(`[${label}] Skipping prediction fetch due to missing requirements`);
      return;
    }

    setLoading(true);
    try {
      const request = {
        input,
        types,
        componentRestrictions,
      };
      console.log(`[${label}] Making prediction request:`, request);

      const response = await autocompleteService.getPlacePredictions(request);
      console.log(`[${label}] Received predictions:`, response);

      const predictions = response.predictions.map((prediction: any) => ({
        description: prediction.description,
        place_id: prediction.place_id,
        terms: prediction.terms,
      }));

      console.log(`[${label}] Processed predictions:`, predictions);
      setOptions(predictions);
    } catch (error) {
      console.error(`[${label}] Error fetching predictions:`, error);
      setOptions([]);
      setUseGoogleMaps(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (inputValue && useGoogleMaps) {
      console.log(`[${label}] Setting up prediction fetch timeout for:`, inputValue);
      timeoutId = setTimeout(() => {
        fetchPlacePredictions(inputValue);
      }, 300);
    } else {
      setOptions([]);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [inputValue, useGoogleMaps, componentRestrictions, label]);

  const handleOptionSelect = async (option: Place | string | null) => {
    console.log(`[${label}] Option selected:`, option);
    
    if (!option) {
      onChange('');
      return;
    }

    const selectedPlace = typeof option === 'string' ? null : option;
    if (!selectedPlace) {
      onChange(typeof option === 'string' ? option : '');
      return;
    }

    const placeDetails = await getPlaceDetails(selectedPlace.place_id);
    if (placeDetails) {
      // For country, use the full name
      if (types?.includes('country')) {
        const country = placeDetails.address_components?.find(
          component => component.types.includes('country')
        );
        if (country) {
          onChange(country.long_name);
        }
      }
      // For state, use the short name (abbreviation)
      else if (types?.includes('administrative_area_level_1')) {
        const state = placeDetails.address_components?.find(
          component => component.types.includes('administrative_area_level_1')
        );
        if (state) {
          onChange(state.short_name);
        }
      }
      // For city, use the locality name only
      else if (types?.includes('locality') || types?.includes('sublocality')) {
        const city = placeDetails.address_components?.find(
          component => component.types.includes('locality') || component.types.includes('sublocality')
        );
        if (city) {
          onChange(city.long_name);
        }
      } else {
        onChange(selectedPlace.description);
      }

      if (onPlaceSelect) {
        onPlaceSelect(placeDetails);
      }
    } else {
      onChange(selectedPlace.description);
    }
  };

  if (!useGoogleMaps) {
    console.log(`[${label}] Falling back to regular text input. Error:`, scriptError);
    return (
      <TextField
        fullWidth
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        helperText={helperText}
      />
    );
  }

  return (
    <Autocomplete
      freeSolo
      options={options}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.description}
      value={value || ''}
      onChange={(_, newValue) => handleOptionSelect(newValue)}
      onInputChange={(_, newInputValue) => {
        console.log(`[${label}] Input value changing to:`, newInputValue);
        setInputValue(newInputValue || '');
      }}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
};

export default LocationAutocomplete; 