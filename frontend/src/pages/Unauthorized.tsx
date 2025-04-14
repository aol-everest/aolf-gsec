import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 600,
            textAlign: 'center',
          }}
        >
          <Typography variant="h1" color="error" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" paragraph>
            You do not have permission to access this page. This area is restricted to authorized personnel only.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/home')}
          >
            Return to Home
          </Button>
        </Paper>
      </Box>
    </Layout>
  );
};

export default Unauthorized; 