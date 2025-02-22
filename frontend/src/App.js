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

// Route Configuration
import { userRoutes, adminRoutes, SECRETARIAT_ROLE } from './config/routes';

// Component mapping
const pageComponents = {
  '/home': Home,
  '/appointment-form': AppointmentForm,
  '/appointment-status': AppointmentStatus,
  '/dignitary-list': DignitaryList,
  '/profile': Profile,
  '/admin/users': UsersAll,
  '/admin/dignitaries': DignitaryListAll,
  '/admin/locations': LocationsManage,
  '/admin/appointments/list': AppointmentStatusAll,
  '/admin/appointments/tiles': AppointmentTiles,
  '/admin/appointments/calendar': AppointmentDayView,
  '/admin/appointments/edit/:id': AppointmentEdit,
};

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
                {userRoutes.map((route) => {
                  const Component = pageComponents[route.path];
                  return (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <PrivateRoute>
                          <Component />
                        </PrivateRoute>
                      }
                    />
                  );
                })}

                {/* Admin routes */}
                {adminRoutes.map((route) => {
                  const Component = pageComponents[route.path];
                  return (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <PrivateRoute>
                          <RoleBasedRoute allowedRoles={[SECRETARIAT_ROLE]}>
                            <Component />
                          </RoleBasedRoute>
                        </PrivateRoute>
                      }
                    />
                  );
                })}
              </Routes>
            </AuthProvider>
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App; 