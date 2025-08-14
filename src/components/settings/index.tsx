import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { openPath } from '@tauri-apps/plugin-opener';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OpenInNewIcon from '@mui/icons-material/OpenInNew'; 
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { LayoutSection } from 'src/layouts/core/layout-section';

import { Iconify } from 'src/components/iconify';

type SettingTab = 'settings' | 'email' | 'academicYear' | 'feesStructure' | 'feesType' | 'feesSection';

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

type FeeItem = {
  fee_type: string;
  amount: number;
  start_date: string;
  end_date: string;
  late_payment_penalty: string;
};

type FeeStructure = {
  id: string;
  category: string;
  fee_items: FeeItem[];
};

type FeeType = {
  id: number | null;  // Match Rust's Option<i64>
  name: string;
  value: string;
};

type FeeSection = {
  id: number | null;  // Match Rust's Option<i64>
  name: string;
};


const FEE_TYPES_KEY = 'feeTypes';
const FEE_SECTIONS_KEY = 'feeSections';
const EMAIL_STORAGE_KEY = 'app_email';
const PASSWORD_STORAGE_KEY = 'app_password';
const FEE_STRUCTURES_KEY = 'feeStructures';

export function Settings({ 
  onUpdateEmailSettings, 
  onClose,
  initialActiveTab = 'email',
  editingFee
}: {
  onUpdateEmailSettings?: (settings: EmailSettings) => void;
  onClose?: () => void;
  initialActiveTab?: SettingTab;
  editingFee?: FeeStructure | null;
}) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [rotateIcon, setRotateIcon] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>(initialActiveTab);
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  // Fees state
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [categoryFeeMap, setCategoryFeeMap] = useState<Record<string, FeeItem[]>>({});
  const [currentCategory, setCurrentCategory] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [amount, setAmount] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [penalty, setPenalty] = useState('5');
  const [feeError, setFeeError] = useState('');

  // Fees Type state
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [newFeeType, setNewFeeType] = useState<Omit<FeeType, 'id'> & { id: number | null }>({ 
    id: null, 
    name: "", 
    value: "" 
  });

  // Fees Section state
  const [feeSections, setFeeSections] = useState<FeeSection[]>([]);
  const [newFeeSection, setNewFeeSection] = useState<Omit<FeeSection, 'id'> & { id: number | null }>({ 
    id: null, 
    name: "" 
  });

  // Initialize with editing fee data if provided
  useEffect(() => {
    if (editingFee) {
      const feeMap: Record<string, FeeItem[]> = {};
      feeMap[editingFee.category] = editingFee.fee_items;
      setCategoryFeeMap(feeMap);
      setCurrentCategory(editingFee.category);
    } else {
      resetFeeForm();
    }
  }, [editingFee]);

  // Generate academic years from current year -3 to current year +3
  const generateAcademicYears = (): string[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = -3; i <= 3; i++) {
      years.push(`${currentYear + i}-${currentYear + i + 1}`);
    }
    
    return years;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load fee types with type assertion
        const types = await invoke<FeeType[]>("get_fee_types");
        setFeeTypes(types);
        
        // Load fee sections with type assertion
        const sections = await invoke<FeeSection[]>("get_fee_sections");
        setFeeSections(sections);
        
        // Load other data...
      } catch (error) {
        console.error('Error loading data:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load data',
          severity: 'error'
        });
      }
    };
    
    loadData();
  }, []);

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

      // Load fee structures from localStorage
      const savedFees = localStorage.getItem(FEE_STRUCTURES_KEY);
      if (savedFees) {
        setFeeStructures(JSON.parse(savedFees));
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
      setSnackbar({
        open: true,
        message: 'Email settings saved successfully!',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Please fill in both email and password fields',
        severity: 'error'
      });
    }
  };

  const handleAcademicYearSubmit = async () => {
    if (!academicYearSettings.newYear) {
      setSnackbar({
        open: true,
        message: 'Please select an academic year',
        severity: 'error'
      });
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
      setSnackbar({
        open: true,
        message: `Academic year ${academicYearSettings.newYear} saved successfully!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save academic year:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save academic year. It may already exist.',
        severity: 'error'
      });
    }
  };

  const handleSetCurrentYear = async (id: number) => {
    try {
      await invoke('set_current_academic_year', { id });
      await fetchAcademicYears();
      setSnackbar({
        open: true,
        message: 'Current academic year updated successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to set current academic year:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update current academic year',
        severity: 'error'
      });
    }
  };

  const handleDeleteYear = async (id: number) => {
    if (!confirm('Are you sure you want to delete this academic year? This action cannot be undone.')) {
      return;
    }
    
    try {
      await invoke('delete_academic_year', { id });
      await fetchAcademicYears();
      setSnackbar({
        open: true,
        message: 'Academic year deleted successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to delete academic year:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete academic year',
        severity: 'error'
      });
    }
  };

  const handleHelpClick = async () => {
    try {
      await openPath('https://support.google.com/accounts/answer/185833?hl=en');
    } catch (error) {
      console.error('Failed to open help link:', error);
      setSnackbar({
        open: true,
        message: 'Failed to open help link',
        severity: 'error'
      });
    }
  };

  const toggleDialog = () => {
    setOpen(prevOpen => !prevOpen);
    setRotateIcon(prevRotate => !prevRotate);
  };

  const handleClose = () => {
    setOpen(false);
    setRotateIcon(false);
    if (onClose) {
      onClose();
    }
  };

  const resetFeeForm = () => {
    setCategoryFeeMap({});
    setCurrentCategory('');
    setSelectedFeeType('');
    setAmount(0);
    setStartDate(null);
    setEndDate(null);
    setPenalty('5');
    setFeeError('');
  };

  const addFeeItem = () => {
    if (!currentCategory || !selectedFeeType || !amount || !startDate || !endDate) {
      setFeeError('All fields are required');
      setSnackbar({
        open: true,
        message: 'Warning: Please fill all required fields',
        severity: 'warning'
      });
      return;
    }

    const newItem: FeeItem = {
      fee_type: selectedFeeType,
      amount,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      late_payment_penalty: `${penalty}%`,
    };

    const existingItems = categoryFeeMap[currentCategory] || [];

    if (existingItems.some(item => item.fee_type === selectedFeeType)) {
      setFeeError('This fee type already exists for this category');
      setSnackbar({
        open: true,
        message: 'Warning: This fee type already exists for the selected category',
        severity: 'warning'
      });
      return;
    }

    setCategoryFeeMap({
      ...categoryFeeMap,
      [currentCategory]: [...existingItems, newItem]
    });

    setSelectedFeeType('');
    setAmount(0);
    setStartDate(null);
    setEndDate(null);
    setPenalty('5');
    setFeeError('');
  };

  const submitFeeForm = async () => {
  if (Object.keys(categoryFeeMap).length === 0) {
    setFeeError('At least one category with fee items is required');
    setSnackbar({
      open: true,
      message: 'Error: Please add at least one fee item',
      severity: 'error'
    });
    return;
  }

  try {
    // Convert our frontend data structure to match the Rust FeeStructure type
    for (const [category, feeItems] of Object.entries(categoryFeeMap)) {
      for (const feeItem of feeItems) {
        const feeStructureData = {
          id: editingFee?.id || null, // Pass null for new entries
          student_category: category,
          fee_type: feeItem.fee_type,
          monthly: feeItem.amount, // Assuming amount is monthly
          yearly: feeItem.amount * 12, // Calculate yearly from monthly
          late_payment_penalty_pct: parseFloat(feeItem.late_payment_penalty.replace('%', '')),
        };

        // Call the Tauri command to save to database
        await invoke("save_fee_structure", { feeStructure: feeStructureData });
      }
    }
    
    // Dispatch custom event with the success message
    window.dispatchEvent(new CustomEvent('feeStructureUpdated', {
      detail: {
        message: editingFee 
          ? 'Fee structure updated successfully!' 
          : 'Fee structure created successfully!',
        severity: 'success'
      }
    }));

    // Close the form
    resetFeeForm();
    handleClose();
  } catch (error) {
    setSnackbar({
      open: true,
      message: 'Error saving fee structure',
      severity: 'error'
    });
    console.error('Failed to save fee structure:', error);
  }
};

  // Add Fee Type
  const handleAddOrUpdateFeeType = async () => {
    if (!newFeeType.name.trim()) {
      setSnackbar({
        open: true,
        message: 'Fee type name is required',
        severity: 'error'
      });
      return;
    }

    try {
      const payload = {
        id: newFeeType.id || null,
        name: newFeeType.name,
        value: newFeeType.value || newFeeType.name.toLowerCase().replace(/\s+/g, "_")
      };

      await invoke("save_fee_type", { feeType: payload });
      
      // Refresh the list
      const updated = await invoke<FeeType[]>("get_fee_types");
setFeeTypes(updated);
      
      // Reset form
      setNewFeeType({ id: null, name: "", value: "" });
      
      setSnackbar({
        open: true,
        message: 'Fee type saved successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save fee type:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save fee type. It may already exist.',
        severity: 'error'
      });
    }
  };

  const handleEditFeeType = (type: FeeType) => {
    setNewFeeType({
      id: type.id,
      name: type.name,
      value: type.value
    });
  };

  const handleDeleteFeeType = async (id: number | null) => {
  if (id === null) return;
  if (!confirm('Are you sure you want to delete this fee type?')) {
    return;
  }

  try {
    await invoke("delete_fee_type", { id });
    const updated = await invoke<FeeType[]>("get_fee_types");
    setFeeTypes(updated);
    setSnackbar({
      open: true,
      message: 'Fee type deleted successfully!',
      severity: 'success'
    });
  } catch (error) {
    console.error('Failed to delete fee type:', error);
    setSnackbar({
      open: true,
      message: 'Failed to delete fee type. It may be in use.',
      severity: 'error'
    });
  }
};
  // Add Fee Section
const handleAddOrUpdateFeeSection = async () => {
  if (!newFeeSection.name.trim()) {
    setSnackbar({
      open: true,
      message: 'Fee section name is required',
      severity: 'error'
    });
    return;
  }

  try {
    const payload = {
      id: newFeeSection.id || null,
      name: newFeeSection.name
    };

    await invoke("save_fee_section", { feeSection: payload });
    
    // Refresh the list with proper typing
    const updated = await invoke<FeeSection[]>("get_fee_sections");
    setFeeSections(updated);
    
    // Reset form
    setNewFeeSection({ id: null, name: "" });
    
    setSnackbar({
      open: true,
      message: 'Fee section saved successfully!',
      severity: 'success'
    });
  } catch (error) {
    console.error('Failed to save fee section:', error);
    setSnackbar({
      open: true,
      message: 'Failed to save fee section. It may already exist.',
      severity: 'error'
    });
  }
};

  const handleEditFeeSection = (section: FeeSection) => {
    setNewFeeSection({
      id: section.id,
      name: section.name
    });
  };

  const handleDeleteFeeSection = async (id: number | null) => {
  if (id === null) return;
  if (!confirm('Are you sure you want to delete this fee section?')) {
    return;
  }

  try {
    await invoke("delete_fee_section", { id });
    const updated = await invoke<FeeSection[]>("get_fee_sections");
    setFeeSections(updated);
    setSnackbar({
      open: true,
      message: 'Fee section deleted successfully!',
      severity: 'success'
    });
  } catch (error) {
    console.error('Failed to delete fee section:', error);
    setSnackbar({
      open: true,
      message: 'Failed to delete fee section. It may be in use.',
      severity: 'error'
    });
  }
};

  const handleEmailTabClick = () => setActiveTab('email');
  const handleSettingsTabClick = () => setActiveTab('settings');
  const handleAcademicYearTabClick = () => setActiveTab('academicYear');
  const handleFeesStructureTabClick = () => setActiveTab('feesStructure');
  const handleFeesTypeTabClick = () => setActiveTab('feesType');
  const handleFeesSectionTabClick = () => setActiveTab('feesSection');

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

        <Box
          onClick={handleFeesStructureTabClick}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ...(activeTab === 'feesStructure' && {
              bgcolor: 'action.selected',
              color: 'primary.main',
            }),
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Iconify icon="solar:dollar-bold" width={20} />
          <Typography variant="body2">Fees Structure</Typography>
        </Box>

        <Box
          onClick={handleFeesTypeTabClick}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ...(activeTab === 'feesType' && {
              bgcolor: 'action.selected',
              color: 'primary.main',
            }),
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Iconify icon="solar:list-check-bold" width={20} />
          <Typography variant="body2">Fees Type</Typography>
        </Box>

        <Box
          onClick={handleFeesSectionTabClick}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ...(activeTab === 'feesSection' && {
              bgcolor: 'action.selected',
              color: 'primary.main',
            }),
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Iconify icon="solar:layers-bold" width={20} />
          <Typography variant="body2">Fees Section</Typography>
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
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100% - 100px)',
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
      
      <Box sx={{ mt: 3, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
          <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
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

  const renderFeesForm = () => (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 15,
        width: 570,
        bgcolor: 'background.paper',
        boxShadow: 1,
        p: 2,
        borderRadius: 1,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        height: Object.keys(categoryFeeMap).length > 0 ? 'calc(100% - 70px)' : 'auto',
        maxHeight: 'none',
      }}
    >
      <Typography variant="h6" gutterBottom>
        {editingFee ? 'Edit Fee Structure' : 'Create New Fee Structure'}
      </Typography>
      
      {feeError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFeeError('')}>
          {feeError}
        </Alert>
      )}

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Section</InputLabel>
          <Select
            value={currentCategory}
            label="Section"
            onChange={(e) => setCurrentCategory(e.target.value)}
            disabled={!!editingFee}
          >
            {feeSections.map(section => (
              <MenuItem key={section.id} value={section.name}>
                {section.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Fee Type</InputLabel>
            <Select
              value={selectedFeeType}
              label="Fee Type"
              onChange={(e) => setSelectedFeeType(e.target.value)}
            >
              {feeTypes.map(type => (
                <MenuItem key={type.id} value={type.value}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            fullWidth
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <TextField
            label="Late Penalty (%)"
            value={penalty}
            onChange={(e) => setPenalty(e.target.value)}
            fullWidth
          />
        </Stack>

        <Button
          variant="contained"
          onClick={addFeeItem}
          disabled={!currentCategory || !selectedFeeType || !amount || !startDate || !endDate}
          fullWidth
          sx={{ mb: 1 }}
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          Add Fee Item
        </Button>

        {Object.keys(categoryFeeMap).length > 0 && (
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 60,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 1,
          }}>
            <Box sx={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
              <Table stickyHeader sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Section</TableCell>
                    <TableCell>Fee Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Penalty</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(categoryFeeMap).flatMap(([category, items]) =>
                    items.map((item, index) => (
                      <TableRow key={`${category}-${item.fee_type}-${index}`}>
                        <TableCell>{category}</TableCell>
                        <TableCell>
                          {feeTypes.find(ft => ft.value === item.fee_type)?.name || item.fee_type}
                        </TableCell>
                        <TableCell>₹{item.amount}</TableCell>
                        <TableCell>{item.start_date}</TableCell>
                        <TableCell>{item.end_date}</TableCell>
                        <TableCell>{item.late_payment_penalty}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => {
                              const updatedItems = items.filter((_, i) => i !== index);
                              setCategoryFeeMap(prev => ({
                                ...prev,
                                [category]: updatedItems
                              }));
                            }}
                            color="error"
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        <Button
          variant="contained"
          onClick={submitFeeForm}
          fullWidth
          disabled={Object.keys(categoryFeeMap).length === 0}
          sx={{ 
            mt: Object.keys(categoryFeeMap).length > 0 ? 'auto' : 0,
            mb: 1 
          }}
        >
          {editingFee ? 'Update Fee Structure' : 'Save Fee Structure'}
        </Button>
      </LocalizationProvider>
    </Box>
  );

  const renderFeesTypeForm = () => (
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
      <Typography variant="h6" gutterBottom>
        Fee Types Management
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Fee Type Name"
          value={newFeeType.name}
          onChange={(e) => setNewFeeType({ ...newFeeType, name: e.target.value })}
          fullWidth
        />
        <TextField
          label="Value (auto-generated)"
          value={newFeeType.value || newFeeType.name.toLowerCase().replace(/\s+/g, "_")}
          onChange={(e) => setNewFeeType({ ...newFeeType, value: e.target.value })}
          fullWidth
          placeholder="Will be auto-generated if empty"
        />
      </Stack>

      <Button
        variant="contained"
        onClick={handleAddOrUpdateFeeType}
        fullWidth
        sx={{ mb: 3 }}
        disabled={!newFeeType.name.trim()}
      >
        {newFeeType.id ? 'Update Fee Type' : 'Add Fee Type'}
      </Button>

      {newFeeType.id && (
        <Button
          variant="outlined"
          onClick={() => setNewFeeType({ id: null, name: "", value: "" })}
          fullWidth
          sx={{ mb: 3 }}
        >
          Cancel Edit
        </Button>
      )}

      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Value</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feeTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell>{type.name}</TableCell>
                <TableCell>{type.value}</TableCell>
                <TableCell align="right">
                 <IconButton
  onClick={() => {
    if (type.id !== null) {
      handleDeleteFeeType(type.id);
    }
  }}
  color="error"
  disabled={type.id === null}
>
  <Iconify icon="solar:trash-bin-trash-bold" width={20} />
</IconButton>
                  <IconButton
                    onClick={() => handleDeleteFeeType(type.id)}
                    color="error"
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );

  const renderFeesSectionForm = () => (
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
      <Typography variant="h6" gutterBottom>
        Fee Sections Management
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Section Name"
          value={newFeeSection.name}
          onChange={(e) => setNewFeeSection({ ...newFeeSection, name: e.target.value })}
          fullWidth
        />
        <Button
          variant="contained"
          onClick={handleAddOrUpdateFeeSection}
          sx={{ width: 150 }}
          disabled={!newFeeSection.name.trim()}
        >
          {newFeeSection.id ? 'Update' : 'Add'}
        </Button>
        {newFeeSection.id && (
          <Button
            variant="outlined"
            onClick={() => setNewFeeSection({ id: null, name: "" })}
            sx={{ width: 150 }}
          >
            Cancel
          </Button>
        )}
      </Stack>

      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Section Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feeSections.map((section) => (
              <TableRow key={section.id}>
                <TableCell>{section.name}</TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => handleEditFeeSection(section)}
                    sx={{ mr: 1 }}
                  >
                    <Iconify icon="solar:pen-bold" width={20} />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteFeeSection(section.id)}
                    color="error"
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );

  const renderActiveForm = () => {
    switch (activeTab) {
      case 'email':
        return renderEmailForm();
      case 'academicYear':
        return renderAcademicYearForm();
      case 'feesStructure':
        return renderFeesForm();
      case 'feesType':
        return renderFeesTypeForm();
      case 'feesSection':
        return renderFeesSectionForm();
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
          top: 15,
          right: 160,
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
            height: '90vh',
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}