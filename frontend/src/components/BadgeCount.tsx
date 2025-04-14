import { Box } from "@mui/material";
import { Typography } from "@mui/material";

interface BadgeCountProps {
    count: number;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    style?: string;
}

export const BadgeCount: React.FC<BadgeCountProps> = ({ count, color = '#9598A6', backgroundColor = 'white', borderColor = '#E9E9E9', style = "default" }) => {
    let fontWeight = '500';
    let fontSize = '12px';
    let fontColor = '#9598A6';
    if (style === "bold") {
        fontWeight = '600';
        fontSize = '14px';
        fontColor = '#333';
    } else if (style === "default") {
        fontWeight = '500';
        fontSize = '12px';
    } else if (style === "light") { 
        fontWeight = '400';
        fontSize = '12px';
    }
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            backgroundColor: backgroundColor,
            borderRadius: '50%',
            border: `1px solid ${borderColor}`,
            marginLeft: '4px',
            minWidth: '24px',
            minHeight: '24px',
        }}> 
            <Typography sx={{ 
                width: '15px',
                height: '18px',
                fontFamily: 'Work Sans',
                fontStyle: 'normal',
                fontWeight: fontWeight,
                fontSize: fontSize,
                lineHeight: '18px',
                textAlign: 'center',
                color: fontColor,
                flex: 'none',
                order: 0,
                flexGrow: 0
            }}>
                {count}
            </Typography>
        </Box>
    );
};
