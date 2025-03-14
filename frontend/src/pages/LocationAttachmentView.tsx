import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';

// Types of files that can be displayed directly in browsers
const VIEWABLE_IMAGE_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/svg+xml'
];

// Files that need special handling
const PDF_TYPE = 'application/pdf';

// Define location interface
interface Location {
  id: number;
  name: string;
  attachment_name?: string;
  attachment_file_type?: string;
}

const LocationAttachmentView: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  const pdfObjectRef = useRef<HTMLObjectElement>(null);
  
  const [attachmentData, setAttachmentData] = useState<{
    url: string;
    fileName: string;
    fileType: string;
    location: {
      id: number;
      name: string;
    };
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoadAttempted, setPdfLoadAttempted] = useState(false);

  useEffect(() => {
    // Check authentication status
    if (authLoading) {
      return; // Wait for auth to finish loading
    }
    
    if (isAuthenticated === false) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    // If authenticated, fetch location information
    if (isAuthenticated && locationId) {
      fetchLocationInfo();
    }
  }, [isAuthenticated, authLoading, locationId, navigate]);

  useEffect(() => {
    // Auto-redirect for PDFs if we have attachment data and it's a PDF
    if (attachmentData && attachmentData.fileType === PDF_TYPE && !pdfLoadAttempted) {
      setPdfLoadAttempted(true);
    }
  }, [attachmentData, pdfLoadAttempted]);

  const fetchLocationInfo = async () => {
    try {
      setLoading(true);
      // First get location details to check if it has an attachment
      const response = await api.get(`/locations/${locationId}`);
      const location = response.data as Location;
      
      if (!location.attachment_name) {
        setError('This location does not have any attachment.');
        setLoading(false);
        return;
      }
      
      // Get the base URL from the api instance
      const baseURL = api.defaults.baseURL || '';
      
      // Set the attachment data
      setAttachmentData({
        url: `${baseURL}/locations/${locationId}/attachment`,
        fileName: location.attachment_name || 'file',
        fileType: location.attachment_file_type || 'application/octet-stream',
        location: {
          id: location.id,
          name: location.name
        }
      });
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load attachment information');
      setLoading(false);
    }
  };

  const downloadAttachment = () => {
    if (attachmentData) {
      // Use download attribute to force download
      const link = document.createElement('a');
      link.href = attachmentData.url;
      link.download = attachmentData.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const viewAttachment = () => {
    if (attachmentData) {
      // Use replace to fully navigate to the attachment in the current tab
      window.location.href = attachmentData.url;
    }
  };

  const isViewableImageInBrowser = () => {
    return attachmentData && VIEWABLE_IMAGE_TYPES.includes(attachmentData.fileType);
  };

  const isPdf = () => {
    return attachmentData && attachmentData.fileType === PDF_TYPE;
  };

  // Check if PDF failed to load in the object tag
  const handlePdfLoadError = () => {
    // If PDF failed to load in the object tag, offer to open it in a new tab
    if (pdfObjectRef.current && pdfObjectRef.current.getBoundingClientRect().height < 50) {
      viewAttachment();
    }
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" mt={2}>Loading attachment...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button
          startIcon={<HomeIcon />}
          variant="outlined"
          onClick={() => navigate('/home')}
        >
          Go to Home
        </Button>
      </Container>
    );
  }

  // Direct to PDF view if it's a PDF
  if (isPdf() && pdfLoadAttempted) {
    viewAttachment();
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" mt={2}>Opening PDF...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            {attachmentData?.location.name} - Attachment
          </Typography>
          <Box>
            <Button
              startIcon={<HomeIcon />}
              variant="outlined"
              onClick={() => navigate('/home')}
              sx={{ mr: 1 }}
            >
              Go to Home
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              variant="contained"
              onClick={downloadAttachment}
              sx={{ mr: 1 }}
            >
              Download
            </Button>
            {!isViewableImageInBrowser() && (
              <Button
                startIcon={<OpenInNewIcon />}
                variant="contained"
                color="secondary"
                onClick={viewAttachment}
              >
                Open File
              </Button>
            )}
          </Box>
        </Box>

        <Typography variant="body1" gutterBottom>
          <strong>File Name:</strong> {attachmentData?.fileName}
        </Typography>

        {isViewableImageInBrowser() ? (
          <Box mt={3} sx={{ width: '100%', height: '70vh', overflow: 'auto' }}>
            <img 
              src={attachmentData?.url} 
              alt={attachmentData?.fileName} 
              style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
            />
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            Redirecting you to view {attachmentData?.fileName}...
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default LocationAttachmentView; 