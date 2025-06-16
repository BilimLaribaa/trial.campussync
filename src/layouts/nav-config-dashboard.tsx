import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const navData = [
  {
    title: 'Dashboard',
    path: '/Dashboard',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Students',
    path: '/Dashboard/students',
    icon: icon('ic-user'),
  },
  {
    title: 'Add student',
    path: '/Dashboard/student/add',
    icon: icon('ic-user'),
  },
  // {
  //   title: 'user',
  //   path: '/Dashboard/user',
  //   icon: icon('ic-user'),
  // },
  {
    title: 'Enquiry',
    path: '/Dashboard/enquiry',
    icon: icon('ic-user'),
  },
  // {
  //   title: 'Class',
  //   path: '/Dashboard/class',
  //   icon: icon('ic-user'),
  // }
  // {
  //   title: 'Staff',
  //   path: '/Dashboard/staff',
  //   icon: icon('ic-user'),
  // },
  // {
  //   title: 'Add Staff',
  //   path: '/Dashboard/staff/add',
  //   icon: icon('ic-user'),
  // }

];
