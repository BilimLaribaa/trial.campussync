import { Iconify } from 'src/components/iconify';

import type { AccountPopoverProps } from './components/account-popover';

// ----------------------------------------------------------------------

export const _account: AccountPopoverProps['data'] = [
  {
    label: 'Profile',
    icon: <Iconify width={22} icon="solar:shield-keyhole-bold-duotone" />,
    href: '/profile',
  },
];
