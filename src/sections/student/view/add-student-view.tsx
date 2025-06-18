import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useParams, useNavigate } from 'react-router-dom';

import {
  Box, Stepper, Step, StepLabel, Stack, Button, TextField,
  Typography, MenuItem, Snackbar, Alert, Card
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

export type Student = {
  id?: number;
  full_name: string;
  gender: string;
  dob: string;
  aadhaar_no?: string;
  religion: string;
  caste: string;
  nationality: string;
  prev_school?: string;
  last_class?: string;
  admission_date: string;
  class_id: string;
  address: string;
  father_name: string;
  mother_name: string;
  father_occupation?: string;
  mother_occupation?: string;
  father_education?: string;
  mother_education?: string;
  mobile_number: string;
  email?: string;
  emergency_contact?: string;
  documents?: string[];
  status: string;
  created_at?: string;
};

const INITIAL_VALUES: Student = {
  full_name: '', gender: '', dob: '',
  religion: '', caste: '', nationality: 'Indian', admission_date: '',
  class_id: '', address: '', father_name: '', mother_name: '',
  mobile_number: '', status: 'active',
};

const REQUIRED_FIELDS: Record<number, (keyof Student)[]> = {
  0: ['full_name', 'gender', 'dob', 'mobile_number', 'address'],
  1: ['father_name', 'mother_name', 'father_occupation', 'mother_occupation', 'father_education', 'mother_education', 'emergency_contact'],
  2: ['admission_date', 'class_id', 'status'],
};

const STATUS_OPTIONS = ['active', 'inactive', 'alumni'];

export function AddStudentView({ editingStudent }: { editingStudent?: Student | null }) {
  const [formData, setFormData] = useState<Student>(INITIAL_VALUES);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Student, string>>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [classOptions, setClassOptions] = useState<{ id: number, class_name: string }[]>([]);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const numericId = parseInt(id || '', 10);

      if (editingStudent) {
        setFormData({ ...editingStudent });
        setStudentId(editingStudent.id ?? null);
      } else if (id && !isNaN(numericId)) {
        try {
          const [s1, s2, s3] = await Promise.all([
            invoke<any>('get_student1', { id: numericId }),
            invoke<any>('get_student2', { id: numericId }),
            invoke<any>('get_student3', { id: numericId }),
          ]);
          setFormData({ ...s1, ...s2, ...s3, id: numericId });
          setStudentId(numericId);
        } catch (err) {
          console.error("Failed to fetch student data", err);
        }
      }

      try {
        const classes = await invoke<{ id: number, class_name: string }[]>('get_all_classes');
        setClassOptions(classes);
      } catch (error) {
        console.error("Failed to fetch class list", error);
      }
    };
    init();
  }, [id, editingStudent]);

  const validateField = (field: keyof Student, value: string) => {
    if (!value) return `${field} is required`;
    switch (field) {
  case 'full_name':
  case 'father_name':
  case 'mother_name':
    if (!/^[A-Za-z\s]+$/.test(value)) return `${field} should only contain letters`;
    break;
  case 'mobile_number':
    if (!/^\d{10}$/.test(value)) return 'Mobile number must be 10 digits';
    break;
  case 'aadhaar_no':
    if (value && !/^\d{12}$/.test(value)) return 'Aadhaar number must be 12 digits';
    break;
  case 'email':
    if (value && !/\S+@\S+\.\S+/.test(value)) return 'Invalid email';
    break;
  case 'dob':
  case 'admission_date':
    if (new Date(value).toString() === 'Invalid Date') return 'Invalid date';
    break;
  default:
    break; // ✅ Added to satisfy ESLint's `default-case` rule
}
return '';

  };

  const validateStep = () => {
    const newErrors: Partial<Record<keyof Student, string>> = {};
    REQUIRED_FIELDS[activeStep].forEach(field => {
      const error = validateField(field, String(formData[field]));
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Student) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, String(value)) }));
    }
  };

  const handleBlur = (field: keyof Student) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, String(formData[field])) }));
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    try {
      if (activeStep === 0) {
        const newId = await invoke<number>('create_student1', { student: formData });
        setStudentId(newId);
        setFormData(prev => ({ ...prev, id: newId }));
      } else if (activeStep === 1 && studentId) {
        await invoke('create_student2', { student: { ...formData, id: studentId } });
      }
      setActiveStep(prev => prev + 1);
    } catch (error) {
      console.error('Step save error:', error);
      setSnackbar({ open: true, message: 'Failed to save data.', severity: 'error' });
    }
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!validateStep()) return;
    try {
      await invoke('create_student3', { student: { ...formData, id: studentId, class_id: Number(formData.class_id) } });
      setSnackbar({ open: true, message: 'Student saved!', severity: 'success' });
      navigate('/dashboard/students');
    } catch (err) {
      console.error('Submit error:', err);
      setSnackbar({ open: true, message: 'Submission failed', severity: 'error' });
    }
  };

  const renderTextField = (label: string, field: keyof Student, type = 'text', multiline = false) => (
    <TextField
      label={label}
      value={formData[field] ?? ''}
      onChange={handleChange(field)}
      onBlur={handleBlur(field)}
      fullWidth
      error={!!errors[field]}
      helperText={errors[field]}
      type={type}
      multiline={multiline}
      rows={multiline ? 4 : 1}
    />
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={2}>
            {renderTextField('Full Name *', 'full_name')}
            <Stack direction="row" spacing={2}>
              <TextField select label="Gender *" value={formData.gender} onChange={handleChange('gender')} fullWidth>
                {['male', 'female'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
              <TextField fullWidth type="date" label="Date of Birth *" value={formData.dob} onChange={handleChange('dob')} InputLabelProps={{ shrink: true }} />
            </Stack>
            {renderTextField('Aadhaar No', 'aadhaar_no')}
            <Stack direction="row" spacing={2}>
              {renderTextField('Religion', 'religion')}
              {renderTextField('Caste', 'caste')}
              {renderTextField('Nationality', 'nationality')}
            </Stack>
            <Stack direction="row" spacing={2}>
              {renderTextField('Mobile Number *', 'mobile_number')}
              {renderTextField('Email', 'email')}
            </Stack>
            {renderTextField('Address *', 'address', 'text', true)}
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              {renderTextField("Father's Name", 'father_name')}
              {renderTextField("Mother's Name", 'mother_name')}
            </Stack>
            <Stack direction="row" spacing={2}>
              {renderTextField("Father's Occupation", 'father_occupation')}
              {renderTextField("Mother's Occupation", 'mother_occupation')}
            </Stack>
            <Stack direction="row" spacing={2}>
              {renderTextField("Father's Education", 'father_education')}
              {renderTextField("Mother's Education", 'mother_education')}
            </Stack>
            {renderTextField("Emergency Contact", 'emergency_contact')}
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              {renderTextField('Previous School', 'prev_school')}
              {renderTextField('Last Class', 'last_class')}
            </Stack>
            <TextField fullWidth type="date" label="Admission Date" value={formData.admission_date} onChange={handleChange('admission_date')} InputLabelProps={{ shrink: true }} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Class *" value={formData.class_id} onChange={handleChange('class_id')} fullWidth>
                {classOptions.map(cls => (
                  <MenuItem key={cls.id} value={cls.id}>{cls.class_name}</MenuItem>
                ))}
              </TextField>
              <TextField select label="Status" value={formData.status} onChange={handleChange('status')} fullWidth>
                {STATUS_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
            </Stack>
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>Student Management</Typography>
      </Box>
      <Card sx={{ p: 4, mt: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {['Personal Info', 'Guardian Info', 'Background Info'].map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        {renderStepContent()}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={activeStep === 0} onClick={handleBack}>Back</Button>
          {activeStep === 2 ? (
            <Button variant="contained" onClick={handleSubmit} size="large">Submit</Button>
          ) : (
            <Button variant="contained" onClick={handleNext} size="large">Next</Button>
          )}
        </Box>
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Card>
    </DashboardContent>
  );
}
