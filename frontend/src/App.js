import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Landing from './pages/Landing';
import Home from './pages/Home';
import AppointmentForm from './pages/AppointmentForm';
import AppointmentStatus from './pages/AppointmentStatus';
import DignitaryList from './pages/DignitaryList';
import Profile from './pages/Profile';

// Components
import PrivateRoute from './components/PrivateRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Wrapper component to handle auth redirect
const AuthRedirect = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/home" replace /> : <Landing />;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <ThemeProvider theme={theme}>
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<AuthRedirect />} />
              <Route
                path="/home"
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                }
              />
              <Route
                path="/appointment-form"
                element={
                  <PrivateRoute>
                    <AppointmentForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/appointment-status"
                element={
                  <PrivateRoute>
                    <AppointmentStatus />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dignitary-list"
                element={
                  <PrivateRoute>
                    <DignitaryList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App; 