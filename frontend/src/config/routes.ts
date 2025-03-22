import LocationOnIcon from '@mui/icons-material/LocationOn';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import FileCopyIcon from '@mui/icons-material/FileCopy';

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
import AppointmentUsherView from '../pages/AppointmentUsherView';
import LocationAttachmentView from '../pages/LocationAttachmentView';
import AddNewDignitary from '../pages/AdminAddNewDignitary';

import { 
    AddIcon, 
    EditCalendarIcon, 
    EditIcon, 
    HomeIcon, 
    HomeIconV2,
    CalendarViewDayIcon, 
    CalendarAddIcon, 
    ListIcon, 
    PersonListIcon, 
    PersonIcon, 
    OutlineTableRowsIcon, 
    OutlineTableChartIcon, 
    RoundViewColumnIcon,
    RoundPeopleIcon,
    UsherIcon,
    CalendarAddIconV2,
    PersonIconV2,
    ListIconV2,
    PersonListIconV2,
    PeopleIconV2,
    CalendarIconV2,
    RoundViewColumnIconV2,
    LocationIconV2,
    TeamCheckV2,
    MemoCheckIconV2,
    AddPersonIconV2,
    LocationThinIconV2,
} from '../components/icons';

export const SECRETARIAT_ROLE = 'SECRETARIAT';
export const ADMIN_ROLE = 'ADMIN';
export const USHER_ROLE = 'USHER';

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
  icon: HomeIconV2,
  showInSidebar: true,
  component: Home
}

export const AppointmentRequestRoute: RouteConfig = {
  path: '/appointment/request',
  label: 'Request Appointment',
  icon: CalendarAddIconV2,
  showInSidebar: true,
  component: AppointmentForm
}

export const AppointmentsRoute: RouteConfig = {
  path: '/appointments',
  label: 'Appointments',
  icon: ListIconV2,
  showInSidebar: true,
  component: AppointmentStatus
}

export const DignitariesRoute: RouteConfig = {
  path: '/dignitaries',
  label: 'Dignitaries',
  icon: PersonListIconV2,
  showInSidebar: true,
  component: DignitaryList
}

export const ProfileRoute: RouteConfig = {
  path: '/profile',
  label: 'My Profile',
  icon: PersonIconV2,
  showInSidebar: true,
  component: Profile
}

// Add the new route for viewing location attachments
export const LocationAttachmentViewRoute: RouteConfig = {
  path: '/locations/view-attachment/:locationId',
  label: 'View Attachment',
  icon: FileCopyIcon,
  showInSidebar: false,
  component: LocationAttachmentView
} 

// Admin (Secretariat) routes ---------------------------------------------------------------------------
export const AdminLocationsRoute: RouteConfig = {
  path: '/admin/locations',
  label: 'Manage Locations',
  icon: LocationThinIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: LocationsManage
}

export const AdminAppointmentsRoute: RouteConfig = {
  path: '/admin/appointments',
  label: 'Appointments List',
  icon: ListIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AppointmentStatusAll
}

export const AdminAppointmentsReviewRoute: RouteConfig = {
  path: '/admin/appointments/review',
  label: 'Review Appointments',
  icon: MemoCheckIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AppointmentTiles
}

export const AdminAppointmentReviewWithIdRoute: RouteConfig = {
  path: '/admin/appointments/review/:id',
  label: 'Review Appointment',
  icon: MemoCheckIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: false,
  component: AppointmentTiles
}

export const AdminAppointmentsCalendarRoute: RouteConfig = {
  path: '/admin/appointments/calendar',
  label: 'Daily Schedule',
  icon: CalendarIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AppointmentDayView
}

export const AdminAppointmentsEditRoute: RouteConfig = {
  path: '/admin/appointments/edit/:id',
  label: 'Edit Appointment',
  icon: EditIcon,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: false,
  component: AppointmentEdit
}

export const AdminUsersRoute: RouteConfig = {
  path: '/admin/users', 
  label: 'All Users',
  icon: PeopleIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: UsersAll
}

export const AdminDignitariesRoute: RouteConfig = {
  path: '/admin/dignitaries',
  label: 'All Dignitaries',
  icon: PersonListIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: DignitaryListAll
}

export const AdminAddNewDignitaryRoute: RouteConfig = {
  path: '/admin/add-new-dignitary',
  label: 'Add New Dignitary',
  icon: AddPersonIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AddNewDignitary
}

export const AdminHeaderRoute: RouteConfig = {
  label: 'ADMIN',
  icon: AdminIcon,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
}

// Usher routes ---------------------------------------------------------------------------------------
export const UsherAppointmentsRoute: RouteConfig = {
  path: '/usher/appointments',
  label: 'Appointments Schedule',
  icon: CalendarIconV2,
  roles: [USHER_ROLE, ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AppointmentUsherView
}

export const UsherHeaderRoute: RouteConfig = {
  label: 'USHER',
  icon: TeamCheckV2,
  roles: [USHER_ROLE, ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
}

// Regular user routes ---------------------------------------------------------------------------------
export const userRoutes: RouteConfig[] = [
  HomeRoute,
  AppointmentRequestRoute,
  AppointmentsRoute,
  DignitariesRoute,
  ProfileRoute,
  LocationAttachmentViewRoute,
];

// Admin (Secretariat) routes --------------------------------------------------------------------------
export const adminRoutes: RouteConfig[] = [
  AdminHeaderRoute,
  AdminAppointmentsReviewRoute,
  AdminAppointmentsCalendarRoute,
  AdminAppointmentReviewWithIdRoute,
  AdminAppointmentsEditRoute,
  AdminAddNewDignitaryRoute,
  AdminLocationsRoute,
  AdminAppointmentsRoute,
  AdminUsersRoute,
  AdminDignitariesRoute,
];

// Usher routes ----------------------------------------------------------------------------------------
export const usherRoutes: RouteConfig[] = [
  UsherHeaderRoute,
  UsherAppointmentsRoute,
];

// Combine all routes ----------------------------------------------------------------------------------
export const allRoutes = [...userRoutes, ...adminRoutes, ...usherRoutes];

// Helper function to get sidebar items based on user role ----------------------------------------------
export const getSidebarItems = (userRole: string | null) => {
  const items = [...userRoutes.filter(route => route.showInSidebar)];
  
  if (userRole === ADMIN_ROLE || userRole === SECRETARIAT_ROLE) {
    items.push(...adminRoutes.filter(route => route.showInSidebar));
  }
  
  if (userRole === USHER_ROLE || userRole === ADMIN_ROLE || userRole === SECRETARIAT_ROLE) {
    items.push(...usherRoutes.filter(route => route.showInSidebar));
  }
  
  return items;
};
