import { Box, Chip } from "@mui/material";
import { getStatusColor, getStatusTheme } from "../utils/formattingUtils";
import { useTheme } from "@mui/material/styles";
import { CheckSquareCircleFilledIconV2 } from "./iconsv2";



export const AppointmentStatusChip = ({ status, size }: { status: string, size: 'small' | 'extrasmall' }) => {
    const theme = useTheme();

    const getStatusChipSx = (status: string, size: 'small' | 'extrasmall') => {
        const statusTheme = getStatusTheme(status, theme);
        return {
            bgcolor: statusTheme.light,
            color: statusTheme.main,
            fontWeight: 500,
            borderRadius: '56px',
            fontSize: 'inherit',
    
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '2px 8px 2px 6px',
            gap: '4px',
    
            border: `1px solid ${statusTheme.dark}`,
    
            flex: 'none',
            order: 1,
            flexGrow: 0,

            p: '2px 2px 2px 0px',
    
        };
    };
    
    return (
        <Chip 
            label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="4" cy="4" r="3" fill={getStatusColor(status, theme)}/>
                    </svg>
                    {size === 'extrasmall' ? <CheckSquareCircleFilledIconV2 sx={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center' }} /> : status}
                </Box>
            }
            sx={getStatusChipSx(status, size)}
        />
    );
};