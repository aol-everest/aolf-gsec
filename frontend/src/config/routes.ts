import LocationOnIcon from '@mui/icons-material/LocationOn';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';

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
}

// Regular user routes
export const userRoutes: RouteConfig[] = [
  {
    path: '/home',
    label: 'Home',
    icon: HomeIcon,
    showInSidebar: true,
  },
  {
    path: '/appointment-form',
    label: 'Request Appointment',
    icon: CalendarAddIcon,
    showInSidebar: true,
  },
  {
    path: '/appointment-status',
    label: 'Appointment Status',
    icon: ListIcon,
    showInSidebar: true,
  },
  {
    path: '/dignitary-list',
    label: 'Dignitaries',
    icon: PersonListIcon,
    showInSidebar: true,
  },
  {
    path: '/profile',
    label: 'My Profile',
    icon: PersonIcon,
    showInSidebar: true,
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
    label: 'Users',
    icon: PersonListIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
  },
  {
    path: '/admin/dignitaries',
    label: 'Dignitaries',
    icon: PersonListIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
  },
  {
    path: '/admin/locations',
    label: 'Locations',
    icon: LocationOnIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
  },
  {
    path: '/admin/appointments/list',
    label: 'Appointments List',
    icon: TableRowsIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
  },
  {
    path: '/admin/appointments/tiles',
    label: 'Appointments Tiles',
    icon: ViewColumnIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
  },
  {
    path: '/admin/appointments/calendar',
    label: 'Daily Schedule',
    icon: CalendarViewDayIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: true,
  },
  {
    path: '/admin/appointments/edit/:id',
    label: 'Edit Appointment',
    icon: CalendarAddIcon,
    roles: [SECRETARIAT_ROLE],
    showInSidebar: false,
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