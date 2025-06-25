import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';

import {
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon, Replay as ReplayIcon
} from '@mui/icons-material';
import {
  Box, Stepper, Step, StepLabel, Stack, Button, TextField, Container,
  Typography, MenuItem, Snackbar, Alert,
  Card, Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,Paper
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

export type Student = {
  id?: number;
  // General Information
  gr_number: string;
  student_id: string;
  roll_number: string;
  full_name: string;
  dob: string;
  gender: string;
  mother_name: string;
  father_name: string;
  nationality: string;
  profile_image: string;
  class_id: string;
  section: string;
  academic_year: string;

  // Contact Information
  email: string;
  mobile_number: string;
  alternate_contact_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  guardian_contact_info: string;

  // Health & Admission Details
  blood_group: string;
  status: string;
  admission_date: string;
  weight_kg: number;
  height_cm: number;
  hb_range: string;
  medical_conditions: string;
  emergency_contact_person: string;
  emergency_contact: string;

  // Documents
  birth_certificate: string;
  transfer_certificate: string;
  previous_academic_records: string;
  address_proof: string;
  id_proof: string;
  passport_photo: string;
  medical_certificate: string;
  vaccination_certificate: string;
  other_documents: string;
};

type StudentStep1 = Pick<Student,
  'id' | 'gr_number' | 'student_id' | 'roll_number' | 'full_name' |
  'dob' | 'gender' | 'mother_name' | 'father_name' | 'nationality' |
  'profile_image' | 'class_id' | 'section' | 'academic_year'
>;

type StudentStep2 = Pick<Student,
  'id' | 'email' | 'mobile_number' | 'alternate_contact_number' |
  'address' | 'city' | 'state' | 'country' | 'postal_code' | 'guardian_contact_info'
>;

type StudentStep3 = Pick<Student,
  'id' | 'blood_group' | 'status' | 'admission_date' | 'weight_kg' |
  'height_cm' | 'hb_range' | 'medical_conditions' | 'emergency_contact_person' | 'emergency_contact'
>;

type StudentStep4 = Pick<Student,
  'id' | 'birth_certificate' | 'transfer_certificate' | 'previous_academic_records' |
  'address_proof' | 'id_proof' | 'passport_photo' | 'medical_certificate' |
  'vaccination_certificate' | 'other_documents'
>;


const INITIAL_VALUES: Student = {
  // General Information
  gr_number: '',
  student_id: '',
  roll_number: '',
  full_name: '',
  dob: '',
  gender: '',
  mother_name: '',
  father_name: '',
  nationality: 'Indian',
  profile_image: '',
  class_id: '',
  section: '',
  academic_year: new Date().getFullYear().toString(),

  // Contact Information
  email: '',
  mobile_number: '',
  alternate_contact_number: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postal_code: '',
  guardian_contact_info: '',

  // Health & Admission
  blood_group: '',
  status: 'active',
  admission_date: '',
  weight_kg: 0,
  height_cm: 0,
  hb_range: '',
  medical_conditions: '',
  emergency_contact_person: '',
  emergency_contact: '',

  // Documents
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
  0: ['full_name', 'dob', 'gender', 'class_id', 'section', 'academic_year'],
  1: ['mobile_number', 'address', 'city', 'state', 'country'],
  2: ['status', 'admission_date', 'emergency_contact'],
  3: [] // No required fields for documents
};




const STATUS_OPTIONS = ['active', 'inactive', 'alumni'];
const GENDER_OPTIONS = ['male', 'female', 'other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

type AddStudentViewProps = {
  editingStudent?: Student | null;
};

export function AddStudentView({ editingStudent = null }: AddStudentViewProps) {

  const [previewOpen, setPreviewOpen] = useState(false);
const [previewData, setPreviewData] = useState('');
const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('image');


  const [classOptions, setClassOptions] = useState<{ id: number, class_name: string }[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>(['A', 'B', 'C', 'D']);

  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Student>(editingStudent || INITIAL_VALUES);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Student, string>>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});


  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

 const handleFileUpload = async (field: keyof Student, files: FileList | null) => {
  if (!files || files.length === 0) return;

  try {
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = Array.from(new Uint8Array(arrayBuffer));

    // Call the Rust command to save the file
    const fileName = await invoke<string>('save_student_document', {
      studentId: formData.id || studentId,
      documentType: field,
      fileName: file.name,
      data: fileBytes,
    });

    // Store just the filename in formData
    setFormData(prev => ({
      ...prev,
      [field]: fileName
    }));
  } catch (error) {
    console.error('Error uploading file:', error);
    setSnackbar({ open: true, message: 'Failed to upload file', severity: 'error' });
  }
};
 const handlePreview = async (field: keyof Student) => {
  const fileName = formData[field];
  if (!fileName) return;

  try {
    // Get the full file path from Rust
    const filePath = await invoke<string>('get_student_document_path', {
      fileName: String(fileName)
    });

    // Determine file type
    if (['profile_image', 'passport_photo'].includes(field)) {
      setPreviewType('image');
      // Read image file directly
      setPreviewData(filePath);
    } else if (field.endsWith('_certificate') || field === 'id_proof') {
      setPreviewType('pdf');
      setPreviewData(filePath);
    } else {
      setPreviewType('other');
      setPreviewData(filePath);
    }

    setPreviewOpen(true);
  } catch (error) {
    console.error('Error previewing file:', error);
    setSnackbar({ open: true, message: 'Failed to preview file', severity: 'error' });
  }
};

  useEffect(() => {
    const init = async () => {
      const numericId = parseInt(id || '', 10);

      try {
        // Fetch classes first
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
              class_id: s1.class_id.toString(), // Ensure class_id is string for the select
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

  const validateField = (field: keyof Student, value: string) => {
    let errorMessage = '';
    if (REQUIRED_FIELDS[activeStep].includes(field) && !value) {
      errorMessage = `${field} is required`;
    } else if (value) {
      switch (field) {
        case 'full_name':
        case 'father_name':
        case 'mother_name':
          if (!/^[A-Za-z\s]+$/.test(value)) {
            errorMessage = `${field} should only contain alphabetic characters`;
          }
          break;
        case 'mobile_number':
        case 'alternate_contact_number':
        case 'emergency_contact':
          if (!/^\d{10}$/.test(value)) {
            errorMessage = 'Phone number must be 10 digits';
          }
          break;
        case 'email':
          if (!/\S+@\S+\.\S+/.test(value)) {
            errorMessage = 'Invalid email format';
          }
          break;
        case 'dob':
        case 'admission_date':
          if (new Date(value).toString() === 'Invalid Date') {
            errorMessage = 'Invalid date';
          }
          break;
        case 'postal_code':
          if (!/^\d{6}$/.test(value)) {
            errorMessage = 'Postal code must be 6 digits';
          }
          break;
        case 'weight_kg':
        case 'height_cm':
          if (isNaN(Number(value))) {
            errorMessage = 'Must be a number';
          }
          break;
        default:
          // No validation for other fields or handle unexpected fields
          break;
      }
    }
    return errorMessage;
  };

  const validateStep = () => {
    const newErrors: Partial<Record<keyof Student, string>> = {};
    REQUIRED_FIELDS[activeStep].forEach(field => {
      const error = validateField(field, formData[field] as string);
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
            id: formData.id || studentId,
            gr_number: formData.gr_number || null,
            student_id: formData.student_id || null,
            roll_number: formData.roll_number || null,
            full_name: formData.full_name,
            dob: formData.dob,
            gender: formData.gender,
            mother_name: formData.mother_name,
            father_name: formData.father_name,
            nationality: formData.nationality || null,
            profile_image: formData.profile_image || null,
            class_id: formData.class_id,
            section: formData.section || null,
            academic_year: formData.academic_year || null,
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
            email: formData.email || null,
            mobile_number: formData.mobile_number || null,
            alternate_contact_number: formData.alternate_contact_number || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            country: formData.country || null,
            postal_code: formData.postal_code || null,
            guardian_contact_info: formData.guardian_contact_info || null,
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
            blood_group: formData.blood_group || null,
            status: formData.status || null,
            admission_date: formData.admission_date || null,
            weight_kg: formData.weight_kg || null,
            height_cm: formData.height_cm || null,
            hb_range: formData.hb_range || null,
            medical_conditions: formData.medical_conditions || null,
            emergency_contact_person: formData.emergency_contact_person || null,
            emergency_contact: formData.emergency_contact || null,
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

    const finalId = formData.id || studentId;
    if (!finalId) {
      setSnackbar({ open: true, message: 'Missing student ID. Please complete Step 1.', severity: 'error' });
      return;
    }

    try {
      await invoke('create_student4', {
        student: {
          id: finalId,
          birth_certificate: formData.birth_certificate,
          transfer_certificate: formData.transfer_certificate,
          previous_academic_records: formData.previous_academic_records,
          address_proof: formData.address_proof,
          id_proof: formData.id_proof,
          passport_photo: formData.passport_photo,
          medical_certificate: formData.medical_certificate,
          vaccination_certificate: formData.vaccination_certificate,
          other_documents: formData.other_documents,
        },
      });
      setSnackbar({ open: true, message: 'Documents saved!', severity: 'success' });
      navigate('/dashboard/students', { replace: true });
    } catch (error) {
      console.error('Error saving documents:', error);
      setSnackbar({ open: true, message: 'Failed to save documents.', severity: 'error' });
    }
  };

 const handleChange = (field: keyof Student) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,  // Store null for empty strings
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
    setErrors(prev => ({ ...prev, [field]: validateField(field, formData[field] as string) }));
  };

  const renderTextField = (label: string, field: keyof Student, type = 'text', multiline: number | boolean = false) => (
    <TextField
      label={label}
      value={formData[field] || ''}
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

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return (
        <Stack spacing={2}>
          <Typography variant="h6" gutterBottom>General Information</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('GR Number', 'gr_number')}
            {renderTextField('Student ID', 'student_id')}
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
              label="Date of Birth *"
              value={formData.dob}
              onChange={handleChange('dob')}
              onBlur={handleBlur('dob')}
              error={!!errors.dob}
              helperText={errors.dob}
              InputLabelProps={{ shrink: true }}
            />
            {renderTextField('Nationality', 'nationality')}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField("Father's Name", 'father_name')}
            {renderTextField("Mother's Name", 'mother_name')}
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
                <MenuItem key={cls.id} value={cls.id.toString()}> {/* Ensure value is string */}
                  {cls.class_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Section *"
              value={formData.section}
              onChange={handleChange('section')}
              onBlur={handleBlur('section')}
              fullWidth
              error={!!errors.section}
              helperText={errors.section}
            >
              {sectionOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            {renderTextField('Academic Year *', 'academic_year')}
          </Stack>
        </Stack>
      );
      case 1: return (
        <Stack spacing={2}>
          <Typography variant="h6" gutterBottom>Contact Information</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('Mobile Number *', 'mobile_number')}
            {renderTextField('Alternate Contact Number', 'alternate_contact_number')}
            {renderTextField('Email', 'email')}
          </Stack>
          {renderTextField('Address *', 'address', 'text', 3)}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderTextField('City *', 'city')}
            {renderTextField('State *', 'state')}
            {renderTextField('Country *', 'country')}
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
              value={formData.blood_group}
              onChange={handleChange('blood_group')}
              fullWidth
            >
              {BLOOD_GROUPS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Status *"
              value={formData.status}
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
              label="Admission Date *"
              value={formData.admission_date}
              onChange={handleChange('admission_date')}
              onBlur={handleBlur('admission_date')}
              error={!!errors.admission_date}
              helperText={errors.admission_date}
              InputLabelProps={{ shrink: true }}
            />
            {renderTextField('Weight (kg)', 'weight_kg', 'number')}
            {renderTextField('Height (cm)', 'height_cm', 'number')}
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
      ].map(([label, field, accept, requirement], index) => (
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
                >
                  Click to upload
                  <input
                    type="file"
                    hidden
                    accept={accept}
                    onChange={(e) => handleFileUpload(field as keyof Student, e.target.files)}
                  />
                </Button>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label="Uploaded"
                    color="success"
                    variant="outlined"
                    onDelete={() => setFormData(prev => ({ ...prev, [field]: '' }))}
                    deleteIcon={<CancelIcon />}
                  />
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => handlePreview(field as keyof Student)}
                    startIcon={<VisibilityIcon />}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setFormData(prev => ({ ...prev, [field]: '' }))}
                    startIcon={<ReplayIcon />}
                  >
                    Replace
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

    {/* Preview Modal */}
    <Dialog
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Document Preview</DialogTitle>
      <DialogContent>
  {previewType === 'image' ? (
    <img 
      src={previewData} 
      alt="Preview" 
      style={{ width: '100%', height: 'auto' }}
    />
  ) : previewType === 'pdf' ? (
    <iframe 
      src={previewData}
      width="100%"
      height="600px"
      title="PDF Preview"
    />
  ) : (
    <Typography>Preview not available for this file type</Typography>
  )}
</DialogContent>
      <DialogActions>
        <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        <Button 
          variant="contained" 
          onClick={() => {
            // Add download functionality here if needed
            setPreviewOpen(false);
          }}
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
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            Student Management
          </Typography>
        </Box>

        <Card sx={{ p: 4, mt: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {['General Information', 'Contact Information', 'Health & Admission', 'Documents'].map(label => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
          {renderStepContent()}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>Back</Button>
            {activeStep === 3
              ? <Button variant="contained" onClick={handleSubmit} size="large">{editingStudent ? 'Update' : 'Submit'}</Button>
              : <Button variant="contained" onClick={handleNext} size="large">Next</Button>}
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