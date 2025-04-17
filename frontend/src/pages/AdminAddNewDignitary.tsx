import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Autocomplete,
  FormHelperText,
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
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AdminDignitariesRoute, HomeRoute } from '../config/routes';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { getLocalDateString } from '../utils/dateUtils';
import { useQuery } from '@tanstack/react-query';
import { createDebugLogger } from '../utils/debugUtils';
import { BusinessCardExtraction, HonorificTitleMap } from '../models/types';
import { useEnums, useEnumsMap } from '../hooks/useEnums';
import { AddPersonIconV2, DoneIconV2 } from '../components/iconsv2';
import { WarningButton } from '../components/WarningButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { PrimaryButton } from '../components/PrimaryButton';

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

interface Country {
  iso2_code: string;
  name: string;
  is_enabled: boolean;
}

// Add interface for the dignitary data returned from the API
interface DignitaryData {
  id: number;
  honorific_title?: string;
  first_name: string;
  last_name: string;
  title_in_organization?: string;
  organization?: string;
  primary_domain?: string;
  primary_domain_other?: string;
  phone?: string;
  email?: string;
  linked_in_or_website?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  has_dignitary_met_gurudev?: boolean;
  gurudev_meeting_date?: string;
  gurudev_meeting_location?: string;
  gurudev_meeting_notes?: string;
  bio_summary?: string;
  social_media?: Record<string, string> | string;
  additional_info?: Record<string, string> | string;
  secretariat_notes?: string;
}

// Add interface for the API response
interface DignitaryCreateResponse {
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

const AddNewDignitary: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const api = useApi();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const redirectTo = queryParams.get('redirectTo');
  
  // Create a component-specific logger
  const logger = useMemo(() => 
    createDebugLogger(`${id ? 'EditDignitary' : 'AddNewDignitary'}`),
    [id] // Only recreate if ID changes
  );
  
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get today's date in YYYY-MM-DD format for default meeting date
  const today = getLocalDateString();

  // Fetch honorific title and primary domain options
  const { values: honorificTitleOptions = [], isLoading: isLoadingHonorificTitleOptions } = useEnums('honorificTitle');
  logger('honorificTitleOptions', honorificTitleOptions);
  const { values: primaryDomainOptions = [], isLoading: isLoadingPrimaryDomainOptions } = useEnums('primaryDomain');
  logger('primaryDomainOptions', primaryDomainOptions);

  // Fetch honorific title map and primary domain map
  const { values: honorificTitleMap = {}, isLoading: isLoadingHonorificTitleMap } = useEnumsMap('honorificTitle');
  logger('honorificTitleMap', honorificTitleMap);
  const { values: primaryDomainMap = {}, isLoading: isLoadingPrimaryDomainMap } = useEnumsMap('primaryDomain');
  logger('primaryDomainMap', primaryDomainMap);

  const [extraction, setExtraction] = useState<BusinessCardExtraction | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  // Check if we're in edit mode and fetch dignitary data
  useEffect(() => {
    let isMounted = true;
    let fetchInProgress = false;
    
    if (!id) {
      // Reset all state to initial values
      setExtraction({
        honorific_title: honorificTitleMap["NA"],
        first_name: '',
        last_name: '',
        has_dignitary_met_gurudev: true,
        gurudev_meeting_date: today
      });
      logger('extraction', extraction);
      setPreviewUrl(null);
      setSocialMediaEntries([]);
      setAdditionalInfoEntries([]);
      setIsEditMode(false);
      setIsLoading(false);
      setShowDomainOther(false);
      setSaveInProgress(false);
      setSuccessMessage(null);
      setCreatedDignitaryId(null);
      setCreatedDignitaryName(null);
      setIsDetailedMode(false);
      setShowBusinessCardUploader(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

    } else if (id && !fetchInProgress) {
      const fetchDignitaryData = async () => {
        if (isMounted) {
          setIsEditMode(true);
          setIsLoading(true);
          fetchInProgress = true;
        }
        
        try {
          logger(`Fetching data for dignitary with ID ${id}`);
          const { data } = await api.get<DignitaryData>(`/admin/dignitaries/${id}`);
          
          if (isMounted) {
            // Convert dignitary data to BusinessCardExtraction format
            const extractionData: BusinessCardExtraction = {
              honorific_title: data.honorific_title || honorificTitleMap["NA"],
              first_name: data.first_name,
              last_name: data.last_name,
              title_in_organization: data.title_in_organization,
              organization: data.organization,
              primary_domain: data.primary_domain,
              primary_domain_other: data.primary_domain_other,
              phone: data.phone,
              email: data.email,
              linked_in_or_website: data.linked_in_or_website,
              city: data.city,
              state: data.state,
              country: data.country,
              country_code: data.country_code,
              has_dignitary_met_gurudev: data.has_dignitary_met_gurudev,
              gurudev_meeting_date: data.gurudev_meeting_date,
              gurudev_meeting_location: data.gurudev_meeting_location,
              gurudev_meeting_notes: data.gurudev_meeting_notes,
              bio_summary: data.bio_summary,
              secretariat_notes: data.secretariat_notes
            };
            
            setExtraction(extractionData);
            
            // Set domain other visibility
            if (data.primary_domain === 'Other') {
              setShowDomainOther(true);
            }
            
            // Check and handle social media entries if present
            if (data.social_media) {
              try {
                const socialMediaObj = typeof data.social_media === 'string' ? 
                  JSON.parse(data.social_media) : data.social_media;
                
                const entries = Object.entries(socialMediaObj).map(([key, value]) => ({
                  key,
                  value: value as string
                }));
                
                setSocialMediaEntries(entries);
              } catch (error) {
                console.error('Error parsing social media data:', error);
              }
            }
            
            // Check and handle additional info entries if present
            if (data.additional_info) {
              try {
                const additionalInfoObj = typeof data.additional_info === 'string' ? 
                  JSON.parse(data.additional_info) : data.additional_info;
                
                const entries = Object.entries(additionalInfoObj).map(([key, value]) => ({
                  key,
                  value: value as string
                }));
                
                setAdditionalInfoEntries(entries);
              } catch (error) {
                console.error('Error parsing additional info data:', error);
              }
            }
            
            logger('Successfully loaded and processed dignitary data');
          }
        } catch (error: any) {
          console.error('Failed to fetch or process dignitary data:', error);
          if (isMounted) {
            const errorMessage = error.response?.data?.detail || 
                               error.message || 
                               'Failed to load dignitary data';
            enqueueSnackbar(errorMessage, { variant: 'error' });
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
            fetchInProgress = false;
          }
        }
      };
      
      fetchDignitaryData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [id, api, enqueueSnackbar]);

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

      // console.log('business card response', response);
      console.log('Value from API:', response.data.extraction.has_dignitary_met_gurudev, 'type:', typeof response.data.extraction.has_dignitary_met_gurudev);
      
      // Create a comprehensive mapping between backend and frontend fields
      const extractionData: BusinessCardExtraction = {
        ...response.data.extraction,
        // Always set a default honorific title if missing
        honorific_title: response.data.extraction.honorific_title || honorificTitleMap["NA"],
        // Ensure meeting info is preserved
        has_dignitary_met_gurudev: response.data.extraction.has_dignitary_met_gurudev !== null 
          ? response.data.extraction.has_dignitary_met_gurudev 
          : extraction?.has_dignitary_met_gurudev,
        gurudev_meeting_date: response.data.extraction.gurudev_meeting_date !== null 
          ? response.data.extraction.gurudev_meeting_date 
          : extraction?.gurudev_meeting_date,
        gurudev_meeting_location: response.data.extraction.gurudev_meeting_location !== null 
          ? response.data.extraction.gurudev_meeting_location 
          : extraction?.gurudev_meeting_location,
        gurudev_meeting_notes: response.data.extraction.gurudev_meeting_notes !== null 
          ? response.data.extraction.gurudev_meeting_notes 
          : extraction?.gurudev_meeting_notes,
        // Map fields that might have different names in backend vs frontend
        organization: response.data.extraction.company || response.data.extraction.organization || extraction?.organization,
        title_in_organization: response.data.extraction.title || response.data.extraction.title_in_organization || extraction?.title_in_organization,
        linked_in_or_website: response.data.extraction.website || response.data.extraction.linked_in_or_website || extraction?.linked_in_or_website,
        
        // If there's an address field but not street_address, use it
        street_address: response.data.extraction.street_address || 
                      (response.data.extraction.address ? String(response.data.extraction.address) : extraction?.street_address),
        
        // Fill in bio_summary from bio if needed
        bio_summary: response.data.extraction.bio_summary || 
                   response.data.extraction.bio || 
                   extraction?.bio_summary
      };
      
      console.log('extractionData', extractionData);
      
      setExtraction(extractionData);
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
      
      // Clear validation error for this field if it exists
      if (formErrors[name]) {
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
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
      social_media: socialMediaEntries.length > 0 ? JSON.stringify(socialMediaDict) : undefined,
      additional_info: additionalInfoEntries.length > 0 ? JSON.stringify(additionalInfoDict) : undefined,
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
  
  // Add common social media platforms list
  const commonSocialMediaPlatforms = [
    'Twitter',
    'LinkedIn',
    'Facebook',
    'Instagram',
    'YouTube',
    'TikTok',
    'Pinterest',
    'Reddit',
    'Snapchat',
    'WhatsApp',
    'Telegram',
    'WeChat',
    'Quora',
    'Medium',
    'Tumblr',
    'Discord',
    'Clubhouse',
    'Other'
  ];
  
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
    
    // Validate the form before submission
    if (!validateForm()) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
      return;
    }
    
    // Get updated extraction with dictionaries
    const updatedExtraction = updateDictionariesInExtraction();
    if (!updatedExtraction) return;
    
    try {
      setSaveInProgress(true);
      
      // Add better logging before API call
      console.log('Creating/updating dignitary with data:', JSON.stringify(updatedExtraction));
      
      let response;
      
      // If in edit mode, update the existing dignitary
      if (isEditMode && id) {
        logger(`Updating dignitary with ID ${id}`);
        response = await api.patch<DignitaryCreateResponse>(`/admin/dignitaries/update/${id}`, updatedExtraction);
        enqueueSnackbar('Dignitary updated successfully!', { variant: 'success' });

        if (redirectTo) {
          // Extract appointment ID from the URL if it exists
          const appointmentIdMatch = redirectTo.match(/\/appointments\/review\/(\d+)/);
          const appointmentId = appointmentIdMatch ? parseInt(appointmentIdMatch[1], 10) : null;
          
          navigate(redirectTo, {
            state: appointmentId ? { refreshAppointmentId: appointmentId } : undefined
          });
        } else {
          setSuccessMessage(`Dignitary "${extraction?.first_name} ${extraction?.last_name}" has been updated successfully!`);
        }

      } else {
        // Create new dignitary
        logger('Creating new dignitary');
        response = await api.post<DignitaryCreateResponse>('/admin/dignitaries/new', updatedExtraction);
        
        // Set success data for new creation
        setCreatedDignitaryId(response.data.id);
        setCreatedDignitaryName(`${extraction?.first_name} ${extraction?.last_name}`);
        setSuccessMessage(`Dignitary "${extraction?.first_name} ${extraction?.last_name}" has been created successfully!`);
      }
    } catch (error) {
      console.error('Failed to save dignitary:', error);
      enqueueSnackbar(isEditMode ? 'Failed to update dignitary' : 'Failed to create dignitary', { variant: 'error' });
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

  const handleDone = () => {
    navigate(AdminDignitariesRoute.path || '/');
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
            <IconButton onClick={handleCloseBusinessCardUploader}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload a business card to automatically extract dignitary information.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <PrimaryButton
                  size="medium"
                  startIcon={<ContactMailIcon />}
                  onClick={handleChooseFile}
                  disabled={uploading}
                >
                  Choose Business Card
                </PrimaryButton>
              </Grid>
              <Grid item xs={12} md={4}>
                <PrimaryButton
                  size="medium"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleTakePhoto}
                  disabled={uploading}
                >
                  Take Photo
                </PrimaryButton>
              </Grid>
              <Grid item xs={12} md={4}>
                {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
              </Grid>
              
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
              
            </Grid>
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
      <Box>
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">{isEditMode ? 'Edit Dignitary Details' : 'Add New Dignitary'}</Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <SecondaryButton
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleResetForm}
                disabled={isLoading || saveInProgress}
              >
                Reset
              </SecondaryButton>
              
              <WarningButton
                size="small"
                startIcon={<CloseIcon />}
                onClick={handleCancel}
                disabled={isLoading || saveInProgress}
              >
                Cancel
              </WarningButton>
            </Box>
          </Box>
          
          {!isEditMode && (
            <Box sx={{ mb: 3 }}>
              <PrimaryButton
                startIcon={<ContactMailIcon />}
                onClick={handleOpenBusinessCardUploader}
                disabled={uploading}
              >
                Upload Business Card
              </PrimaryButton>
            </Box>
          )}
          
          {renderBusinessCardUploader()}
          
          <Grid container spacing={2}>
            {/* Gurudev Meeting Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Gurudev Meeting Details
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Has the dignitary met Gurudev?</FormLabel>
                <RadioGroup
                  row
                  name="has_dignitary_met_gurudev"
                  value={extraction.has_dignitary_met_gurudev?.toString() || 'true'}
                  onChange={handleRadioChange}
                >
                  <FormControlLabel value="true" control={<Radio />} label="Yes" />
                  <FormControlLabel value="false" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>
            
            {/* Show meeting details if has met Gurudev */}
            {!!extraction.has_dignitary_met_gurudev && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Meeting Date"
                    name="gurudev_meeting_date"
                    type="date"
                    value={extraction.gurudev_meeting_date || today}
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
            
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
            </Grid>
            
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!formErrors.honorific_title}>
                <InputLabel>Honorific Title</InputLabel>
                <Select
                  name="honorific_title"
                  value={extraction.honorific_title}
                  label="Honorific Title"
                  onChange={handleSelectChange}
                  required
                >
                  {honorificTitleOptions.map((title) => (
                    <MenuItem key={title} value={title}>
                      {title}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.honorific_title && <FormHelperText>{formErrors.honorific_title}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={extraction.first_name || ''}
                onChange={handleInputChange}
                required
                error={!!formErrors.first_name}
                helperText={formErrors.first_name || ''}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={extraction.last_name || ''}
                onChange={handleInputChange}
                required
                error={!!formErrors.last_name}
                helperText={formErrors.last_name || ''}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={extraction.email || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Other Phone"
                    name="other_phone"
                    value={extraction.other_phone || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
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
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Title / Position"
                name="title_in_organization"
                value={extraction.title_in_organization || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Organization / Company"
                name="organization"
                value={extraction.organization || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
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
              <Grid item xs={12} md={4}>
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
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="LinkedIn / Website"
                  name="linked_in_or_website"
                  value={extraction.linked_in_or_website || ''}
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
              <Grid item xs={12} md={4}>
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
                select
                fullWidth
                label="Country"
                name="country_code"
                value={extraction.country_code || ''}
                onChange={(e) => {
                  const countryCode = e.target.value;
                  
                  // Update both country_code and country fields
                  const updatedData = { ...extraction };
                  updatedData.country_code = countryCode;
                  
                  // Also update country name field
                  const selectedCountry = countries.find(c => c.iso2_code === countryCode);
                  if (selectedCountry) {
                    updatedData.country = selectedCountry.name;
                  }
                  
                  // Set the extraction data directly
                  setExtraction(updatedData);
                  
                  // Clear any validation error
                  if (formErrors.country_code) {
                    setFormErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.country_code;
                      return newErrors;
                    });
                  }
                }}
                error={!!formErrors.country_code}
                helperText={formErrors.country_code || (countriesLoading ? "Loading countries..." : "")}
                disabled={countriesLoading}
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
                name="bio_summary"
                value={extraction.bio_summary || ''}
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
                      <Autocomplete
                        freeSolo
                        options={commonSocialMediaPlatforms}
                        value={entry.key}
                        onChange={(_, newValue) => handleUpdateSocialMedia(index, 'key', newValue || '')}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            size="small"
                            label="Platform"
                            placeholder="e.g., Twitter, LinkedIn"
                          />
                        )}
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
                    <Autocomplete
                      freeSolo
                      options={commonSocialMediaPlatforms}
                      value={newSocialMediaKey}
                      onChange={(_, newValue) => setNewSocialMediaKey(newValue || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          size="small"
                          label="New Platform"
                          placeholder="e.g., Twitter, LinkedIn"
                        />
                      )}
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
                    <PrimaryButton
                      size="small"
                      onClick={handleAddSocialMedia}
                      disabled={!newSocialMediaKey.trim()}
                    >
                      Add
                    </PrimaryButton>
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
                    <PrimaryButton
                      size="small"
                      onClick={handleAddAdditionalInfo}
                      disabled={!newAdditionalInfoKey.trim()}
                    >
                      Add
                    </PrimaryButton>
                  </Grid>
                </Grid>
              </>
            )}
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <PrimaryButton
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveDignitaryClick}
              disabled={saveInProgress}
              sx={{ minWidth: 200 }}
            >
              {saveInProgress ? (
                <>
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                isEditMode ? 'Update Dignitary' : 'Save Dignitary'
              )}
            </PrimaryButton>
          </Box>
        </Paper>
      </Box>
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
              <PrimaryButton
                leftIcon={<DoneIconV2 />}
                onClick={handleDone}
              >
                Done
              </PrimaryButton>
              <SecondaryButton
                leftIcon={<AddPersonIconV2 />}
                onClick={handleResetForm}
              >
                Add Another Dignitary
              </SecondaryButton>
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

  // Add countries API query
  const { data: countries = [], isLoading: countriesLoading } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Country[]>('/countries/all');
        return data;
      } catch (error) {
        console.error('Error fetching countries:', error);
        enqueueSnackbar('Failed to fetch countries', { variant: 'error' });
        return [];
      }
    },
  });
  
  // Add country_code validation in validateForm function
  const validateForm = () => {
    if (!extraction) return false;
    
    const errors: Record<string, string> = {};
    
    // Required fields validation
    if (!extraction.honorific_title) {
      errors.honorific_title = 'Honorific title is required';
    }
    
    if (!extraction.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    
    if (!extraction.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    
    if (!extraction.country_code) {
      errors.country_code = 'Country is required';
    }
    
    // Email validation if provided
    if (extraction.email && !/^\S+@\S+\.\S+$/.test(extraction.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Update form errors state
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Add state for form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Add cancel button handler
  const handleCancel = () => {
    if (redirectTo) {
      logger(`Canceling and redirecting to ${redirectTo}`);
      navigate(redirectTo);
    } else {
      // Go back to previous page or home
      navigate(-1);
    }
  };

  return (
    <Layout>
      <Container>
        <Box sx={{ display: 'flex', mb: 3, alignItems: 'center' }}>
          {id && (
            <IconButton onClick={handleCancel} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h1">{isEditMode ? 'Edit Dignitary Details' : 'Add New Dignitary'}</Typography>
        </Box>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <CircularProgress />
          </Box>
        ) : successMessage ? (
          renderSuccessSection()
        ) : (
          renderForm()
        )}
        
        {showBusinessCardUploader && renderBusinessCardUploader()}
      </Container>
    </Layout>
  );
};

export default AddNewDignitary; 