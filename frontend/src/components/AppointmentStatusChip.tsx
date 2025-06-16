import { Box, Chip } from "@mui/material";
import { getStatusColor, getStatusTheme } from "../utils/formattingUtils";
import { useTheme } from "@mui/material/styles";
import { CheckSquareCircleFilledIconV2 } from "./iconsv2";



export const AppointmentStatusChip = ({
    status,
    size
}: {
    status: string;
    size: 'small' | 'extrasmall';
}) => {
    const theme = useTheme();

    const sizeMap = {
        extrasmall: {
            fontSize: '0.75rem',
            iconSize: '0.81rem'
        },
        small: {
            fontSize: '0.81rem', 
            iconSize: '1rem'
        }
    };

    const getStatusChipSx = (status: string, size: 'small' | 'extrasmall') => {
        const statusTheme = getStatusTheme(status, theme);
        const sizeConfig = sizeMap[size];
        
        return {
            bgcolor: statusTheme.light,
            color: statusTheme.main,
            fontWeight: 500,
            borderRadius: '56px',
            fontSize: sizeConfig.fontSize,
    
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '2px 2px 2px 0px',
            gap: '4px',
    
            border: `1px solid ${statusTheme.dark}`,
    
            flex: 'none',
            order: 1,
            flexGrow: 0,

            maxWidth: '170px',
        };
    };
    
    return (
        <Chip 
            label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="4" cy="4" r="3" fill={getStatusColor(status, theme)}/>
                    </svg>
                    {
                        size === 'extrasmall' ? 
                            <CheckSquareCircleFilledIconV2 
                                sx={{ 
                                    fontSize: sizeMap[size].iconSize, 
                                    display: 'flex', 
                                    alignItems: 'center' 
                                }} 
                            /> : 
                            status
                    }
                </Box>
            }
            sx={getStatusChipSx(status, size)}
        />
    );
};