import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

interface VersionInfo {
  version: string;
  installDate: string;
  hasUpdate: boolean;
}

export function Settings() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [rotateIcon, setRotateIcon] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    email: localStorage.getItem('default_email') || '',
    password: localStorage.getItem('default_email_password') || '',
  });

  const handleEmailSettings = () => {
    const email = prompt("Enter default sender email:", emailSettings.email);
    const password = prompt("Enter password for this email:", emailSettings.password);

    if (email && password) {
      localStorage.setItem('default_email', email);
      localStorage.setItem('default_email_password', password);
      setEmailSettings({ email, password });
      alert('Default email settings saved.');
    }
  };

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        const installDate = localStorage.getItem('app_install_date') || new Date().toISOString();
        if (!localStorage.getItem('app_install_date')) {
          localStorage.setItem('app_install_date', installDate);
        }

        setVersionInfo({
          version: appVersion,
          installDate: installDate,
          hasUpdate: false
        });
      } catch (error) {
        console.error('Error fetching version:', error);
      }
    };

    fetchVersion();
  }, []);

  const handleOpen = () => {
    setRotateIcon(true);
    setOpen(true);
  };

  const handleClose = () => {
    setRotateIcon(false);
    setOpen(false);
  };

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
          onClick={handleOpen}
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
        sx={{
          '& .MuiPaper-root': {
            width: '700px',
            maxWidth: '80vw',
            height: '500px',
            maxHeight: '80vh',
            p: 2,
          },
        }}
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Typography variant="h6">Settings</Typography>

          {/* Settings Options */}
          <Stack spacing={1.5}>
            <Box
              sx={{
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Iconify icon="solar:pen-bold" width={20} />
              <Typography variant="body2">General Settings</Typography>
            </Box>

            <Box
              sx={{
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
              onClick={handleEmailSettings}
            >
              <Iconify icon="solar:mail-unread-bold" width={25} />
              <Typography variant="body2">Mail</Typography>
            </Box>
          </Stack>

          <Divider />

          {/* Version Information */}
          {versionInfo && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Version Information
              </Typography>
              <Stack spacing={1} sx={{ pl: 1 }}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify icon="solar:eye-bold" width={14} />
                  v{versionInfo.version}
                  {versionInfo.hasUpdate && (
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'warning.lighter',
                        color: 'warning.main',
                        fontSize: '0.65rem',
                      }}
                    >
                      Update
                    </Box>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Installed: {new Date(versionInfo.installDate).toLocaleDateString()}
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </Dialog>
    </>
  );
}