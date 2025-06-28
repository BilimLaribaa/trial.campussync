import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { openPath } from '@tauri-apps/plugin-opener';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew'; 

import { LayoutSection } from 'src/layouts/core/layout-section';

import { Iconify } from 'src/components/iconify';

type SettingTab = 'general' | 'email';

interface VersionInfo {
  version: string;
  installDate: string;
  hasUpdate: boolean;
}

interface EmailSettings {
  email: string;
  password: string;
}

const EMAIL_STORAGE_KEY = 'app_email';
const PASSWORD_STORAGE_KEY = 'app_password';

export function Settings({ onUpdateEmailSettings }: {
  onUpdateEmailSettings?: (settings: EmailSettings) => void;
}) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [rotateIcon, setRotateIcon] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>('general');
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email: '',
    password: '',
  });

  // Load email/password from localStorage
  useEffect(() => {
    const email = localStorage.getItem(EMAIL_STORAGE_KEY) || '';
    const password = localStorage.getItem(PASSWORD_STORAGE_KEY) || '';
    setEmailSettings({ email, password });

    if (onUpdateEmailSettings) {
      onUpdateEmailSettings({ email, password });
    }
  }, []);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        const installDate = new Date().toISOString();

        setVersionInfo({
          version: appVersion,
          installDate,
          hasUpdate: false,
        });
      } catch (error) {
        console.error('Error fetching version:', error);
      }
    };

    fetchVersion();
  }, []);

  const handleEmailSettings = () => {
    const email = prompt('Enter default sender email:', emailSettings.email);
    const password = prompt('Enter password for this email:', '');

    if (email && password) {
      const updatedSettings = { email, password };
      setEmailSettings(updatedSettings);
      localStorage.setItem(EMAIL_STORAGE_KEY, email);
      localStorage.setItem(PASSWORD_STORAGE_KEY, password);
      if (onUpdateEmailSettings) {
        onUpdateEmailSettings(updatedSettings);
      }
      alert('Email settings saved. They will persist across pages and refresh.');
    }
  };

  const handleHelpClick = async () => {
    try {
      await openPath('https://support.google.com/accounts/answer/185833?hl=en');
    } catch (error) {
      console.error('Failed to open help link:', error);
    }
  };

  const toggleDialog = () => {
    setOpen(!open);
    setRotateIcon(!rotateIcon);
  };

  const handleClose = () => {
    setOpen(false);
    setRotateIcon(false);
  };

  const renderHeader = () => (
    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6">Settings</Typography>
    </Box>
  );

  const renderSidebar = () => (
    <Box sx={{ width: 240, borderRight: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Stack spacing={1} sx={{ p: 2 }}>
        <Box
          onClick={() => setActiveTab('general')}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ...(activeTab === 'general' && {
              bgcolor: 'action.selected',
              color: 'primary.main',
            }),
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Iconify icon="solar:pen-bold" width={20} />
          <Typography variant="body2">General</Typography>
        </Box>

        <Box
          onClick={() => {
            setActiveTab('email');
            handleEmailSettings();
          }}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ...(activeTab === 'email' && {
              bgcolor: 'action.selected',
              color: 'primary.main',
            }),
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Iconify icon="solar:mail-unread-bold" width={20} />
          <Typography variant="body2">Email</Typography>
        </Box>
      </Stack>
    </Box>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'email':
        return (
          <Box sx={{ p: 3, flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Email Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Current email: {emailSettings.email || 'Not set'}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Link
                component="button"
                variant="body2"
                onClick={handleHelpClick}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'primary.main',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Google App Password Setup Guide
                <OpenInNewIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Link>
            </Stack>
          </Box>
        );
      case 'general':
      default:
        return (
          <Box sx={{ p: 3, flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              General Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Application preferences and configurations
            </Typography>
          </Box>
        );
    }
  };

  const renderFooter = () => (
    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      {versionInfo && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption">v{versionInfo.version}</Typography>
          <Divider orientation="vertical" flexItem />
          <Typography variant="caption">
            Installed: {new Date(versionInfo.installDate).toLocaleDateString()}
          </Typography>
        </Stack>
      )}
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 9999,
        }}
      >
        <IconButton
          onClick={toggleDialog}
          size="small"
          sx={{
            bgcolor: 'background.default',
            boxShadow: (theme) => theme.shadows[2],
            width: 40,
            height: 40,
            '&:hover': {
              bgcolor: 'background.neutral',
              boxShadow: (theme) => theme.shadows[8],
            },
            transform: rotateIcon ? 'rotate(30deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          <Iconify icon="solar:settings-bold-duotone" width={24} />
        </IconButton>
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            height: '70vh',
            maxHeight: 600,
          },
        }}
      >
        <LayoutSection
          headerSection={renderHeader()}
          sidebarSection={renderSidebar()}
          footerSection={renderFooter()}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
            {renderContent()}
          </Box>
        </LayoutSection>
      </Dialog>
    </>
  );
}
