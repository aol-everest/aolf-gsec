import React, { useState, useEffect } from 'react';
import { AppointmentAttachment } from '../models/types';
import { Box, Typography, Grid, Paper, Link, Tooltip, Modal, IconButton, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import { useApi } from '../hooks/useApi';

const AttachmentItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const ThumbnailContainer = styled(Box)({
  width: '100%',
  height: 150,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
  overflow: 'hidden',
});

const Thumbnail = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
});

const FileIcon = styled(Box)({
  fontSize: 64,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const FileName = styled(Typography)({
  width: '100%',
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Modal styles
const ModalContent = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: '1000px',
  maxHeight: '90vh',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[24],
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

const ModalHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const ModalBody = styled(Box)({
  overflow: 'auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
});

const ModalImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '70vh',
  objectFit: 'contain',
});

// Add a loading container
const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  width: '100%',
});

interface AttachmentSectionProps {
  attachments: AppointmentAttachment[];
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) {
    return <PictureAsPdfIcon fontSize="inherit" color="error" />;
  } else if (fileType.includes('image')) {
    return <ImageIcon fontSize="inherit" color="primary" />;
  } else if (fileType.includes('text') || fileType.includes('document')) {
    return <DescriptionIcon fontSize="inherit" color="info" />;
  } else {
    return <InsertDriveFileIcon fontSize="inherit" color="action" />;
  }
};

const AttachmentSection: React.FC<AttachmentSectionProps> = ({ attachments }) => {
  const api = useApi();
  const [selectedAttachment, setSelectedAttachment] = useState<AppointmentAttachment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [modalLoading, setModalLoading] = useState(false);
  
  // Create a cache reference that persists across renders
  const thumbnailCache = React.useRef<Record<number, string>>({});
  
  // Load thumbnails when component mounts or attachments change
  useEffect(() => {
    let isMounted = true;
    
    const loadThumbnails = async () => {
      // Skip if there are no image attachments
      const imageAttachments = attachments.filter(attachment => attachment.is_image);
      if (imageAttachments.length === 0) return;
      
      // Initialize loading state
      const newLoading: Record<number, boolean> = {};
      const newThumbnailUrls: Record<number, string> = {...thumbnailUrls};
      
      // Check which thumbnails need to be loaded
      const attachmentsToLoad = imageAttachments.filter(att => 
        !thumbnailCache.current[att.id] && !thumbnailUrls[att.id]
      );
      
      // If all thumbnails are cached, use the cached values
      if (attachmentsToLoad.length === 0) {
        // Use cached thumbnails
        imageAttachments.forEach(att => {
          // Use cached URL if available
          if (thumbnailCache.current[att.id]) {
            newThumbnailUrls[att.id] = thumbnailCache.current[att.id];
          }
        });
        
        if (isMounted) {
          setThumbnailUrls(newThumbnailUrls);
        }
        return;
      }
      
      // Mark attachments that need loading
      attachmentsToLoad.forEach(att => {
        newLoading[att.id] = true;
      });
      
      if (isMounted) {
        setLoading(newLoading);
      }
      
      // Load thumbnails in parallel using Promise.all
      try {
        const loadPromises = attachmentsToLoad.map(async attachment => {
          try {
            console.log(`Loading thumbnail for attachment ${attachment.id}`);
            const response = await api.get(`/appointments/attachments/${attachment.id}/thumbnail`, {
              responseType: 'blob'
            });
            const url = URL.createObjectURL(response.data as Blob);
            return { id: attachment.id, url };
          } catch (error) {
            console.error(`Error loading thumbnail for attachment ${attachment.id}:`, error);
            return { id: attachment.id, url: null };
          }
        });
        
        const results = await Promise.all(loadPromises);
        
        if (isMounted) {
          // Update the URLs and loading state
          const updatedUrls = {...newThumbnailUrls};
          const updatedLoading = {...newLoading};
          
          results.forEach(result => {
            if (result.url) {
              updatedUrls[result.id] = result.url;
              thumbnailCache.current[result.id] = result.url; // Cache the URL
            }
            updatedLoading[result.id] = false;
          });
          
          setThumbnailUrls(updatedUrls);
          setLoading(updatedLoading);
        }
      } catch (error) {
        console.error("Error loading thumbnails:", error);
        if (isMounted) {
          // Mark all as not loading
          const updatedLoading = {...newLoading};
          Object.keys(updatedLoading).forEach(id => {
            updatedLoading[Number(id)] = false;
          });
          setLoading(updatedLoading);
        }
      }
    };
    
    loadThumbnails();
    
    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      isMounted = false;
    };
  }, [attachments, api]);
  
  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all URLs
      Object.values(thumbnailUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
      
      if (fullImageUrl) {
        URL.revokeObjectURL(fullImageUrl);
      }
    };
  }, []);
  
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleAttachmentClick = (attachment: AppointmentAttachment) => {
    if (attachment.is_image) {
      // For images, open in modal and load the full image
      setSelectedAttachment(attachment);
      setModalOpen(true);
      setModalLoading(true);
      
      // Load the full image
      api.get(`/appointments/attachments/${attachment.id}`, {
        responseType: 'blob'
      }).then(response => {
        // Revoke previous URL if exists
        if (fullImageUrl) {
          URL.revokeObjectURL(fullImageUrl);
        }
        
        const url = URL.createObjectURL(response.data as Blob);
        setFullImageUrl(url);
        setModalLoading(false);
      }).catch(error => {
        console.error('Error loading full image:', error);
        setModalLoading(false);
        alert('Failed to load the image. Please try again.');
      });
    } else {
      // For non-images, download the file
      downloadAttachment(attachment);
    }
  };

  const downloadAttachment = async (attachment: AppointmentAttachment) => {
    try {
      // Use the API instance to maintain authentication
      const response = await api.get(`/appointments/attachments/${attachment.id}`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download the attachment. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAttachment(null);
  };

  // Function to handle thumbnail loading errors
  const handleThumbnailError = (attachmentId: number) => {
    // Remove the failed thumbnail URL
    setThumbnailUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[attachmentId];
      return newUrls;
    });
  };

  return (
    <>
      <Box sx={{ mt: 3 }}>
        {/* <Typography variant="h6" gutterBottom>
          Attachments
        </Typography> */}
        <Grid container spacing={2}>
          {attachments.map((attachment) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={attachment.id}>
              <AttachmentItem onClick={() => handleAttachmentClick(attachment)}>
                <ThumbnailContainer>
                  {attachment.is_image ? (
                    loading[attachment.id] ? (
                      <LoadingContainer>
                        <CircularProgress size={40} />
                      </LoadingContainer>
                    ) : thumbnailUrls[attachment.id] ? (
                      <Thumbnail 
                        src={thumbnailUrls[attachment.id]} 
                        alt={attachment.file_name}
                        onError={() => handleThumbnailError(attachment.id)}
                      />
                    ) : (
                      <FileIcon>
                        <ImageIcon fontSize="inherit" color="primary" />
                      </FileIcon>
                    )
                  ) : (
                    <FileIcon>
                      {getFileIcon(attachment.file_type)}
                    </FileIcon>
                  )}
                </ThumbnailContainer>
                <Tooltip title={attachment.file_name}>
                  <FileName variant="body2">
                    {attachment.file_name}
                  </FileName>
                </Tooltip>
                <Typography variant="caption" color="textSecondary">
                  {new Date(attachment.created_at).toLocaleDateString()}
                </Typography>
              </AttachmentItem>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Image Viewer Modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="attachment-modal-title"
      >
        <ModalContent>
          <ModalHeader>
            <Typography id="attachment-modal-title" variant="h6" component="h2">
              {selectedAttachment?.file_name}
            </Typography>
            <IconButton onClick={handleCloseModal} size="small">
              <CloseIcon />
            </IconButton>
          </ModalHeader>
          <ModalBody>
            {modalLoading ? (
              <LoadingContainer>
                <CircularProgress size={60} />
              </LoadingContainer>
            ) : selectedAttachment && fullImageUrl ? (
              <ModalImage
                src={fullImageUrl}
                alt={selectedAttachment.file_name}
              />
            ) : (
              <Typography color="error">Failed to load image</Typography>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AttachmentSection; 