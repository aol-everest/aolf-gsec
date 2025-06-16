import LocationOnIcon from '@mui/icons-material/LocationOn';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import FileCopyIcon from '@mui/icons-material/FileCopy';

// Page imports
import Home from '../pages/Home';
import AppointmentRequest from '../pages/AppointmentRequest';
import AppointmentStatus from '../pages/AppointmentStatus';
import DignitaryList from '../pages/DignitaryList';
import Profile from '../pages/Profile';
import AdminManageUsers from '../pages/AdminManageUsers';
import AdminDignitaryList from '../pages/AdminDignitaryList';
import AdminAppointmentList from '../pages/AdminAppointmentList';
import AdminAppointmentTiles from '../pages/AdminAppointmentTiles';
import AdminAppointmentEdit from '../pages/AdminAppointmentEdit';
import AdminAppointmentSchedule from '../pages/AdminAppointmentSchedule';
import AdminLocationsManage from '../pages/AdminLocationsManage';
import UsherAppointmentSchedule from '../pages/UsherAppointmentSchedule';
import LocationAttachmentView from '../pages/LocationAttachmentView';
import AdminAppointmentCreate from '../pages/AdminAppointmentCreate';
import AddNewDignitary from '../pages/AdminAddNewDignitary';
import AppointmentDetail from '../pages/AppointmentDetail';

import { 
    HomeMenuIconV2,
    CalendarAddMenuIconV2,
    PersonMenuIconV2,
    ListMenuIconV2,
    PersonListMenuIconV2,
    PeopleMenuIconV2,
    TeamCheckV2,
    MemoCheckMenuIconV2,
    AddPersonMenuIconV2,
    LocationThinMenuIconV2,
    EditMenuIconV2,
    CalendarMenuIconV2,
} from '../components/iconsv2';

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
  icon: HomeMenuIconV2,
  showInSidebar: true,
  component: Home
}

export const AppointmentRequestRoute: RouteConfig = {
  path: '/appointment/request',
  label: 'Request Appointment',
  icon: CalendarAddMenuIconV2,
  showInSidebar: true,
  component: AppointmentRequest
}

export const AppointmentsRoute: RouteConfig = {
  path: '/appointments',
  label: 'Appointments',
  icon: ListMenuIconV2,
  showInSidebar: true,
  component: AppointmentStatus
}

export const DignitariesRoute: RouteConfig = {
  path: '/dignitaries',
  label: 'Dignitaries',
  icon: PersonListMenuIconV2,
  showInSidebar: true,
  component: DignitaryList
}

export const ProfileRoute: RouteConfig = {
  path: '/profile',
  label: 'My Profile',
  icon: PersonMenuIconV2,
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

// Add the new route for viewing appointment details
export const AppointmentDetailRoute: RouteConfig = {
  path: '/appointment/:id',
  label: 'Appointment Detail',
  icon: ListMenuIconV2,
  showInSidebar: false,
  component: AppointmentDetail
} 

// Admin (Secretariat) routes ---------------------------------------------------------------------------
export const AdminLocationsRoute: RouteConfig = {
  path: '/admin/locations',
  label: 'Manage Locations',
  icon: LocationThinMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminLocationsManage
}

export const AdminAppointmentsRoute: RouteConfig = {
  path: '/admin/appointments',
  label: 'Appointments List',
  icon: ListMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminAppointmentList
}

export const AdminAppointmentsReviewRoute: RouteConfig = {
  path: '/admin/appointments/review',
  label: 'Review Appointments',
  icon: MemoCheckMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminAppointmentTiles
}

export const AdminAppointmentReviewWithIdRoute: RouteConfig = {
  path: '/admin/appointments/review/:id',
  label: 'Review Appointment',
  icon: MemoCheckMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: false,
  component: AdminAppointmentTiles
}

export const AdminAppointmentsCalendarRoute: RouteConfig = {
  path: '/admin/appointments/calendar',
  label: 'Daily Schedule',
  icon: CalendarMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminAppointmentSchedule
}

export const AdminAppointmentsEditRoute: RouteConfig = {
  path: '/admin/appointments/edit/:id',
  label: 'Edit Appointment',
  icon: EditMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: false,
  component: AdminAppointmentEdit
}

export const AdminUsersRoute: RouteConfig = {
  path: '/admin/users', 
  label: 'Manage Users',
  icon: PeopleMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminManageUsers
}

export const AdminDignitariesRoute: RouteConfig = {
  path: '/admin/dignitaries',
  label: 'All Dignitaries',
  icon: PersonListMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminDignitaryList
}

export const AdminAddNewDignitaryRoute: RouteConfig = {
  path: '/admin/dignitaries/new',
  label: 'Add New Dignitary',
  icon: AddPersonMenuIconV2,
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

// Add the new route for secretariat appointment request
export const AdminAppointmentRequestRoute: RouteConfig = {
  path: '/admin/appointments/request',
  label: 'Create Appointment',
  icon: CalendarAddMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminAppointmentCreate
}

// Add the new route for editing dignitaries
export const AdminEditDignitaryRoute: RouteConfig = {
  path: '/admin/dignitaries/edit/:id',
  label: 'Edit Dignitary',
  icon: EditMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: false,
  component: AddNewDignitary // Reuse the same component for adding and editing dignitaries
}

// Usher routes ---------------------------------------------------------------------------------------
export const UsherAppointmentsRoute: RouteConfig = {
  path: '/usher/appointments',
  label: 'Appointment Check-in',
  icon: CalendarMenuIconV2,
  roles: [USHER_ROLE, ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: UsherAppointmentSchedule
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
  AppointmentDetailRoute,
];

// Admin (Secretariat) routes --------------------------------------------------------------------------
export const adminRoutes: RouteConfig[] = [
  AdminHeaderRoute,
  AdminAppointmentsReviewRoute,
  AdminAppointmentsCalendarRoute,
  AdminAppointmentReviewWithIdRoute,
  AdminAppointmentsEditRoute,
  AdminAddNewDignitaryRoute,
  AdminEditDignitaryRoute,
  AdminAppointmentRequestRoute,
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
