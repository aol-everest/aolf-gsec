import React from 'react';
import { Box, Stack, Typography, Divider } from '@mui/material';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import DangerButton from './WarningButton';

// Icon imports
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LogoutIconV2 } from './icons';

const ButtonExample: React.FC = () => {
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Button Component Examples
      </Typography>
      
      <Stack spacing={4} sx={{ marginTop: 3 }}>
        <Typography variant="h5">Primary Buttons</Typography>
        
        <Typography variant="subtitle2">Sizes</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <PrimaryButton size="small">Small</PrimaryButton>
          <PrimaryButton size="medium">Medium</PrimaryButton>
          <PrimaryButton size="large">Large</PrimaryButton>
        </Stack>
        
        <Divider />
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Basic:
          </Typography>
          <PrimaryButton>Next</PrimaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            With Right Icon:
          </Typography>
          <PrimaryButton rightIcon={<ArrowForwardIcon />}>Continue</PrimaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            With Left Icon:
          </Typography>
          <PrimaryButton leftIcon={<ArrowBackIcon />}>Back</PrimaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Disabled:
          </Typography>
          <PrimaryButton disabled>Submit</PrimaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Full Width:
          </Typography>
          <Box sx={{ width: '100%' }}>
            <PrimaryButton fullWidth>Full Width Button</PrimaryButton>
          </Box>
        </Stack>

        <Typography variant="h5" sx={{ mt: 4 }}>Secondary Buttons</Typography>
        
        <Typography variant="subtitle2">Sizes</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <SecondaryButton size="small">Small</SecondaryButton>
          <SecondaryButton size="medium">Medium</SecondaryButton>
          <SecondaryButton size="large">Large</SecondaryButton>
        </Stack>
        
        <Divider />
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Basic:
          </Typography>
          <SecondaryButton>Back</SecondaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            With Right Icon:
          </Typography>
          <SecondaryButton rightIcon={<ArrowForwardIcon />}>Next</SecondaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            With Left Icon:
          </Typography>
          <SecondaryButton leftIcon={<ArrowBackIcon />}>Back</SecondaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Disabled:
          </Typography>
          <SecondaryButton disabled>Cancel</SecondaryButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Full Width:
          </Typography>
          <Box sx={{ width: '100%' }}>
            <SecondaryButton fullWidth>Full Width Secondary Button</SecondaryButton>
          </Box>
        </Stack>

        <Typography variant="h5" sx={{ mt: 4 }}>Danger Buttons</Typography>
        
        <Typography variant="subtitle2">Sizes</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <DangerButton size="small">Small</DangerButton>
          <DangerButton size="medium">Medium</DangerButton>
          <DangerButton size="large">Large</DangerButton>
        </Stack>
        
        <Divider />
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Basic:
          </Typography>
          <DangerButton>Delete</DangerButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            With Icon:
          </Typography>
          <DangerButton leftIcon={<LogoutIconV2 />}>Logout</DangerButton>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ width: 200 }}>
            Disabled:
          </Typography>
          <DangerButton disabled>Delete</DangerButton>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ButtonExample; 