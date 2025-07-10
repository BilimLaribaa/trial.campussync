import type { IconButtonProps } from '@mui/material/IconButton';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { useRouter, usePathname } from 'src/routes/hooks';

import { _myAccount } from 'src/_mock';

import { SchoolProfileDialog } from 'src/components/SchoolProfileDialog';

import Config from '../../../config'; // Import your config file

// ----------------------------------------------------------------------

export interface School {
  id?: number;
  school_name: string;
  school_board: string;
  school_medium: string;
  principal_name: string;
  contact_number: string;
  alternate_contact_number?: string | null;
  school_email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website?: string | null;
  school_image?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface AccountPopoverProps extends Omit<IconButtonProps, 'onClick'> {
  data?: {
    label: string;
    icon: React.ReactNode;
    href: string;
  }[];
  onProfileClick?: () => void;
}

export function AccountPopover({
  data = [],
  sx,
  school,
  refreshSchool,
  onProfileClick,
  ...other
}: AccountPopoverProps & { school?: School | null; refreshSchool?: (() => void) | undefined }) {
  const router = useRouter();
  const pathname = usePathname();

  const [openPopover, setOpenPopover] = useState<null | HTMLElement>(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleClickItem = useCallback(
    (path: string, label?: string) => {
      handleClosePopover();
      if (label === 'Profile' && onProfileClick) {
        onProfileClick();
      } else {
        router.push(path);
      }
    },
    [handleClosePopover, router, onProfileClick]
  );

  // Updated logout function using Config.backend
  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch(`${Config.backend}/auth/logout`, {
        method: 'GET',
        credentials: 'include', // Important for sending cookies
      });

      if (response.ok) {
        router.push('/'); // Redirect to home after successful logout
      } else {
        console.error('Logout failed:', await response.text());
      }
    } catch (error) {
      console.error('Network error during logout:', error);
    }
  }, [router]);

  return (
    <>
      <IconButton
        onClick={handleOpenPopover}
        sx={{
          p: '2px',
          width: 40,
          height: 40,
          background: (theme) =>
            `conic-gradient(${theme.vars.palette.primary.light}, ${theme.vars.palette.warning.light}, ${theme.vars.palette.primary.light})`,
          ...sx,
        }}
        {...other}
      >
        <Avatar
          src={avatarUrl || undefined}
          alt={school?.school_name || _myAccount.displayName}
          sx={{ width: 1, height: 1 }}
        >
          {(school?.school_name || _myAccount.displayName).charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 240 },
          },
        }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {(school && school.school_name) || _myAccount?.displayName}
          </Typography>

          <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>
            {(school && school.school_email) || _myAccount?.email}
          </Typography>

          <Typography variant="body2" sx={{ mt: 0.5 }} noWrap>
            {school ? `${school.address}, ${school.city}, ${school.state} - ${school.pincode}` : ''}
          </Typography>

          <Typography variant="body2" sx={{ mt: 0.5 }} noWrap>
            {school ? `Contact: ${school.contact_number}${school.alternate_contact_number ? `, Alt: ${school.alternate_contact_number}` : ''}` : ''}
          </Typography>

          {school?.website && (
            <Typography variant="body2" sx={{ mt: 0.5, color: 'primary.main' }} noWrap>
              {school.website}
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuList
          disablePadding
          sx={{
            p: 1,
            gap: 0.5,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              px: 1,
              gap: 2,
              borderRadius: 0.75,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
              [`&.${menuItemClasses.selected}`]: {
                color: 'text.primary',
                bgcolor: 'action.selected',
                fontWeight: 'fontWeightSemiBold',
              },
            },
          }}
        >
          {data.map((option) => (
            <MenuItem
              key={option.label}
              selected={option.href === pathname}
              onClick={() => handleClickItem(option.href, option.label)}
            >
              {option.icon}
              {option.label}
            </MenuItem>
          ))}
        </MenuList>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button 
            onClick={handleLogout} 
            fullWidth 
            color="error" 
            size="medium" 
            variant="text"
          >
            Logout
          </Button>
        </Box>
      </Popover>

      {school && refreshSchool && (
        <SchoolProfileDialog
          open={openProfileDialog}
          onClose={() => setOpenProfileDialog(false)}
          onSaved={() => {
            refreshSchool();
          }}
        />
      )}
    </>
  );
}