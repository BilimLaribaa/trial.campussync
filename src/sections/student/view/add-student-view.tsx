import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';

import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import {
  Box, Stepper, Step, StepLabel, Stack, Button, TextField, Container,
  Typography, MenuItem, Snackbar, Alert,
  Card, Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip, Paper, LinearProgress
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

export type StudentStep1 = {
  id?: number;
  gr_number: string;
  roll_number: string;
  full_name: string;
  dob: string;
  gender: string;
  mother_name: string;
  mother_occupation?: string;
  father_name: string;
  father_occupation?: string;
  annual_income?: number;
  nationality?: string;
  profile_image: string;
  class_id: string;
  section?: string;
  academic_year?: string;
};

export type StudentStep2 = {
  id?: number;
  email: string;
  mobile_number?: string;
  alternate_contact_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  guardian_contact_info?: string;
};

export type StudentStep3 = {
  id?: number;
  blood_group?: string;
  status?: string;
  admission_date?: string;
  weight_kg?: number;
  height_cm?: number;
  hb_range?: string;
  medical_conditions?: string;
  emergency_contact_person?: string;
  emergency_contact?: string;
};

export type StudentStep4 = {
  id?: number;
  birth_certificate?: string;
  transfer_certificate?: string;
  previous_academic_records?: string;
  address_proof?: string;
  id_proof?: string;
  passport_photo?: string;
  medical_certificate?: string;
  other_documents?: string;
  vaccination_certificate?: string;
};

export type Student = StudentStep1 & StudentStep2 & StudentStep3 & StudentStep4;

const INITIAL_VALUES: Student = {
  id: undefined,
  gr_number: '',
  roll_number: '',
  full_name: '',
  dob: '',
  gender: '',
  mother_name: '',
  mother_occupation: undefined,
  father_name: '',
  father_occupation: undefined,
  annual_income: undefined,
  nationality: 'Indian',
  profile_image: '',
  class_id: '',
  section: '',
  academic_year: new Date().getFullYear().toString(),

  email: '',
  mobile_number: '',
  alternate_contact_number: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postal_code: '',
  guardian_contact_info: '',

  blood_group: '',
  status: 'active',
  admission_date: '',
  weight_kg: undefined,
  height_cm: undefined,
  hb_range: '',
  medical_conditions: '',
  emergency_contact_person: '',
  emergency_contact: '',

  birth_certificate: '',
  transfer_certificate: '',
  previous_academic_records: '',
  address_proof: '',
  id_proof: '',
  passport_photo: '',
  medical_certificate: '',
  vaccination_certificate: '',
  other_documents: ''
};

const REQUIRED_FIELDS: Record<number, (keyof Student)[]> = {
  0: ['gr_number', 'full_name', 'gender', 'class_id', 'mother_name', 'father_name'],
  1: ['email', 'mobile_number'],
  2: ['status', 'emergency_contact'],
  3: []
};

const STATUS_OPTIONS = ['active', 'inactive', 'alumni'];
const GENDER_OPTIONS = ['male', 'female', 'other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

type AddStudentViewProps = {
  editingStudent?: Student | null;
};

type FileObject = {
  file: File;
  preview: string;
};

type StudentStringKeys = {
  [K in keyof Student]: Student[K] extends string | undefined ? K : never
}[keyof Student];

export function AddStudentView({ editingStudent = null }: AddStudentViewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<string>('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'unsupported'>('unsupported');
  const [previewFileName, setPreviewFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [classOptions, setClassOptions] = useState<{ id: number, class_name: string }[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>(['A', 'B', 'C', 'D']);

  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Student>(() => {
    if (editingStudent) {
      return {
        ...editingStudent,
        roll_number: editingStudent.roll_number || '',
        dob: editingStudent.dob || '',
        profile_image: editingStudent.profile_image || ''
      };
    }
    return INITIAL_VALUES;
  });
  
  const [studentId, setStudentId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Student, string>>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fileObjects, setFileObjects] = useState<Record<string, FileObject>>({});

  const handleFileUpload = async (field: keyof Student, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = Array.from(new Uint8Array(arrayBuffer));
      
      const fileName = await invoke<string>('upload_student_file', {
        id: formData.id || studentId,
        fileName: file.name,
        fileBytes,
      });
      
      setFormData(prev => ({
        ...prev,
        [field]: fileName
      }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setFileObjects(prev => ({
            ...prev,
            [field]: { file, preview: result }
          }));
        }
      };
      
      if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        reader.readAsDataURL(file);
      } else if (extension === 'pdf') {
        reader.readAsDataURL(file);
      }
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setSnackbar({ open: true, message: 'Failed to upload file', severity: 'error' });
    }
  };

  const handlePreview = (field: keyof Student) => {
    const fileObj = fileObjects[field as string];
    if (!fileObj) return;

    const extension = fileObj.file.name.split('.').pop()?.toLowerCase();
    let fileType: 'image' | 'pdf' | 'unsupported' = 'unsupported';

    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      fileType = 'image';
    } else if (extension === 'pdf') {
      fileType = 'pdf';
    }

    setPreviewType(fileType);
    setPreviewData(fileObj.preview);
    setPreviewFileName(fileObj.file.name);
    setPreviewOpen(true);
  };

  const handleDownload = () => {
    if (!previewData) return;

    try {
      const link = document.createElement('a');
      link.href = previewData;
      link.download = previewFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({ open: true, message: 'File download initiated', severity: 'success' });
    } catch (error) {
      console.error('Error downloading file:', error);
      setSnackbar({ open: true, message: 'Failed to download file', severity: 'error' });
    }
  };

  useEffect(() => {
    const init = async () => {
      const numericId = parseInt(id || '', 10);

      try {
        const classes = await invoke<{ id: number, class_name: string }[]>('get_all_classes');
        setClassOptions(classes);

        if (!editingStudent && id) {
          try {
            const [s1, s2, s3, s4] = await Promise.all([
              invoke<StudentStep1>('get_student1', { id: numericId }),
              invoke<StudentStep2>('get_student2', { id: numericId }),
              invoke<StudentStep3>('get_student3', { id: numericId }),
              invoke<StudentStep4>('get_student4', { id: numericId }),
            ]);

            setFormData({
              ...s1,
              ...s2,
              ...s3,
              ...s4,
              id: numericId,
              class_id: s1.class_id.toString(),
              roll_number: s1.roll_number || '',
              dob: s1.dob || '',
              profile_image: s1.profile_image || ''
            });
            setStudentId(numericId);
          } catch (err) {
            console.error("Failed to fetch student for edit", err);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    init();
  }, [id, editingStudent]);

  const validateField = (field: keyof Student, value: string | number | undefined) => {
    let errorMessage = '';
    const stringValue = value?.toString() || '';

    if (REQUIRED_FIELDS[activeStep].includes(field) && !stringValue) {
      errorMessage = `${field} is required`;
    } else if (stringValue && REQUIRED_FIELDS[activeStep].includes(field)) {
      switch (field) {
      case 'gr_number':
    if (!/^\d+$/.test(stringValue)) {
        errorMessage = 'GR Number must contain only numbers';
    }
    break;
        case 'full_name':
        case 'father_name':
        case 'mother_name':
          if (!/^[A-Za-z\s]+$/.test(stringValue)) {
            errorMessage = `${field} should only contain alphabetic characters`;
          }
          break;
        case 'mobile_number':
        case 'alternate_contact_number':
        case 'emergency_contact':
          if (!/^\d{10}$/.test(stringValue)) {
            errorMessage = 'Phone number must be 10 digits';
          }
          break;
        case 'email':
          if (!/\S+@\S+\.\S+/.test(stringValue)) {
            errorMessage = 'Invalid email format';
          }
          break;
        case 'postal_code':
          if (!/^\d{6}$/.test(stringValue)) {
            errorMessage = 'Postal code must be 6 digits';
          }
          break;
        case 'weight_kg':
        case 'height_cm':
          if (isNaN(Number(stringValue))) {
            errorMessage = 'Must be a number';
          }
          break;
        default:
          break;
      }
    }
    return errorMessage;
  };

  const validateStep = () => {
    const newErrors: Partial<Record<keyof Student, string>> = {};
    REQUIRED_FIELDS[activeStep].forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (activeStep === 0) {
      try {
        const newId = await invoke<number>('create_student1', {
          student: {
            id: formData.id || studentId || undefined,
            gr_number: formData.gr_number,
            roll_number: formData.roll_number || '',
            full_name: formData.full_name,
            dob: formData.dob || '',
            gender: formData.gender,
            mother_name: formData.mother_name,
            mother_occupation: formData.mother_occupation || undefined,
            father_name: formData.father_name,
            father_occupation: formData.father_occupation || undefined,
            annual_income: formData.annual_income || undefined,
            nationality: formData.nationality || 'Indian',
            profile_image: formData.profile_image || '',
            class_id: formData.class_id,
            section: formData.section || undefined,
            academic_year: formData.academic_year || undefined,
          },
        });
        setStudentId(newId);
        setFormData((prev) => ({ ...prev, id: newId }));
        setSnackbar({ open: true, message: 'General information saved!', severity: 'success' });
        setActiveStep(1);
      } catch (error) {
        console.error('Error saving general info:', error);
        setSnackbar({ open: true, message: 'Failed to save general info.', severity: 'error' });
      }
    } else if (activeStep === 1 && (formData.id || studentId)) {
      try {
        await invoke('create_student2', {
          student: {
            id: formData.id || studentId,
            email: formData.email,
            mobile_number: formData.mobile_number || undefined,
            alternate_contact_number: formData.alternate_contact_number || undefined,
            address: formData.address || undefined,
            city: formData.city || undefined,
            state: formData.state || undefined,
            country: formData.country || undefined,
            postal_code: formData.postal_code || undefined,
            guardian_contact_info: formData.guardian_contact_info || undefined,
          },
        });
        setSnackbar({ open: true, message: 'Contact information saved!', severity: 'success' });
        setActiveStep(2);
      } catch (error) {
        console.error('Error saving contact info:', error);
        setSnackbar({ open: true, message: 'Failed to save contact info.', severity: 'error' });
      }
    } else if (activeStep === 2 && (formData.id || studentId)) {
      try {
        await invoke('create_student3', {
          student: {
            id: formData.id || studentId,
            blood_group: formData.blood_group || undefined,
            status: formData.status || undefined,
            admission_date: formData.admission_date || undefined,
            weight_kg: formData.weight_kg || undefined,
            height_cm: formData.height_cm || undefined,
            hb_range: formData.hb_range || undefined,
            medical_conditions: formData.medical_conditions || undefined,
            emergency_contact_person: formData.emergency_contact_person || undefined,
            emergency_contact: formData.emergency_contact || undefined,
          },
        });
        setSnackbar({ open: true, message: 'Health & admission info saved!', severity: 'success' });
        setActiveStep(3);
      } catch (error) {
        console.error('Error saving health info:', error);
        setSnackbar({ open: true, message: 'Failed to save health info.', severity: 'error' });
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (isSubmitting) return;

    const finalId = formData.id;
    if (!finalId) {
      setSnackbar({ open: true, message: 'Missing student ID. Please complete Step 1.', severity: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const documentData = {
        id: finalId,
        birth_certificate: formData.birth_certificate || undefined,
        transfer_certificate: formData.transfer_certificate || undefined,
        previous_academic_records: formData.previous_academic_records || undefined,
        address_proof: formData.address_proof || undefined,
        id_proof: formData.id_proof || undefined,
        passport_photo: formData.passport_photo || undefined,
        medical_certificate: formData.medical_certificate || undefined,
        vaccination_certificate: formData.vaccination_certificate || undefined,
        other_documents: formData.other_documents || undefined,
      };

      await invoke('create_student4', { student: documentData });

      setSnackbar({ open: true, message: 'Student saved successfully!', severity: 'success' });
      navigate('/dashboard/students', { replace: true });
    } catch (error) {
      console.error('Error saving student:', error);
      setSnackbar({ open: true, message: 'Failed to save student.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof Student) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let value: string | number | undefined = event.target.value;

    if (field === 'annual_income') {
      value = value === '' ? undefined : parseFloat(value);
    } else if (['father_occupation', 'mother_occupation', 'section', 'academic_year', 'nationality'].includes(field)) {
      value = value === '' ? undefined : value;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value),
      }));
    }
  };

  const handleNumberChange = (field: keyof Student) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let value: string | number | undefined = event.target.value;
    
    // Special handling for GR number to keep it as string
    if (field === 'gr_number') {
        value = value === '' ? '' : value; // Keep as string
    } else {
        value = value === '' ? undefined : parseFloat(value);
    }
    
    setFormData((prev) => ({
        ...prev,
        [field]: value,
    }));

    if (touched[field]) {
        setErrors((prev) => ({
            ...prev,
            [field]: validateField(field, value),
        }));
    }
};

  const handleBlur = (field: keyof Student) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, formData[field]) }));
  };

  const renderTextField = (label: string, field: keyof Student, type = 'text', multiline: number | boolean = false) => (
    <TextField
      label={label}
      value={formData[field] ?? ''}
      onChange={handleChange(field)}
      onBlur={handleBlur(field)}
      fullWidth
      error={!!errors[field]}
      helperText={errors[field]}
      type={type}
      multiline={!!multiline}
      rows={typeof multiline === 'number' && multiline > 0 ? multiline : 1}
    />
  );

  const renderNumberField = (label: string, field: keyof Student) => (
    <TextField
        label={label}
        value={formData[field] ?? ''}
        onChange={field === 'gr_number' ? handleChange(field) : handleNumberChange(field)}
        onBlur={handleBlur(field)}
        fullWidth
        error={!!errors[field]}
        helperText={errors[field]}
        type={field === 'gr_number' ? 'text' : 'number'}
        inputProps={field === 'gr_number' ? { pattern: '\\d*' } : {}}
    />
);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return (
        <Stack spacing={2}>
          <Typography variant="h6" gutterBottom>General Information</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderNumberField('GR Number *', 'gr_number')}
            {renderTextField('Roll Number', 'roll_number')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('Full Name *', 'full_name')}
            <TextField
              select
              label="Gender *"
              value={formData.gender}
              onChange={handleChange('gender')}
              onBlur={handleBlur('gender')}
              fullWidth
              error={!!errors.gender}
              helperText={errors.gender}
            >
              {GENDER_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="date"
              label="Date of Birth"
              value={formData.dob || ''}
              onChange={handleChange('dob')}
              InputLabelProps={{ shrink: true }}
            />
            {renderTextField('Nationality', 'nationality')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField("Father's Name *", 'father_name')}
            {renderTextField("Mother's Name *", 'mother_name')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField("Father's Occupation", 'father_occupation')}
            {renderTextField("Mother's Occupation", 'mother_occupation')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderNumberField("Annual Income", 'annual_income')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Class *"
              value={formData.class_id}
              onChange={handleChange('class_id')}
              onBlur={handleBlur('class_id')}
              fullWidth
              error={!!errors.class_id}
              helperText={errors.class_id}
            >
              {classOptions.map(cls => (
                <MenuItem key={cls.id} value={cls.id.toString()}>
                  {cls.class_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Section"
              value={formData.section || ''}
              onChange={handleChange('section')}
              fullWidth
            >
              {sectionOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            {renderTextField('Academic Year', 'academic_year')}
          </Stack>
        </Stack>
      );
      case 1: return (
        <Stack spacing={2}>
          <Typography variant="h6" gutterBottom>Contact Information</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('Mobile Number *', 'mobile_number')}
            {renderTextField('Alternate Contact Number', 'alternate_contact_number')}
            {renderTextField('Email *', 'email')}
          </Stack>
          {renderTextField('Address', 'address', 'text', 3)}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('City', 'city')}
            {renderTextField('State', 'state')}
            {renderTextField('Country', 'country')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('Postal Code', 'postal_code')}
            {renderTextField('Guardian Contact Info', 'guardian_contact_info')}
          </Stack>
        </Stack>
      );
      case 2: return (
        <Stack spacing={2}>
          <Typography variant="h6" gutterBottom>Health & Admission Details</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Blood Group"
              value={formData.blood_group || ''}
              onChange={handleChange('blood_group')}
              fullWidth
            >
              {BLOOD_GROUPS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Status *"
              value={formData.status || ''}
              onChange={handleChange('status')}
              onBlur={handleBlur('status')}
              fullWidth
              error={!!errors.status}
              helperText={errors.status}
            >
              {STATUS_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="date"
              label="Admission Date"
              value={formData.admission_date || ''}
              onChange={handleChange('admission_date')}
              InputLabelProps={{ shrink: true }}
            />
            {renderNumberField('Weight (kg)', 'weight_kg')}
            {renderNumberField('Height (cm)', 'height_cm')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('HB Range', 'hb_range')}
            {renderTextField('Emergency Contact Person', 'emergency_contact_person')}
            {renderTextField('Emergency Contact *', 'emergency_contact')}
          </Stack>
          {renderTextField('Medical Conditions', 'medical_conditions', 'text', 3)}
        </Stack>
      );
      case 3: return (
        <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium' }}>
            Document Upload
          </Typography>

          {isSubmitting && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Uploading documents...
              </Typography>
              {Object.entries(uploadProgress).map(([field, progress]) => (
                <Box key={field} sx={{ mb: 2 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    {field}: {progress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              ))}
            </Box>
          )}

          <Stack spacing={3}>
            {[
              ['Birth Certificate', 'birth_certificate', '.pdf,.jpg,.jpeg,.png', 'Required'],
              ['Transfer Certificate', 'transfer_certificate', '.pdf,.jpg,.jpeg,.png', 'Required'],
              ['Previous Academic Records', 'previous_academic_records', '.pdf,.jpg,.jpeg,.png', 'Required'],
              ['Address Proof', 'address_proof', '.pdf,.jpg,.jpeg,.png', 'Required'],
              ['ID Proof', 'id_proof', '.pdf,.jpg,.jpeg,.png', 'Required'],
              ['Passport Photo', 'passport_photo', '.jpg,.jpeg,.png', 'Required'],
              ['Medical Certificate', 'medical_certificate', '.pdf,.jpg,.jpeg,.png', 'Optional'],
              ['Vaccination Certificate', 'vaccination_certificate', '.pdf,.jpg,.jpeg,.png', 'Optional'],
              ['Other Documents', 'other_documents', '.pdf,.jpg,.jpeg,.png', 'Optional']
            ].map(([label, field, accept, requirement]) => (
              <Paper key={field} elevation={1} sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="medium">
                      {label}
                    </Typography>
                    <Chip
                      label={requirement}
                      size="small"
                      color={requirement === 'Required' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </Stack>

                  <Box sx={{ mt: 1 }}>
                    {!formData[field as keyof Student] ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                        sx={{
                          py: 1.5,
                          borderStyle: 'dashed',
                          borderWidth: 1.5
                        }}
                        disabled={isSubmitting}
                      >
                        Click to upload
                        <input
                          type="file"
                          name={field}
                          hidden
                          accept={accept}
                          onChange={(e) => handleFileUpload(field as keyof Student, e.target.files)}
                        />
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={fileObjects[field] ? "Uploaded" : "Previously Uploaded"}
                          color={fileObjects[field] ? "success" : "default"}
                          variant="outlined"
                          onDelete={() => {
                            setFormData(prev => ({ ...prev, [field]: '' }));
                            const newFileObjects = { ...fileObjects };
                            delete newFileObjects[field];
                            setFileObjects(newFileObjects);
                          }}
                          deleteIcon={<CancelIcon />}
                        />
                        {(fileObjects[field] || formData[field as keyof Student]) && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handlePreview(field as keyof Student)}
                            startIcon={<VisibilityIcon />}
                            disabled={!fileObjects[field]}
                          >
                            View
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="text"
                          component="label"
                          startIcon={<ReplayIcon />}
                          disabled={isSubmitting}
                        >
                          Replace
                          <input
                            type="file"
                            hidden
                            accept={accept}
                            onChange={(e) => handleFileUpload(field as keyof Student, e.target.files)}
                          />
                        </Button>
                      </Stack>
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Accepted formats: {accept.replace(/,/g, ', ')}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Dialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Document Preview - {previewFileName}</DialogTitle>
            <DialogContent>
              {previewType === 'image' ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <img
                    src={previewData}
                    alt="Document Preview"
                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                  />
                </Box>
              ) : previewType === 'pdf' ? (
                <Box sx={{ height: '70vh' }}>
                  <iframe
                    src={previewData}
                    width="100%"
                    height="100%"
                    title="PDF Preview"
                    style={{ border: 'none' }}
                  />
                </Box>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Preview not available for this file type
                  </Typography>
                  <Typography variant="body1">
                    You can download the file to view it with an appropriate application.
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button
                variant="contained"
                onClick={handleDownload}
                startIcon={<DownloadIcon />}
                disabled={!previewData}
              >
                Download
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
      default: return null;
    }
  };

  return (
    <>
      <DashboardContent>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/dashboard/students')}
            sx={{ mr: 2 }}
          />
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            {editingStudent ? 'Edit Student' : 'Add New Student'}
          </Typography>
        </Box>

        <Card sx={{ p: 4, mt: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {['General Information', 'Contact Information', 'Health & Admission', 'Documents'].map((label, index) => (
              <Step key={label}>
                <StepLabel 
                  onClick={() => {
                    if (editingStudent || studentId) {
                      setActiveStep(index);
                    }
                  }}
                  sx={{
                    cursor: (editingStudent || studentId) ? 'pointer' : 'default',
                    '& .MuiStepLabel-label': {
                      fontWeight: activeStep === index ? 'bold' : 'normal',
                      color: activeStep === index ? 'primary.main' : 'text.secondary',
                    }
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
          {renderStepContent()}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0 || isSubmitting} onClick={handleBack}>Back</Button>
            {activeStep === 3
              ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  size="large"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingStudent ? 'Update' : 'Submit'}
                </Button>
              )
              : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  size="large"
                  disabled={isSubmitting}
                >
                  Next
                </Button>
              )}
          </Box>
          <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Card>
      </DashboardContent>
    </>
  );
}