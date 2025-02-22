import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import Layout from './Layout';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const userRole = localStorage.getItem('role');

  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <Layout>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
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
            <Typography variant="h4" color="error" gutterBottom>
              Unauthorized
            </Typography>
            <Typography variant="body1">
              You do not have permission to access this page. Please contact the administrator if you believe this is an error.
            </Typography>
          </Paper>
        </Box>
      </Layout>
    );
  }

  return <>{children}</>;
} 