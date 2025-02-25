import React from 'react';
import { AppointmentAttachment } from '../models/types';
import { Box, Typography, Grid, Paper, Link, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';

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
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleAttachmentClick = (attachment: AppointmentAttachment) => {
    // Open the attachment in a new tab
    window.open(`/api/appointments/attachments/${attachment.id}`, '_blank');
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Attachments
      </Typography>
      <Grid container spacing={2}>
        {attachments.map((attachment) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={attachment.id}>
            <AttachmentItem onClick={() => handleAttachmentClick(attachment)}>
              <ThumbnailContainer>
                {attachment.is_image && attachment.thumbnail_path ? (
                  <Thumbnail 
                    src={`/api/appointments/attachments/${attachment.id}/thumbnail`} 
                    alt={attachment.file_name} 
                  />
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
  );
};

export default AttachmentSection; 