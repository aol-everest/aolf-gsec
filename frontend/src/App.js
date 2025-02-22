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
import Home from './pages/Home';
import AppointmentForm from './pages/AppointmentForm';
import AppointmentStatus from './pages/AppointmentStatus';
import DignitaryList from './pages/DignitaryList';
import Profile from './pages/Profile';
import UsersAll from './pages/UsersAll';
import DignitaryListAll from './pages/DignitaryListAll';
import AppointmentStatusAll from './pages/AppointmentStatusAll';
import AppointmentTiles from './pages/AppointmentTiles';
import AppointmentEdit from './pages/AppointmentEdit';
import AppointmentDayView from './pages/AppointmentDayView';
import LocationsManage from './pages/LocationsManage';

// Components
import PrivateRoute from './components/PrivateRoute';
import RoleBasedRoute from './components/RoleBasedRoute';

// Constants
const SECRETARIAT_ROLE = 'SECRETARIAT';

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

                {/* Secretariat-only routes */}
                <Route
                  path="/users-all"
                  element={
                    <PrivateRoute>
                      <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                        <UsersAll />
                      </RoleBasedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/dignitary-list-all"
                  element={
                    <PrivateRoute>
                      <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                        <DignitaryListAll />
                      </RoleBasedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/appointment-status-all"
                  element={
                    <PrivateRoute>
                      <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                        <AppointmentStatusAll />
                      </RoleBasedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/appointment-tiles"
                  element={
                    <PrivateRoute>
                      <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                        <AppointmentTiles />
                      </RoleBasedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/appointment-day-view"
                  element={
                    <PrivateRoute>
                      <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                        <AppointmentDayView />
                      </RoleBasedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/appointment-edit/:id"
                  element={
                    <PrivateRoute>
                      <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                        <AppointmentEdit />
                      </RoleBasedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/locations-manage"
                  element={
                    <PrivateRoute>
                      <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                        <LocationsManage />
                      </RoleBasedRoute>
                    </PrivateRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App; 