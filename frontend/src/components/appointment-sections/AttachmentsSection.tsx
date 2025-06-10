import React, { memo, useMemo } from 'react';
import { Typography, Paper } from '@mui/material';
import { Appointment, AppointmentAttachment } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import AttachmentSection from '../AttachmentSection';
import { useTheme, useMediaQuery } from '@mui/material';

interface AttachmentsSectionProps {
    appointment: Appointment;
    attachments: AppointmentAttachment[];
}

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = memo(({ 
    appointment, 
    attachments 
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Separate attachments by type
    const { businessCardAttachments, generalAttachments } = useMemo(() => {
        if (!attachments || !Array.isArray(attachments)) {
            return { businessCardAttachments: [], generalAttachments: [] };
        }
        
        return {
            businessCardAttachments: attachments.filter(attachment => attachment.attachment_type === 'business_card'),
            generalAttachments: attachments.filter(attachment => attachment.attachment_type !== 'business_card')
        };
    }, [attachments]);

    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
        return null;
    }

    return (
        <AppointmentCardSection isMobile={isMobile} theme={theme} header="Attachments">
            {/* Business Card Attachments */}
            {businessCardAttachments.length > 0 && (
                <Paper elevation={0} sx={{ 
                    p: isMobile ? 2 : 3, 
                    mb: 3, 
                    borderRadius: 2, 
                    bgcolor: 'grey.50', 
                    width: '100%', 
                    boxSizing: 'border-box' 
                }}>
                    <Typography variant="h6" gutterBottom color="primary" fontWeight="medium">
                        Business Cards
                    </Typography>
                    <AttachmentSection attachments={businessCardAttachments} />
                </Paper>
            )}
            
            {/* General Attachments */}
            {generalAttachments.length > 0 && (
                <Paper elevation={0} sx={{ 
                    p: isMobile ? 2 : 3, 
                    mb: 3, 
                    borderRadius: 2, 
                    bgcolor: 'grey.50', 
                    width: '100%', 
                    boxSizing: 'border-box' 
                }}>
                    <Typography variant="h6" gutterBottom color="primary" fontWeight="medium">
                        Other Attachments
                    </Typography>
                    <AttachmentSection attachments={generalAttachments} />
                </Paper>
            )}
        </AppointmentCardSection>
    );
});

AttachmentsSection.displayName = 'AttachmentsSection';

export default AttachmentsSection; 