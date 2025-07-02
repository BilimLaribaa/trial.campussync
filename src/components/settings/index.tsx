import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { openPath } from '@tauri-apps/plugin-opener';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew'; 

import { LayoutSection } from 'src/layouts/core/layout-section';

import { Iconify } from 'src/components/iconify';

type SettingTab = 'settings' | 'email' | 'academicYear';

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
  const [activeTab, setActiveTab] = useState<SettingTab>('email');
  const [showEmailConfig, setShowEmailConfig] = useState(true);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email: 'demo@example.com',
    password: 'demoPassword123',
  });

  useEffect(() => {
    // Load from localStorage or use defaults
    const email = localStorage.getItem(EMAIL_STORAGE_KEY) || 'demo@example.com';
    const password = localStorage.getItem(PASSWORD_STORAGE_KEY) || 'demoPassword123';
    setEmailSettings({ email, password });

    if (onUpdateEmailSettings) {
      onUpdateEmailSettings({ email, password });
    }

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

  const handleEmailChange = (field: keyof EmailSettings, value: string) => {
    const updatedSettings = { ...emailSettings, [field]: value };
    setEmailSettings(updatedSettings);
  };

  const handleSubmit = () => {
    if (emailSettings.email && emailSettings.password) {
      localStorage.setItem(EMAIL_STORAGE_KEY, emailSettings.email);
      localStorage.setItem(PASSWORD_STORAGE_KEY, emailSettings.password);
      if (onUpdateEmailSettings) {
        onUpdateEmailSettings(emailSettings);
      }
      alert('Email settings saved. They will persist across pages and refresh.');
    } else {
      alert('Please fill in both email and password fields');
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

  const handleEmailTabClick = () => {
    setActiveTab('email');
    setShowEmailConfig(!showEmailConfig);
  };

  const handleSettingsTabClick = () => {
    setActiveTab('settings');
    setShowEmailConfig(false);
  };

  const handleAcademicYearTabClick = () => {
    setActiveTab('academicYear');
    setShowEmailConfig(false);
  };

  const renderSidebar = () => (
    <Box sx={{ width: 200, borderRight: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Stack spacing={1} sx={{ p: 2 }}>
        <Box
          onClick={handleSettingsTabClick}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ...(activeTab === 'settings' && {
              bgcolor: 'action.selected',
              color: 'primary.main',
            }),
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Iconify icon="solar:pen-bold" width={20} />
          <Typography variant="body2">Settings</Typography>
        </Box>

        <Box
          onClick={handleEmailTabClick}
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

        <Box
  onClick={handleAcademicYearTabClick}
  sx={{
    cursor: 'pointer',
    p: 1.5,
    borderRadius: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    ...(activeTab === 'academicYear' && {
      bgcolor: 'action.selected',
      color: 'primary.main',
    }),
    '&:hover': {
      bgcolor: 'action.hover',
    },
  }}
>
  <Iconify icon="solar:calendar-bold" width={20} />
  <Typography variant="body2">Academic Year</Typography>
</Box>
      </Stack>
    </Box>
  );

  const renderEmailSettingsForm = () => (
    showEmailConfig && (
      <Box
        sx={{
          position: 'absolute',
          top: 30,
          right: 70,
          width: 500,
          bgcolor: 'background.paper',
          boxShadow: 1,
          p: 2,
          borderRadius: 1,
          zIndex: 1200,
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          Email Settings
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" display="block" mb={1}>
            Email
          </Typography>
          <input
            type="email"
            value={emailSettings.email}
            onChange={(e) => handleEmailChange('email', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              fontSize: '14px',
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
            placeholder="Enter default sender email"
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" display="block" mb={1}>
            App Password
          </Typography>
          <input
            type="password"
            value={emailSettings.password}
            onChange={(e) => handleEmailChange('password', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              fontSize: '14px',
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
            placeholder="Enter app password"
          />
        </Box>
        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth
          sx={{ mb: 2 }}
        >
          Save Email Settings
        </Button>
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
        
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" gutterBottom>
            Email Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Current email: {emailSettings.email || 'Not set'}
          </Typography>
        </Box>
      </Box>
    )
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'email':
        return <Box sx={{ p: 3, flex: 1 }} />;
      case 'academicYear':
        return (
          <Box sx={{ p: 3, flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Academic Year Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure academic year parameters
            </Typography>
          </Box>
        );
      case 'settings':
      default:
        return <Box sx={{ p: 3, flex: 1 }} />;
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
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            height: '80vh',
            maxHeight: 700,
            position: 'relative',
            width: '80%',
            maxWidth: 800,
          },
        }}
      >
        <LayoutSection
          sidebarSection={renderSidebar()}
          footerSection={renderFooter()}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {renderEmailSettingsForm()}
          <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
            {renderContent()}
          </Box>
          
        </LayoutSection>
      </Dialog>
    </>
  );
}