import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import theme from './styles/theme';
import './styles/global.css';

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

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
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
    </GoogleOAuthProvider>
  );
}

export default App; 