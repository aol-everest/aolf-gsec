import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import theme from './styles/theme';
import './styles/global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Pages
import Landing from './pages/Landing';

// Components
import PrivateRoute from './components/PrivateRoute';
import RoleBasedRoute from './components/RoleBasedRoute';

// Route Configuration
import { userRoutes, adminRoutes, SECRETARIAT_ROLE } from './config/routes';

// Wrapper component to handle auth redirect
const AuthRedirect = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/home" replace /> : <Landing />;
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      cacheTime: 1000 * 60 * 30, // Cache is kept for 30 minutes
      retry: 1, // Only retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
});

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider maxSnack={3}>
            <Router>
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<AuthRedirect />} />
                  
                  {/* Regular authenticated routes */}
                  {userRoutes.filter(route => route.path && route.component).map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <PrivateRoute>
                          <route.component />
                        </PrivateRoute>
                      }
                    />
                  ))}

                  {/* Admin routes */}
                  {adminRoutes.filter(route => route.path && route.component).map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <PrivateRoute>
                          <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                            <route.component />
                          </RoleBasedRoute>
                        </PrivateRoute>
                      }
                    />
                  ))}
                </Routes>
              </AuthProvider>
            </Router>
          </SnackbarProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App; 