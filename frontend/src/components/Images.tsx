import React from 'react';
import { Box, SxProps } from '@mui/material';

function GurudevLogo(sx: SxProps) {
  return (
    <Box
      component="img"
      src="/gurudev-logo-centered.png"
      alt="Gurudev"
      sx={sx}
    />
  );
}

export default GurudevLogo;