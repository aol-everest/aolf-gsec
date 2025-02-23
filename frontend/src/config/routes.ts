import LocationOnIcon from '@mui/icons-material/LocationOn';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';

// Page imports
import Home from '../pages/Home';
import AppointmentForm from '../pages/AppointmentForm';
import AppointmentStatus from '../pages/AppointmentStatus';
import DignitaryList from '../pages/DignitaryList';
import Profile from '../pages/Profile';
import UsersAll from '../pages/UsersAll';
import DignitaryListAll from '../pages/DignitaryListAll';
import AppointmentStatusAll from '../pages/AppointmentStatusAll';
import AppointmentTiles from '../pages/AppointmentTiles';
import AppointmentEdit from '../pages/AppointmentEdit';
import AppointmentDayView from '../pages/AppointmentDayView';
import LocationsManage from '../pages/LocationsManage';

import { 
    AddIcon, 
    EditCalendarIcon, 
    EditIcon, 
    HomeIcon, 
    CalendarViewDayIcon, 
    CalendarAddIcon, 
    ListIcon, 
    PersonListIcon, 
    PersonIcon, 
    OutlineTableRowsIcon, 
    OutlineTableChartIcon, 
    RoundViewColumnIcon,
    RoundPeopleIcon,
} from '../components/icons';

export const SECRETARIAT_ROLE = 'SECRETARIAT';

// Route configuration interface ----------------------------------------------------------------------
interface RouteConfig {
  path?: string;
  label: string;
  icon: any;
  roles?: string[];
  showInSidebar?: boolean;
  component?: React.ComponentType<any>;
}

// Regular user routes ---------------------------------------------------------------------------------
export const HomeRoute: RouteConfig = {
  path: '/home',
  label: 'Home',
  icon: HomeIcon,
  showInSidebar: true,
  component: Home
}

export const AppointmentRequestRoute: RouteConfig = {
  path: '/appointment/request',
  label: 'Request Appointment',
  icon: CalendarAddIcon,
  showInSidebar: true,
  component: AppointmentForm
}

export const AppointmentsRoute: RouteConfig = {
  path: '/appointments',
  label: 'Appointments',
  icon: ListIcon,
  showInSidebar: true,
  component: AppointmentStatus
}

export const DignitariesRoute: RouteConfig = {
  path: '/dignitaries',
  label: 'Dignitaries',
  icon: PersonListIcon,
  showInSidebar: true,
  component: DignitaryList
}

export const ProfileRoute: RouteConfig = {
  path: '/profile',
  label: 'My Profile',
  icon: PersonIcon,
  showInSidebar: true,
  component: Profile
}

// Admin (Secretariat) routes ---------------------------------------------------------------------------
export const AdminLocationsRoute: RouteConfig = {
  path: '/admin/locations',
  label: 'Locations',
  icon: LocationOnIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: true,
  component: LocationsManage
}

export const AdminAppointmentsRoute: RouteConfig = {
  path: '/admin/appointments',
  label: 'All Appointments',
  icon: TableRowsIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AppointmentStatusAll
}

export const AdminAppointmentsReviewRoute: RouteConfig = {
  path: '/admin/appointments/review',
  label: 'Review Appointments',
  icon: ViewColumnIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AppointmentTiles
}

export const AdminAppointmentsCalendarRoute: RouteConfig = {
  path: '/admin/appointments/calendar',
  label: 'Daily Schedule',
  icon: CalendarViewDayIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AppointmentDayView
}

export const AdminAppointmentsEditRoute: RouteConfig = {
  path: '/admin/appointments/edit/:id',
  label: 'Edit Appointment',
  icon: EditIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: false,
  component: AppointmentEdit
}

export const AdminUsersRoute: RouteConfig = {
  path: '/admin/users', 
  label: 'All Users',
  icon: PersonListIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: true,
  component: UsersAll
}

export const AdminDignitariesRoute: RouteConfig = {
  path: '/admin/dignitaries',
  label: 'All Dignitaries',
  icon: PersonListIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: true,
  component: DignitaryListAll
}

export const AdminHeaderRoute: RouteConfig = {
  label: 'ADMIN',
  icon: AdminIcon,
  roles: [SECRETARIAT_ROLE],
  showInSidebar: true,
}


// Regular user routes ---------------------------------------------------------------------------------
export const userRoutes: RouteConfig[] = [
  HomeRoute,
  AppointmentRequestRoute,
  AppointmentsRoute,
  DignitariesRoute,
  ProfileRoute,
];

// Admin (Secretariat) routes --------------------------------------------------------------------------
export const adminRoutes: RouteConfig[] = [
  AdminHeaderRoute,
  AdminUsersRoute,
  AdminDignitariesRoute,
  AdminLocationsRoute,
  AdminAppointmentsRoute,
  AdminAppointmentsReviewRoute,
  AdminAppointmentsCalendarRoute,
  AdminAppointmentsEditRoute,
];

// Combine all routes ----------------------------------------------------------------------------------
export const allRoutes = [...userRoutes, ...adminRoutes];

// Helper function to get sidebar items based on user role ----------------------------------------------
export const getSidebarItems = (userRole: string | null) => {
  const items = [...userRoutes.filter(route => route.showInSidebar)];
  
  if (userRole === SECRETARIAT_ROLE) {
    items.push(...adminRoutes.filter(route => route.showInSidebar));
  }
  
  return items;
}; 