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

interface RouteConfig {
  path?: string;
  label: string;
  icon: any;
  roles?: string[];
  showInSidebar?: boolean;
  component?: React.ComponentType<any>;
}

// Regular user routes
export const userRoutes: RouteConfig[] = [
  {
    path: '/home',
    label: 'Home',
    icon: HomeIcon,
    showInSidebar: true,
    component: Home
  },
  {
    path: '/appointment/request',
    label: 'Request Appointment',
    icon: CalendarAddIcon,
    showInSidebar: true,
    component: AppointmentForm
  },
  {
    path: '/appointments',
    label: 'Appointments',
    icon: ListIcon,
    showInSidebar: true,
    component: AppointmentStatus
  },
  {
    path: '/dignitaries',
    label: 'Dignitaries',
    icon: PersonListIcon,
    showInSidebar: true,
    component: DignitaryList
  },
  {
    path: '/profile',
    label: 'My Profile',
    icon: PersonIcon,
    showInSidebar: true,
    component: Profile
  },
];

// Admin (Secretariat) routes
export const adminRoutes: RouteConfig[] = [
  {
    label: 'ADMIN',
    icon: AdminIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
  },
  {
    path: '/admin/users',
    label: 'All Users',
    icon: PersonListIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
    component: UsersAll
  },
  {
    path: '/admin/dignitaries',
    label: 'All Dignitaries',
    icon: PersonListIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
    component: DignitaryListAll
  },
  {
    path: '/admin/locations',
    label: 'Locations',
    icon: LocationOnIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
    component: LocationsManage
  },
  {
    path: '/admin/appointments',
    label: 'All Appointments',
    icon: TableRowsIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
    component: AppointmentStatusAll
  },
  {
    path: '/admin/appointments/review',
    label: 'Review Appointments',
    icon: ViewColumnIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
    component: AppointmentTiles
  },
  {
    path: '/admin/appointments/calendar',
    label: 'Daily Schedule',
    icon: CalendarViewDayIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
    component: AppointmentDayView
  },
  {
    path: '/admin/appointments/edit/:id',
    label: 'Edit Appointment',
    icon: CalendarAddIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: false,
    component: AppointmentEdit
  },
];

// Combine all routes
export const allRoutes = [...userRoutes, ...adminRoutes];

// Helper function to get sidebar items based on user role
export const getSidebarItems = (userRole: string | null) => {
  const items = [...userRoutes.filter(route => route.showInSidebar)];
  
  if (userRole === SECRETARIAT_ROLE) {
    items.push(...adminRoutes.filter(route => route.showInSidebar));
  }
  
  return items;
}; 