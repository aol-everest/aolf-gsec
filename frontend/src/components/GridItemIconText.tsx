import { Grid, Theme, Typography, Link, Box } from "@mui/material";
import { useState } from "react";
import { validateUrl } from "../utils/urlUtils"
import { useRef, useEffect } from "react";
import { debugLog } from "../utils/debugUtils";

interface GridItemIconTextProps {
    icon: React.ReactNode;
    text: string;
    theme: Theme;
    maxGridWidth?: number;
    containerRef: React.RefObject<HTMLDivElement>;
}

const GridItemIconText: React.FC<GridItemIconTextProps> = ({ icon, text, theme, maxGridWidth = 12, containerRef }) => {
    const [expanded, setExpanded] = useState(false);
    const { isValid, url } = validateUrl(text);
    const isLong = text.length > 100;
    const displayText = expanded || !isLong ? text : text.substring(0, 100) + '...';
    const MINIMUM_ICON_WIDTH = 35;

    const [iconGridWidth, setIconGridWidth] = useState(1); // fallback to 1 column
    
    useEffect(() => {
        if (!containerRef.current) return;
      
        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            const columnWidth = width / 12;
            const cols = Math.ceil((MINIMUM_ICON_WIDTH * 10) / columnWidth) / 10;
        
            // Clamp between 1 and 3 to avoid blowing up on very small containers
            setIconGridWidth(Math.min(Math.max(cols, 0.5), 3));
            // debugLog(`cols: ${cols} determined for minimum icon width ${MINIMUM_ICON_WIDTH} and derived column width ${columnWidth} from width ${width}`);
        });
      
        observer.observe(containerRef.current);
      
        return () => observer.disconnect();
    }, []);    
    
    return (
        <>
            <Grid item xs={iconGridWidth} md={iconGridWidth} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </Grid>
            <Grid item xs={maxGridWidth - iconGridWidth} md={maxGridWidth - iconGridWidth}>
                <Typography component="span" sx={{ 
                    color: theme.palette.text.primary,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                }}>
                    <Box component="span">
                        {isValid ? (
                            <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none', color: theme.palette.text.primary }}>
                                {displayText}
                            </Link>
                        ) : (
                            displayText
                        )}
                        {isLong && (
                            <Typography
                                component="span"
                                sx={{ ml: 1, color: theme.palette.text.secondary, cursor: 'pointer', display: 'inline' }}
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? 'Show less' : 'Show more'}
                            </Typography>
                        )}
                    </Box>
                </Typography>
            </Grid>
        </>
    );
};

export default GridItemIconText;
