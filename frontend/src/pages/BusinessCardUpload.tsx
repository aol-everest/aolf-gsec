import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Typography,
  Container,
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
  Snackbar,
  Alert,
  SelectChangeEvent,
  Radio,
  RadioGroup,
  FormLabel,
  Fab,
  Tooltip,
  Switch,
  Collapse,
} from '@mui/material';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { HomeRoute } from '../config/routes';
import LocationAutocomplete from '../components/LocationAutocomplete';

interface BusinessCardExtraction {
  honorific_title?: string;
  first_name: string;
  last_name: string;
  title?: string;
  company?: string;
  primary_domain?: string;
  primary_domain_other?: string;
  phone?: string;
  other_phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  has_dignitary_met_gurudev?: boolean;
  gurudev_meeting_date?: string;
  gurudev_meeting_location?: string;
  gurudev_meeting_notes?: string;
  bio?: string;
  social_media?: Record<string, string>;
  additional_info?: Record<string, string>;
  secretariat_notes?: string;
  file_path?: string;
  file_name?: string;
  file_type?: string;
  is_image?: boolean;
  thumbnail_path?: string;
  attachment_uuid?: string;
}

interface BusinessCardExtractionResponse {
  extraction: BusinessCardExtraction;
  attachment_uuid: string;
}

interface DignitaryResponse {
  id: number;
  first_name: string;
  last_name: string;
  // Add other fields as needed
}

// Fix the Google Maps script loading hook to check for an existing script and prevent duplicate loading
const useGoogleMapsScript = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If Google Maps is already loaded, just set the state
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already in the document
    const scriptId = 'google-maps-places-script';
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement;

    // If script exists but is still loading, just wait for it
    if (existingScript) {
      const handleExistingScriptLoad = () => setIsLoaded(true);
      existingScript.addEventListener('load', handleExistingScriptLoad);
      return () => existingScript.removeEventListener('load', handleExistingScriptLoad);
    }

    // If script doesn't exist, create and append it
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    const handleScriptLoad = () => {
      console.log('Google Maps script loaded successfully');
      setIsLoaded(true);
    };
    
    const handleScriptError = (event: Event | string) => {
      console.error('Google Maps script failed to load:', event);
      setError('Failed to load Google Maps script');
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

const BusinessCardUpload: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const api = useApi();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [extraction, setExtraction] = useState<BusinessCardExtraction | null>({
    first_name: '',
    last_name: '',
    has_dignitary_met_gurudev: false
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [honorificTitleOptions, setHonorificTitleOptions] = useState<string[]>([]);
  const [primaryDomainOptions, setPrimaryDomainOptions] = useState<string[]>([]);
  const [showDomainOther, setShowDomainOther] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdDignitaryId, setCreatedDignitaryId] = useState<number | null>(null);
  const [createdDignitaryName, setCreatedDignitaryName] = useState<string | null>(null);
  const [isDetailedMode, setIsDetailedMode] = useState(false);
  const [showBusinessCardUploader, setShowBusinessCardUploader] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [socialMediaEntries, setSocialMediaEntries] = useState<{key: string; value: string}[]>([]);
  const [additionalInfoEntries, setAdditionalInfoEntries] = useState<{key: string; value: string}[]>([]);
  const [newSocialMediaKey, setNewSocialMediaKey] = useState('');
  const [newSocialMediaValue, setNewSocialMediaValue] = useState('');
  const [newAdditionalInfoKey, setNewAdditionalInfoKey] = useState('');
  const [newAdditionalInfoValue, setNewAdditionalInfoValue] = useState('');

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Replace useGooglePlaces state with the hook
  const { isLoaded: mapsLoaded, error: mapsError } = useGoogleMapsScript();

  // Add references for Google Places autocomplete
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Modify the handleLocationChange function to use timeout instead of lodash debounce
  // We'll use useRef to store the timeout ID
  const locationChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLocationChange = useCallback((value: string) => {
    if (extraction) {
      // Clear any existing timeout
      if (locationChangeTimeoutRef.current) {
        clearTimeout(locationChangeTimeoutRef.current);
      }
      
      // Set a new timeout to update the state after 300ms
      locationChangeTimeoutRef.current = setTimeout(() => {
        setExtraction((prevExtraction) => {
          if (!prevExtraction) return null;
          return {
            ...prevExtraction,
            gurudev_meeting_location: value
          };
        });
      }, 300);
    }
  }, [extraction]);

  // Fetch honorific title and primary domain options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [honorificResponse, domainResponse] = await Promise.all([
          api.get<string[]>('/dignitaries/honorific-title-options'),
          api.get<string[]>('/dignitaries/primary-domain-options'),
        ]);
        
        setHonorificTitleOptions(honorificResponse.data);
        setPrimaryDomainOptions(domainResponse.data);
      } catch (error) {
        console.error('Failed to fetch dropdown options:', error);
        enqueueSnackbar('Failed to load form options', { variant: 'error' });
      }
    };
    
    fetchOptions();
  }, [enqueueSnackbar, api]);

  // Update showDomainOther when extraction changes
  useEffect(() => {
    if (extraction?.primary_domain === 'Other') {
      setShowDomainOther(true);
    }
  }, [extraction]);

  // Update dictionary entries when extraction changes
  useEffect(() => {
    if (extraction) {
      // Convert social_media dictionary to array of key-value entries
      if (extraction.social_media) {
        const entries = Object.entries(extraction.social_media).map(([key, value]) => ({
          key,
          value: value || ''
        }));
        setSocialMediaEntries(entries);
      } else {
        setSocialMediaEntries([]);
      }
      
      // Convert additional_info dictionary to array of key-value entries
      if (extraction.additional_info) {
        const entries = Object.entries(extraction.additional_info).map(([key, value]) => ({
          key,
          value: value || ''
        }));
        setAdditionalInfoEntries(entries);
      } else {
        setAdditionalInfoEntries([]);
      }
    }
  }, [extraction]);

  const handleOpenBusinessCardUploader = () => {
    setShowBusinessCardUploader(true);
  };

  const handleCloseBusinessCardUploader = () => {
    setShowBusinessCardUploader(false);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    cameraInputRef.current?.click();
  };

  // Helper function to compress image
  const compressImage = async (file: File, maxSizeMB = 1): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw image on canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to Blob with reduced quality
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Could not create blob'));
              return;
            }
            
            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Convert to JPEG for better compression
              lastModified: Date.now(),
            });
            
            console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB, Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
            
            resolve(compressedFile);
          }, 'image/jpeg', 0.7); // Adjust quality (0-1) as needed
        };
        
        img.src = readerEvent.target?.result as string;
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    setUploading(true);
    
    try {
      // Create preview URL from the original file
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
      
      // Compress the image before uploading
      console.log(`Starting compression for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      const compressedFile = await compressImage(file);
      console.log(`Compression complete: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Upload the compressed file and extract data
      const formData = new FormData();
      formData.append('file', compressedFile);
      
      const response = await api.post<BusinessCardExtractionResponse>(
        '/admin/business-card/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setExtraction(response.data.extraction);
      setShowBusinessCardUploader(false);
      enqueueSnackbar('Business card information extracted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error uploading business card:', error);
      enqueueSnackbar('Failed to process business card', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (extraction) {
      setExtraction({ ...extraction, [name]: value });
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as string;
    const value = e.target.value;
    
    if (extraction) {
      setExtraction({ ...extraction, [name]: value });
      
      if (name === 'primary_domain') {
        setShowDomainOther(value === 'Other');
      }
    }
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const boolValue = value === 'true';
    
    if (extraction) {
      // Update the extraction object with the new value
      const updatedExtraction = { ...extraction, [name]: boolValue };
      
      // If "Yes" is selected for has_dignitary_met_gurudev, set the meeting date to today
      if (name === 'has_dignitary_met_gurudev' && boolValue) {
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        updatedExtraction.gurudev_meeting_date = today;
      }
      
      setExtraction(updatedExtraction);
    }
  };

  // Update extraction with the latest entries before submitting
  const updateDictionariesInExtraction = () => {
    if (!extraction) return null;
    
    // Convert social media entries back to dictionary
    const socialMediaDict: Record<string, string> = {};
    socialMediaEntries.forEach(entry => {
      if (entry.key && entry.key.trim() !== '') {
        socialMediaDict[entry.key] = entry.value;
      }
    });
    
    // Convert additional info entries back to dictionary
    const additionalInfoDict: Record<string, string> = {};
    additionalInfoEntries.forEach(entry => {
      if (entry.key && entry.key.trim() !== '') {
        additionalInfoDict[entry.key] = entry.value;
      }
    });
    
    // Ensure we're including all meeting-related fields
    const updatedExtraction = {
      ...extraction,
      social_media: socialMediaDict,
      additional_info: additionalInfoDict,
      // Explicitly include these fields to ensure they're not lost
      has_dignitary_met_gurudev: extraction.has_dignitary_met_gurudev,
      gurudev_meeting_date: extraction.gurudev_meeting_date,
      gurudev_meeting_location: extraction.gurudev_meeting_location,
      gurudev_meeting_notes: extraction.gurudev_meeting_notes
    };

    // Debug log to check what's being sent
    console.log('Sending dignitary data:', updatedExtraction);
    
    return updatedExtraction;
  };
  
  // Add new social media entry
  const handleAddSocialMedia = () => {
    if (newSocialMediaKey.trim() === '') return;
    
    setSocialMediaEntries([
      ...socialMediaEntries,
      { key: newSocialMediaKey, value: newSocialMediaValue }
    ]);
    
    setNewSocialMediaKey('');
    setNewSocialMediaValue('');
  };
  
  // Add new additional info entry
  const handleAddAdditionalInfo = () => {
    if (newAdditionalInfoKey.trim() === '') return;
    
    setAdditionalInfoEntries([
      ...additionalInfoEntries,
      { key: newAdditionalInfoKey, value: newAdditionalInfoValue }
    ]);
    
    setNewAdditionalInfoKey('');
    setNewAdditionalInfoValue('');
  };
  
  // Update social media entry
  const handleUpdateSocialMedia = (index: number, field: 'key' | 'value', value: string) => {
    const updatedEntries = [...socialMediaEntries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value
    };
    setSocialMediaEntries(updatedEntries);
  };
  
  // Update additional info entry
  const handleUpdateAdditionalInfo = (index: number, field: 'key' | 'value', value: string) => {
    const updatedEntries = [...additionalInfoEntries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value
    };
    setAdditionalInfoEntries(updatedEntries);
  };
  
  // Remove social media entry
  const handleRemoveSocialMedia = (index: number) => {
    const updatedEntries = [...socialMediaEntries];
    updatedEntries.splice(index, 1);
    setSocialMediaEntries(updatedEntries);
  };
  
  // Remove additional info entry
  const handleRemoveAdditionalInfo = (index: number) => {
    const updatedEntries = [...additionalInfoEntries];
    updatedEntries.splice(index, 1);
    setAdditionalInfoEntries(updatedEntries);
  };

  const handleSaveDignitaryClick = async () => {
    if (!extraction) return;
    
    // Get updated extraction with dictionaries
    const updatedExtraction = updateDictionariesInExtraction();
    if (!updatedExtraction) return;
    
    try {
      setSaveInProgress(true);
      
      // Add better logging before API call
      console.log('Creating dignitary with data:', {
        name: `${updatedExtraction.first_name} ${updatedExtraction.last_name}`,
        has_met_gurudev: updatedExtraction.has_dignitary_met_gurudev,
        meeting_date: updatedExtraction.gurudev_meeting_date,
        meeting_location: updatedExtraction.gurudev_meeting_location,
        meeting_notes: updatedExtraction.gurudev_meeting_notes
      });
      
      // Use the updated extraction for the API call
      const response = await api.post<DignitaryResponse>('/admin/business-card/create-dignitary', updatedExtraction);
      
      if (response.data && response.data.id) {
        setCreatedDignitaryId(response.data.id);
        const fullName = `${response.data.first_name} ${response.data.last_name}`;
        setCreatedDignitaryName(fullName);
        setSuccessMessage(`Dignitary "${fullName}" has been created successfully with ID: ${response.data.id}`);
        
        // Clear the form data but keep success message
        setExtraction(null);
        setPreviewUrl(null);
        setSocialMediaEntries([]);
        setAdditionalInfoEntries([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error creating dignitary:', error);
      // More detailed error message
      const errorMessage = error.response?.data?.detail || 'Failed to create dignitary';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleResetForm = () => {
    setExtraction(null);
    setPreviewUrl(null);
    setSocialMediaEntries([]);
    setAdditionalInfoEntries([]);
    setNewSocialMediaKey('');
    setNewSocialMediaValue('');
    setNewAdditionalInfoKey('');
    setNewAdditionalInfoValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setSuccessMessage(null);
    setCreatedDignitaryId(null);
    setCreatedDignitaryName(null);
  };

  const handleGoHome = () => {
    navigate(HomeRoute.path || '/home');
  };

  // Add a utility function for reverse geocoding using Google Maps API
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.google?.maps?.Geocoder) {
        resolve(`Location at coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      const latlng = { lat: latitude, lng: longitude };
      
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results[0].formatted_address);
        } else {
          console.warn('Geocoder failed due to: ' + status);
          resolve(`Location at coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      });
    });
  };

  // Update getCurrentLocation to use the new reverse geocoding function
  const getCurrentLocation = () => {
    if (!extraction) return;
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLoadingLocation(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Get location based on coordinates
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to get a human-readable address
          const address = await reverseGeocode(latitude, longitude);
          
          setExtraction({
            ...extraction,
            gurudev_meeting_location: address
          });
          
          setIsLoadingLocation(false);
        } catch (error) {
          console.error("Error getting location details:", error);
          setLocationError("Failed to get location details");
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Failed to get your location";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access was denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get location timed out";
            break;
        }
        
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      }
    );
  };

  // Update the initializeAutocomplete function to better handle the location input
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

        // Format the location string - include both name and address when available
        const locationString = place.name && place.formatted_address 
          ? `${place.name}, ${place.formatted_address}`
          : (place.formatted_address || place.name || '');

        console.log('Selected location:', locationString);

        // Update the extraction object with the selected place
        if (extraction) {
          // Create a new extraction object with the updated location
          const updatedExtraction = {
            ...extraction,
            gurudev_meeting_location: locationString
          };
          
          // Update the state with the new extraction object
          setExtraction(updatedExtraction);
          
          console.log('Updated extraction with location:', updatedExtraction);
        }

        // Update the input field value directly
        if (inputRef.current) {
          inputRef.current.value = locationString;
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      enqueueSnackbar('Error initializing location search', { variant: 'error' });
    }
  }, [mapsLoaded, enqueueSnackbar, extraction]);

  // Initialize autocomplete when extraction is updated or when meeting radio changes
  useEffect(() => {
    if (extraction?.has_dignitary_met_gurudev && mapsLoaded) {
      setTimeout(() => {
        initializeAutocomplete();
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [extraction?.has_dignitary_met_gurudev, mapsLoaded, initializeAutocomplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  // Add this useEffect to sync the input field value with extraction state
  // This replaces the useEffect that was inside renderMeetingLocationField
  useEffect(() => {
    if (inputRef.current && extraction?.gurudev_meeting_location && extraction.has_dignitary_met_gurudev) {
      inputRef.current.value = extraction.gurudev_meeting_location;
    }
  }, [extraction?.gurudev_meeting_location, extraction?.has_dignitary_met_gurudev]);

  // Update the renderMeetingLocationField function to remove the useEffect
  const renderMeetingLocationField = () => {
    if (!extraction) return null;

    return (
      <Grid item xs={12} md={8} container alignItems="center" spacing={1}>
        <Grid item xs>
          <TextField
            inputRef={inputRef}
            fullWidth
            label="Meeting Location"
            placeholder="Start typing to search..."
            disabled={!mapsLoaded}
            helperText={mapsError || (!mapsLoaded && 'Loading Google Maps...')}
            error={!!mapsError}
            InputProps={{
              autoComplete: 'off',
            }}
            // Instead of defaultValue, use value to ensure it updates when the extraction changes
            value={extraction.gurudev_meeting_location || ''}
            // Use handleInputChange to keep everything consistent
            onChange={handleInputChange}
            name="gurudev_meeting_location"
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Note: You can enter a location manually, search for a location.
          </Typography>
        </Grid>
        {/* TODO: Add back in when we have a way to get the current location and convert it to a human-readable address */}
        {/* <Grid item>
          <Button
            variant="outlined"
            onClick={getCurrentLocation}
            startIcon={<MyLocationIcon />}
            disabled={isLoadingLocation}
            sx={{ height: '56px' }}
          >
            {isLoadingLocation ? <CircularProgress size={24} /> : 'Current Location'}
          </Button>
        </Grid> */}
      </Grid>
    );
  };

  // Toggle detailed mode
  const toggleDetailedMode = () => {
    setIsDetailedMode(!isDetailedMode);
  };

  // Business Card Upload Section
  const renderBusinessCardUploader = () => (
    <Collapse in={showBusinessCardUploader}>
      <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Upload Business Card</Typography>
            <IconButton onClick={handleCloseBusinessCardUploader} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload a business card to automatically extract dignitary information.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ContactMailIcon />}
              onClick={handleChooseFile}
              disabled={uploading}
            >
              Choose Business Card
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={handleTakePhoto}
              disabled={uploading}
            >
              Take Photo
            </Button>
            
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
              accept="image/*"
            />
            <input
              type="file"
              ref={cameraInputRef}
              style={{ display: 'none' }}
              onChange={handleCameraInputChange}
              accept="image/*"
              capture="environment"
            />
            
            {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </Box>
          
          {previewUrl && (
            <Box sx={{ maxWidth: 400, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Business Card Preview:
              </Typography>
              <img 
                src={previewUrl} 
                alt="Business Card Preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 300, 
                  objectFit: 'contain',
                  border: `1px solid ${theme.palette.divider}`
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Collapse>
  );

  const renderForm = () => {
    if (!extraction) return null;
    
    return (
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 3 }}>
                Dignitary Information
              </Typography>
              <FormControlLabel
                control={<Switch checked={isDetailedMode} onChange={toggleDetailedMode} />}
                label={isDetailedMode ? "Detailed Entry" : "Quick Entry"}
              />
            </Box>
            {/* Button to toggle business card uploader */}
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => setShowBusinessCardUploader(!showBusinessCardUploader)}
              startIcon={<ContactMailIcon />}
              endIcon={showBusinessCardUploader ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              Auto-fill with Business Card
            </Button>
          </Box>
          
          {renderBusinessCardUploader()}
          
          <Grid container spacing={2}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Honorific Title</InputLabel>
                <Select
                  name="honorific_title"
                  value={extraction.honorific_title || '(Not Applicable)'}
                  label="Honorific Title"
                  onChange={handleSelectChange}
                >
                  {honorificTitleOptions.map((title) => (
                    <MenuItem key={title} value={title}>
                      {title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={extraction.first_name || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={extraction.last_name || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={extraction.email || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={extraction.phone || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            {isDetailedMode && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Other Phone"
                    name="other_phone"
                    value={extraction.other_phone || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Fax"
                    name="fax"
                    value={extraction.fax || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
              </>
            )}
            
            {/* Professional Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Professional Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title / Position"
                name="title"
                value={extraction.title || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Organization / Company"
                name="company"
                value={extraction.company || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Primary Domain</InputLabel>
                <Select
                  name="primary_domain"
                  value={extraction.primary_domain || ''}
                  label="Primary Domain"
                  onChange={handleSelectChange}
                >
                  {primaryDomainOptions.map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {showDomainOther && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Specify Domain"
                  name="primary_domain_other"
                  value={extraction.primary_domain_other || ''}
                  onChange={handleInputChange}
                />
              </Grid>
            )}
            
            {isDetailedMode && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website / LinkedIn"
                  name="website"
                  value={extraction.website || ''}
                  onChange={handleInputChange}
                />
              </Grid>
            )}
            
            {/* Location Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Location Information
              </Typography>
            </Grid>
            
            {isDetailedMode && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="street_address"
                  value={extraction.street_address || ''}
                  onChange={handleInputChange}
                />
              </Grid>
            )}
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={extraction.city || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State / Province"
                name="state"
                value={extraction.state || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={extraction.country || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            {/* Additional Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Additional Information
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Bio"
                name="bio"
                value={extraction.bio || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Secretariat Notes"
                name="secretariat_notes"
                value={extraction.secretariat_notes || ''}
                onChange={handleInputChange}
                placeholder="Add additional notes for secretariat use"
              />
            </Grid>
            
            {isDetailedMode && (
              <>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Has the dignitary met Gurudev?</FormLabel>
                    <RadioGroup
                      row
                      name="has_dignitary_met_gurudev"
                      value={extraction.has_dignitary_met_gurudev?.toString() || 'false'}
                      onChange={handleRadioChange}
                    >
                      <FormControlLabel value="true" control={<Radio />} label="Yes" />
                      <FormControlLabel value="false" control={<Radio />} label="No" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                
                {/* Show meeting details if has met Gurudev */}
                {extraction.has_dignitary_met_gurudev && (
                  <>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Meeting Date"
                        name="gurudev_meeting_date"
                        type="date"
                        value={extraction.gurudev_meeting_date || ''}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    {renderMeetingLocationField()}
                    {locationError && (
                      <Grid item xs={12}>
                        <Typography color="error" variant="caption">
                          {locationError}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Meeting Notes"
                        name="gurudev_meeting_notes"
                        value={extraction.gurudev_meeting_notes || ''}
                        onChange={handleInputChange}
                        placeholder="Any details about their meeting with Gurudev"
                      />
                    </Grid>
                  </>
                )}
                
                {/* Social Media Section */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Divider />
                  <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                    Social Media Profiles
                  </Typography>
                </Grid>
                
                {socialMediaEntries.map((entry, index) => (
                  <Grid item xs={12} key={`social-media-${index}`} container spacing={1} alignItems="center">
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Platform"
                        value={entry.key}
                        onChange={(e) => handleUpdateSocialMedia(index, 'key', e.target.value)}
                        placeholder="e.g., Twitter, LinkedIn"
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Profile"
                        value={entry.value}
                        onChange={(e) => handleUpdateSocialMedia(index, 'value', e.target.value)}
                        placeholder="e.g., username or URL"
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <IconButton color="error" onClick={() => handleRemoveSocialMedia(index)}>
                        <CloseIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                
                <Grid item xs={12} container spacing={1} alignItems="center">
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="New Platform"
                      value={newSocialMediaKey}
                      onChange={(e) => setNewSocialMediaKey(e.target.value)}
                      placeholder="e.g., Twitter, LinkedIn"
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="New Profile"
                      value={newSocialMediaValue}
                      onChange={(e) => setNewSocialMediaValue(e.target.value)}
                      placeholder="e.g., username or URL"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddSocialMedia}
                      disabled={!newSocialMediaKey.trim()}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
                
                {/* Additional Info Section */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Divider />
                  <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                    Additional Details
                  </Typography>
                </Grid>
                
                {additionalInfoEntries.map((entry, index) => (
                  <Grid item xs={12} key={`additional-info-${index}`} container spacing={1} alignItems="center">
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Field"
                        value={entry.key}
                        onChange={(e) => handleUpdateAdditionalInfo(index, 'key', e.target.value)}
                        placeholder="e.g., Language, Interests"
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Value"
                        value={entry.value}
                        onChange={(e) => handleUpdateAdditionalInfo(index, 'value', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <IconButton color="error" onClick={() => handleRemoveAdditionalInfo(index)}>
                        <CloseIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                
                <Grid item xs={12} container spacing={1} alignItems="center">
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="New Field"
                      value={newAdditionalInfoKey}
                      onChange={(e) => setNewAdditionalInfoKey(e.target.value)}
                      placeholder="e.g., Language, Interests"
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="New Value"
                      value={newAdditionalInfoValue}
                      onChange={(e) => setNewAdditionalInfoValue(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddAdditionalInfo}
                      disabled={!newAdditionalInfoKey.trim()}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </>
            )}
            
            {/* Submit Button */}
            <Grid item xs={12} sx={{ mt: 2, textAlign: 'right' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveDignitaryClick}
                disabled={saveInProgress || !extraction.first_name || !extraction.last_name}
              >
                {saveInProgress ? <CircularProgress size={24} /> : 'Create Dignitary'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderSuccessSection = () => {
    if (!successMessage) return null;
    
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
            <Typography variant="h6" color="success.dark" gutterBottom align="center">
              Success!
            </Typography>
            <Typography variant="body1" color="text.primary" paragraph align="center">
              {successMessage}
            </Typography>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' }, // Stack vertically on mobile, horizontal on larger screens
                alignItems: { xs: 'stretch', sm: 'center' }, // Full width on mobile, centered on larger screens
                justifyContent: 'flex-end', // Position buttons on the right side
                gap: 2, // Space between buttons
                mt: 2 
              }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
              >
                Home
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetForm}
              >
                Add Another Dignitary
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Add a useEffect for cleanup
  useEffect(() => {
    // Cleanup function to clear any pending timeouts when unmounting
    return () => {
      if (locationChangeTimeoutRef.current) {
        clearTimeout(locationChangeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box>
          <Typography variant="h4" gutterBottom>
            Add New Dignitary
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Add a new dignitary record by entering information manually or uploading a business card to auto-fill the form.
          </Typography>
          
          {renderSuccessSection()}
          {!successMessage && renderForm()}
        </Box>
      </Container>
    </Layout>
  );
};

export default BusinessCardUpload; 