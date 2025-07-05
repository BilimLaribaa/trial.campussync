import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { openPath } from '@tauri-apps/plugin-opener';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
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

interface AcademicYear {
  id: number;
  academic_year: string;
  status?: 'active' | 'inactive';
}

interface AcademicYearSettings {
  years: AcademicYear[];
  currentYear: string;
  newYear: string;
  generatedYears: string[];
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
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email: '',
    password: '',
  });
  const [academicYearSettings, setAcademicYearSettings] = useState<AcademicYearSettings>({
    years: [],
    currentYear: '',
    newYear: '',
    generatedYears: []
  });

  // Generate academic years from current year -3 to current year +3
  const generateAcademicYears = (): string[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = -3; i <= 3; i++) {
      years.push(`${currentYear + i}-${currentYear + i + 1}`);
    }
    
    return years;
  };

  // Fetch initial data
  useEffect(() => {
    const loadInitialData = async () => {
      // Load email settings from localStorage
      const email = localStorage.getItem(EMAIL_STORAGE_KEY) || '';
      const password = localStorage.getItem(PASSWORD_STORAGE_KEY) || '';
      setEmailSettings({ email, password });

      if (onUpdateEmailSettings) {
        onUpdateEmailSettings({ email, password });
      }

      // Load version info
      try {
        const appVersion = await getVersion();
        setVersionInfo({
          version: appVersion,
          installDate: new Date().toISOString(),
          hasUpdate: false,
        });
      } catch (error) {
        console.error('Error fetching version:', error);
      }

      // Load academic years
      await fetchAcademicYears();
    };

    loadInitialData();
  }, []);

  // Fetch academic years from database
  const fetchAcademicYears = async () => {
    try {
      const years = await invoke<AcademicYear[]>('get_all_academic_years');
      const currentYear = await invoke<AcademicYear | null>('get_current_academic_year');
      const generatedYears = generateAcademicYears();
      
      setAcademicYearSettings(prev => ({
        ...prev,
        years: years || [],
        generatedYears,
        currentYear: currentYear?.academic_year || '',
        newYear: ''
      }));
    } catch (error) {
      console.error('Error fetching academic years:', error);
      setAcademicYearSettings(prev => ({
        ...prev,
        years: [],
        generatedYears: generateAcademicYears(),
        currentYear: '',
        newYear: ''
      }));
    }
  };

  const handleEmailChange = (field: keyof EmailSettings, value: string) => {
    const updatedSettings = { ...emailSettings, [field]: value };
    setEmailSettings(updatedSettings);
  };

  const handleNewYearChange = (value: string) => {
    setAcademicYearSettings(prev => ({
      ...prev,
      newYear: value
    }));
  };

  const handleEmailSubmit = () => {
    if (emailSettings.email && emailSettings.password) {
      localStorage.setItem(EMAIL_STORAGE_KEY, emailSettings.email);
      localStorage.setItem(PASSWORD_STORAGE_KEY, emailSettings.password);
      if (onUpdateEmailSettings) {
        onUpdateEmailSettings(emailSettings);
      }
      alert('Email settings saved successfully!');
    } else {
      alert('Please fill in both email and password fields');
    }
  };

  const handleAcademicYearSubmit = async () => {
    if (!academicYearSettings.newYear) {
      alert('Please select an academic year');
      return;
    }

    try {
      // Save to database
      await invoke('upsert_academic_year', { 
        year: academicYearSettings.newYear,
        setAsCurrent: true 
      });
      
      // Refresh the list
      await fetchAcademicYears();
      alert(`Academic year ${academicYearSettings.newYear} saved successfully!`);
    } catch (error) {
      console.error('Failed to save academic year:', error);
      alert('Failed to save academic year. It may already exist.');
    }
  };

  const handleSetCurrentYear = async (id: number) => {
    try {
      await invoke('set_current_academic_year', { id });
      await fetchAcademicYears();
      alert('Current academic year updated successfully!');
    } catch (error) {
      console.error('Failed to set current academic year:', error);
      alert('Failed to update current academic year');
    }
  };

  const handleDeleteYear = async (id: number) => {
    if (!confirm('Are you sure you want to delete this academic year? This action cannot be undone.')) {
      return;
    }
    
    try {
      await invoke('delete_academic_year', { id });
      await fetchAcademicYears();
      alert('Academic year deleted successfully!');
    } catch (error) {
      console.error('Failed to delete academic year:', error);
      alert('Failed to delete academic year');
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

  const handleEmailTabClick = () => setActiveTab('email');
  const handleSettingsTabClick = () => setActiveTab('settings');
  const handleAcademicYearTabClick = () => setActiveTab('academicYear');

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

  const renderEmailForm = () => (
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
        onClick={handleEmailSubmit}
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
  );

  const renderAcademicYearForm = () => (
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
        Academic Year Management
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="academic-year-label">Academic Year</InputLabel>
          <Select
            labelId="academic-year-label"
            value={academicYearSettings.newYear}
            onChange={(e) => handleNewYearChange(e.target.value)}
            label="Academic Year"
          >
            <MenuItem value="">
              <em>Select an academic year</em>
            </MenuItem>
            {Array.from(new Set([
              ...academicYearSettings.years.map(y => y.academic_year),
              ...academicYearSettings.generatedYears
            ])).map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          onClick={handleAcademicYearSubmit}
          fullWidth
          disabled={!academicYearSettings.newYear}
        >
          {academicYearSettings.years.some(y => y.academic_year === academicYearSettings.newYear) 
            ? 'Update Academic Year' 
            : 'Add Academic Year'}
        </Button>
      </Box>
      
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" gutterBottom>
          Current Academic Year
        </Typography>
        {academicYearSettings.currentYear ? (
          <Typography variant="body2" color="text.secondary" paragraph>
            {academicYearSettings.currentYear}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" paragraph>
            No academic year selected
          </Typography>
        )}
      </Box>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Available Academic Years
        </Typography>
        {academicYearSettings.years.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No academic years available. Please add one.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {academicYearSettings.years.map((year) => (
              <Box 
                key={year.id} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body2">
                  {year.academic_year} {year.status === 'active' && '(Current)'}
                </Typography>
                <Box>
                  {year.status !== 'active' && (
                    <Button 
                      size="small" 
                      onClick={() => handleSetCurrentYear(year.id)}
                      sx={{ mr: 1 }}
                    >
                      Set Current
                    </Button>
                  )}
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteYear(year.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );

  const renderActiveForm = () => {
    switch (activeTab) {
      case 'email':
        return renderEmailForm();
      case 'academicYear':
        return renderAcademicYearForm();
      default:
        return null;
    }
  };

  const renderContent = () => (
    <Box sx={{ p: 3, flex: 1 }} />
  );

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
          {renderActiveForm()}
          <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
            {renderContent()}
          </Box>
        </LayoutSection>
      </Dialog>
    </>
  );
}