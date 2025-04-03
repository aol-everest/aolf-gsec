import React from 'react';
import { Box, styled } from '@mui/material';

// The styled vector element for the curved shape
const VectorShape = styled(Box)(({ theme }) => ({
  position: 'absolute',
  visibility: 'visible',
  width: '1605px',
  height: '352px',
  left: 'calc(50% - 1605px/2 + 19.5px)',
  top: '-58px',
  background: theme.palette.common.white,
  opacity: 0.08,
  borderRadius: '78px',
}));

// The styled vector element for the right decorative circle
const VectorCircleRight = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '456.73px',
  height: '436.28px',
  left: '814px',
  top: '-110.51px',
  opacity: 0.15,
  border: `2px solid ${theme.palette.common.white}`,
  transform: 'rotate(-6.98deg)',
  borderRadius: '50%',
}));

// The styled vector element for the left decorative circle
const VectorCircleLeft = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '499.4px',
  height: '477.04px',
  left: '555.7px',
  top: '-191.35px',
  opacity: 0.15,
  border: `2px solid ${theme.palette.common.white}`,
  transform: 'matrix(-1, -0.04, -0.04, 1, 0, 0)',
  borderRadius: '50%',
}));

// The main container for the background
const BackgroundContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '180px',
  background: 'linear-gradient(102.78deg, #3D8BE8 -37.89%, #89BEEC 100.28%)',
  position: 'relative',
  overflow: 'hidden',
}));

interface ProfileBackgroundProps {
  children?: React.ReactNode;
}

const ProfileBackground: React.FC<ProfileBackgroundProps> = ({ children }) => {
  return (
    <BackgroundContainer>
      <VectorShape />
      <VectorCircleRight />
      <VectorCircleLeft />
      {children}
    </BackgroundContainer>
  );
};

export default ProfileBackground; 