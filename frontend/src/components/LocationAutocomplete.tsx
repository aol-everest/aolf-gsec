import React from 'react';
import { Autocomplete, TextField, CircularProgress, MenuItem } from '@mui/material';
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
  autoComplete?: string;
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
  autoComplete,
}) => {
//   console.log(`[${label}] Rendering with:`, {
//     value,
//     types,
//     componentRestrictions,
//   });

  const [inputValue, setInputValue] = useState<string>(value || '');
  const [options, setOptions] = useState<Place[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    // console.log(`[${label}] Value changed to:`, value);
    setInputValue(value || '');
  }, [value, label]);

  const initializeAutocompleteService = useCallback(() => {
    // console.log(`[${label}] Initializing AutocompleteService`);
    if (!window.google?.maps?.places) {
      console.error(`[${label}] Google Maps Places API not available`);
      setUseGoogleMaps(false);
      return;
    }

    try {
      const service = new window.google.maps.places.AutocompleteService();
    //   console.log(`[${label}] AutocompleteService created successfully`);
      setAutocompleteService(service);
    } catch (error) {
      console.error(`[${label}] Error initializing AutocompleteService:`, error);
      setUseGoogleMaps(false);
    }
  }, [label]);

  useEffect(() => {
    // console.log(`[${label}] Setting up Google Maps with API key:`, GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error(`[${label}] No API key provided`);
      setUseGoogleMaps(false);
      return;
    }

    const setupService = () => {
      // console.log(`[${label}] Setting up service after script load`);
      window.googleMapsInitialized = true;
      initializeAutocompleteService();
    };

    // Check if Google Maps is already fully loaded
    if (window.google?.maps?.places) {
      // console.log(`[${label}] Google Maps already loaded, setting up service`);
      setupService();
      return;
    }

    // If the script exists but hasn't loaded yet
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // console.log(`[${label}] Script exists but not loaded, adding load listener`);
      const loadHandler = () => {
        // console.log(`[${label}] Existing script loaded`);
        setupService();
      };
      existingScript.addEventListener('load', loadHandler);
      return () => existingScript.removeEventListener('load', loadHandler);
    }

    // Add new script if none exists
    // console.log(`[${label}] No script found, adding new one`);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    // script.loading = 'async';

    const loadHandler = () => {
      // console.log(`[${label}] New script loaded`);
      setupService();
    };

    script.addEventListener('load', loadHandler);
    script.addEventListener('error', (error) => {
      // console.error(`[${label}] Failed to load Google Maps script:`, error);
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
        autoComplete={autoComplete}
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
          autoComplete={autoComplete}
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

// New StateAutocomplete component for state selection
interface StateAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStateCodeChange?: (stateCode: string) => void;
  error?: boolean;
  helperText?: string;
  countryCode?: string; // ISO2 code to restrict search to specific country
  disabled?: boolean;
}

interface StatePlace {
  description: string;
  place_id: string;
  state_name: string;
  state_code: string;
}

export const StateAutocomplete: React.FC<StateAutocompleteProps> = ({
  label,
  value = '',
  onChange,
  onStateCodeChange,
  error,
  helperText,
  countryCode,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState<string>(value || '');
  const [options, setOptions] = useState<StatePlace[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const initializeAutocompleteService = useCallback(() => {
    if (!window.google?.maps?.places) {
      console.error(`[${label}] Google Maps Places API not available`);
      setUseGoogleMaps(false);
      return;
    }

    try {
      const service = new window.google.maps.places.AutocompleteService();
      setAutocompleteService(service);
      
      // Also initialize places service for getting details
      const dummyElement = document.createElement('div');
      const placesService = new window.google.maps.places.PlacesService(dummyElement);
      setPlacesService(placesService);
    } catch (error) {
      console.error(`[${label}] Error initializing AutocompleteService:`, error);
      setUseGoogleMaps(false);
    }
  }, [label]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error(`[${label}] No API key provided`);
      setUseGoogleMaps(false);
      return;
    }

    const setupService = () => {
      window.googleMapsInitialized = true;
      initializeAutocompleteService();
    };

    // Check if Google Maps is already fully loaded
    if (window.google?.maps?.places) {
      setupService();
      return;
    }

    // If the script exists but hasn't loaded yet
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      const loadHandler = () => {
        setupService();
        existingScript.removeEventListener('load', loadHandler);
      };
      existingScript.addEventListener('load', loadHandler);
      return;
    }

    // Load the Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    const loadHandler = () => {
      setupService();
      script.removeEventListener('load', loadHandler);
    };

    const errorHandler = (error: any) => {
      console.error(`[${label}] Failed to load Google Maps script:`, error);
      setScriptError('Failed to load Google Maps script');
      setUseGoogleMaps(false);
      script.removeEventListener('error', errorHandler);
    };

    script.addEventListener('load', loadHandler);
    script.addEventListener('error', errorHandler);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', loadHandler);
      script.removeEventListener('error', errorHandler);
    };
  }, [label, initializeAutocompleteService]);

  const getPlaceDetails = async (placeId: string): Promise<StatePlace | null> => {
    if (!placesService || !useGoogleMaps) {
      return null;
    }

    return new Promise((resolve) => {
      placesService.getDetails(
        { placeId },
        (
          result: google.maps.places.PlaceResult | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            // Extract state name and code from address components
            const addressComponents = result.address_components || [];
            let stateName = '';
            let stateCode = '';

            for (const component of addressComponents) {
              if (component.types.includes('administrative_area_level_1')) {
                stateName = component.long_name;
                stateCode = component.short_name;
                break;
              }
            }

            if (stateName && stateCode) {
              resolve({
                description: stateName,
                place_id: placeId,
                state_name: stateName,
                state_code: stateCode,
              });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  const fetchStatePredictions = async (input: string) => {
    if (!input || !autocompleteService || !useGoogleMaps) {
      return;
    }

    setLoading(true);
    try {
      const componentRestrictions = countryCode ? { country: countryCode } : undefined;
      
      const request = {
        input,
        types: ['(regions)'], // This targets administrative areas including states
        componentRestrictions,
      };

      const response = await autocompleteService.getPlacePredictions(request);
      const predictions = response.predictions || [];

      // Filter to only include state-level administrative areas
      const statePredictions = predictions.filter((prediction: any) =>
        prediction.types.includes('administrative_area_level_1')
      );

      // Convert to our StatePlace format
      const stateOptions: StatePlace[] = statePredictions.map((prediction: any) => ({
        description: prediction.description,
        place_id: prediction.place_id,
        state_name: prediction.structured_formatting?.main_text || prediction.description,
        state_code: '', // Will be filled when selected
      }));

      setOptions(stateOptions);
    } catch (error) {
      console.error(`[${label}] Error fetching state predictions:`, error);
      setUseGoogleMaps(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue && useGoogleMaps) {
        fetchStatePredictions(inputValue);
      } else {
        setOptions([]);
      }
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [inputValue, useGoogleMaps, countryCode, label]);

  const handleOptionSelect = async (
    event: React.SyntheticEvent,
    option: StatePlace | null
  ) => {
    if (!option) {
      return;
    }

    // Set the display value immediately
    onChange(option.state_name);
    setInputValue(option.state_name);

    // Get detailed place information to extract the state code
    try {
      const placeDetails = await getPlaceDetails(option.place_id);
      if (placeDetails && onStateCodeChange) {
        onStateCodeChange(placeDetails.state_code);
      }
    } catch (error) {
      console.error(`[${label}] Error getting place details:`, error);
    }
  };

  const handleInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
    if (!newInputValue) {
      onChange('');
      if (onStateCodeChange) {
        onStateCodeChange('');
      }
    }
  };

  if (!useGoogleMaps) {
    // Fallback to simple text input if Google Maps is not available
    return (
      <TextField
        label={label}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
        }}
        error={error}
        helperText={scriptError || helperText || 'Google Maps not available - using text input'}
        fullWidth
        disabled={disabled}
      />
    );
  }

  // Find the current option based on inputValue
  const currentOption = options.find(option => option.state_name === inputValue) || null;

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.state_name}
      isOptionEqualToValue={(option, value) => option.place_id === value.place_id}
      value={currentOption}
      onChange={handleOptionSelect}
      onInputChange={handleInputChange}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.place_id}>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {option.state_name}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {option.description}
            </div>
          </div>
        </li>
      )}
    />
  );
};

// New StateDropdown component for better country-based state selection
interface StateDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStateCodeChange?: (stateCode: string) => void;
  error?: boolean;
  helperText?: string;
  countryCode?: string; // ISO2 code to restrict search to specific country
  disabled?: boolean;
}

interface StateOption {
  name: string;
  code: string;
  country: string;
}

export const StateDropdown: React.FC<StateDropdownProps> = ({
  label,
  value = '',
  onChange,
  onStateCodeChange,
  error,
  helperText,
  countryCode,
  disabled = false,
}) => {
  const [states, setStates] = useState<StateOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);

  // Fetch states for the given country using Google Maps Geocoding API
  const fetchStatesForCountry = async (country: string) => {
    if (!country || !GOOGLE_MAPS_API_KEY) {
      setStates([]);
      return;
    }

    setLoading(true);
    try {
      // Use Google Maps Geocoding API to get country details and then search for states
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(country)}&result_type=country&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(geocodingUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const countryResult = data.results[0];
        const bounds = countryResult.geometry.bounds;
        
        // Now search for administrative_area_level_1 (states/provinces) within this country
        const statesUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=administrative_area_level_1&bounds=${bounds.southwest.lat},${bounds.southwest.lng}|${bounds.northeast.lat},${bounds.northeast.lng}&components=country:${country}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const statesResponse = await fetch(statesUrl);
        const statesData = await statesResponse.json();

        if (statesData.status === 'OK') {
          const stateOptions: StateOption[] = [];
          const seenStates = new Set<string>();

          // Process the results to extract unique states
          statesData.results.forEach((result: any) => {
            const addressComponents = result.address_components || [];
            for (const component of addressComponents) {
              if (component.types.includes('administrative_area_level_1')) {
                const stateName = component.long_name;
                const stateCode = component.short_name;
                
                if (!seenStates.has(stateCode)) {
                  seenStates.add(stateCode);
                  stateOptions.push({
                    name: stateName,
                    code: stateCode,
                    country: country,
                  });
                }
                break;
              }
            }
          });

          // Sort alphabetically by name
          stateOptions.sort((a, b) => a.name.localeCompare(b.name));
          setStates(stateOptions);
        } else {
          console.warn('No states found for country:', country);
          setStates([]);
        }
      } else {
        console.warn('Country not found:', country);
        setStates([]);
      }
    } catch (error) {
      console.error('Error fetching states for country:', country, error);
      setUseGoogleMaps(false);
      setStates([]);
    } finally {
      setLoading(false);
    }
  };

  // Alternative method using a comprehensive list if Google Maps fails
  const getStatesFromStaticData = (country: string): StateOption[] => {
    const stateData: Record<string, StateOption[]> = {
      'US': [
        { name: 'Alabama', code: 'AL', country: 'US' },
        { name: 'Alaska', code: 'AK', country: 'US' },
        { name: 'Arizona', code: 'AZ', country: 'US' },
        { name: 'Arkansas', code: 'AR', country: 'US' },
        { name: 'California', code: 'CA', country: 'US' },
        { name: 'Colorado', code: 'CO', country: 'US' },
        { name: 'Connecticut', code: 'CT', country: 'US' },
        { name: 'Delaware', code: 'DE', country: 'US' },
        { name: 'Florida', code: 'FL', country: 'US' },
        { name: 'Georgia', code: 'GA', country: 'US' },
        { name: 'Hawaii', code: 'HI', country: 'US' },
        { name: 'Idaho', code: 'ID', country: 'US' },
        { name: 'Illinois', code: 'IL', country: 'US' },
        { name: 'Indiana', code: 'IN', country: 'US' },
        { name: 'Iowa', code: 'IA', country: 'US' },
        { name: 'Kansas', code: 'KS', country: 'US' },
        { name: 'Kentucky', code: 'KY', country: 'US' },
        { name: 'Louisiana', code: 'LA', country: 'US' },
        { name: 'Maine', code: 'ME', country: 'US' },
        { name: 'Maryland', code: 'MD', country: 'US' },
        { name: 'Massachusetts', code: 'MA', country: 'US' },
        { name: 'Michigan', code: 'MI', country: 'US' },
        { name: 'Minnesota', code: 'MN', country: 'US' },
        { name: 'Mississippi', code: 'MS', country: 'US' },
        { name: 'Missouri', code: 'MO', country: 'US' },
        { name: 'Montana', code: 'MT', country: 'US' },
        { name: 'Nebraska', code: 'NE', country: 'US' },
        { name: 'Nevada', code: 'NV', country: 'US' },
        { name: 'New Hampshire', code: 'NH', country: 'US' },
        { name: 'New Jersey', code: 'NJ', country: 'US' },
        { name: 'New Mexico', code: 'NM', country: 'US' },
        { name: 'New York', code: 'NY', country: 'US' },
        { name: 'North Carolina', code: 'NC', country: 'US' },
        { name: 'North Dakota', code: 'ND', country: 'US' },
        { name: 'Ohio', code: 'OH', country: 'US' },
        { name: 'Oklahoma', code: 'OK', country: 'US' },
        { name: 'Oregon', code: 'OR', country: 'US' },
        { name: 'Pennsylvania', code: 'PA', country: 'US' },
        { name: 'Rhode Island', code: 'RI', country: 'US' },
        { name: 'South Carolina', code: 'SC', country: 'US' },
        { name: 'South Dakota', code: 'SD', country: 'US' },
        { name: 'Tennessee', code: 'TN', country: 'US' },
        { name: 'Texas', code: 'TX', country: 'US' },
        { name: 'Utah', code: 'UT', country: 'US' },
        { name: 'Vermont', code: 'VT', country: 'US' },
        { name: 'Virginia', code: 'VA', country: 'US' },
        { name: 'Washington', code: 'WA', country: 'US' },
        { name: 'West Virginia', code: 'WV', country: 'US' },
        { name: 'Wisconsin', code: 'WI', country: 'US' },
        { name: 'Wyoming', code: 'WY', country: 'US' },
      ],
      'IN': [
        { name: 'Andhra Pradesh', code: 'AP', country: 'IN' },
        { name: 'Arunachal Pradesh', code: 'AR', country: 'IN' },
        { name: 'Assam', code: 'AS', country: 'IN' },
        { name: 'Bihar', code: 'BR', country: 'IN' },
        { name: 'Chhattisgarh', code: 'CG', country: 'IN' },
        { name: 'Goa', code: 'GA', country: 'IN' },
        { name: 'Gujarat', code: 'GJ', country: 'IN' },
        { name: 'Haryana', code: 'HR', country: 'IN' },
        { name: 'Himachal Pradesh', code: 'HP', country: 'IN' },
        { name: 'Jharkhand', code: 'JH', country: 'IN' },
        { name: 'Karnataka', code: 'KA', country: 'IN' },
        { name: 'Kerala', code: 'KL', country: 'IN' },
        { name: 'Madhya Pradesh', code: 'MP', country: 'IN' },
        { name: 'Maharashtra', code: 'MH', country: 'IN' },
        { name: 'Manipur', code: 'MN', country: 'IN' },
        { name: 'Meghalaya', code: 'ML', country: 'IN' },
        { name: 'Mizoram', code: 'MZ', country: 'IN' },
        { name: 'Nagaland', code: 'NL', country: 'IN' },
        { name: 'Odisha', code: 'OR', country: 'IN' },
        { name: 'Punjab', code: 'PB', country: 'IN' },
        { name: 'Rajasthan', code: 'RJ', country: 'IN' },
        { name: 'Sikkim', code: 'SK', country: 'IN' },
        { name: 'Tamil Nadu', code: 'TN', country: 'IN' },
        { name: 'Telangana', code: 'TS', country: 'IN' },
        { name: 'Tripura', code: 'TR', country: 'IN' },
        { name: 'Uttar Pradesh', code: 'UP', country: 'IN' },
        { name: 'Uttarakhand', code: 'UK', country: 'IN' },
        { name: 'West Bengal', code: 'WB', country: 'IN' },
        // Union Territories
        { name: 'Andaman and Nicobar Islands', code: 'AN', country: 'IN' },
        { name: 'Chandigarh', code: 'CH', country: 'IN' },
        { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH', country: 'IN' },
        { name: 'Delhi', code: 'DL', country: 'IN' },
        { name: 'Jammu and Kashmir', code: 'JK', country: 'IN' },
        { name: 'Ladakh', code: 'LA', country: 'IN' },
        { name: 'Lakshadweep', code: 'LD', country: 'IN' },
        { name: 'Puducherry', code: 'PY', country: 'IN' },
      ],
      'CA': [
        { name: 'Alberta', code: 'AB', country: 'CA' },
        { name: 'British Columbia', code: 'BC', country: 'CA' },
        { name: 'Manitoba', code: 'MB', country: 'CA' },
        { name: 'New Brunswick', code: 'NB', country: 'CA' },
        { name: 'Newfoundland and Labrador', code: 'NL', country: 'CA' },
        { name: 'Northwest Territories', code: 'NT', country: 'CA' },
        { name: 'Nova Scotia', code: 'NS', country: 'CA' },
        { name: 'Nunavut', code: 'NU', country: 'CA' },
        { name: 'Ontario', code: 'ON', country: 'CA' },
        { name: 'Prince Edward Island', code: 'PE', country: 'CA' },
        { name: 'Quebec', code: 'QC', country: 'CA' },
        { name: 'Saskatchewan', code: 'SK', country: 'CA' },
        { name: 'Yukon', code: 'YT', country: 'CA' },
      ],
    };

    return stateData[country] || [];
  };

  // Fetch states when country changes
  useEffect(() => {
    if (countryCode && useGoogleMaps) {
      fetchStatesForCountry(countryCode);
    } else if (countryCode && !useGoogleMaps) {
      // Fallback to static data
      setStates(getStatesFromStaticData(countryCode));
    } else {
      setStates([]);
    }
  }, [countryCode, useGoogleMaps]);

  // Handle state selection
  const handleStateChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const selectedStateName = event.target.value as string;
    const selectedState = states.find(state => state.name === selectedStateName);
    
    onChange(selectedStateName);
    
    if (selectedState && onStateCodeChange) {
      onStateCodeChange(selectedState.code);
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
      disabled={disabled || loading}
      error={error}
      helperText={loading ? "Loading states..." : helperText}
    >
      {states.length === 0 && !loading && (
        <MenuItem value="">No states available</MenuItem>
      )}
      {states.map((state) => (
        <MenuItem key={state.code} value={state.name}>
          {state.name}
        </MenuItem>
      ))}
    </TextField>
  );
}; 