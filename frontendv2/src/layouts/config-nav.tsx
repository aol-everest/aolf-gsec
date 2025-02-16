import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';
import { addIcon, editCalendar, editIcon, homeIcon, calendarViewDayIcon, calendarAddIcon, listIcon, personListIcon, personIcon } from 'src/components/icons/icons';
// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    title: 'Home',
    path: '/',
    icon: homeIcon,
  },
  {
    title: 'Request Appointment',
    path: '/request-appointment',
    icon: calendarAddIcon,
  },
  {
    title: 'Appointment Status',
    path: '/appointment-status',
    icon: listIcon,
    info: (
      <Label color="error" variant="inverted">
        +3
      </Label>
    ),
  },
  {
    title: 'Dignitaries',
    path: '/dignitaries',
    icon: personListIcon,
  },
  {
    title: 'My Profile',
    path: '/my-profile',
    icon: personIcon,
  },
  {
    title: 'Users',
    path: '/users-all',
    icon: personListIcon,
  },
  {
    title: 'Appointments',
    path: '/appointments-all',
    icon: calendarViewDayIcon,
  },
  {
    title: 'Dignitaries',
    path: '/dignitaries-all',
    icon: personListIcon,
  },
];
