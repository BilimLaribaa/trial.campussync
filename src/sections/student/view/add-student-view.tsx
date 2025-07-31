import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { open } from "@tauri-apps/plugin-dialog";
import { invoke , convertFileSrc} from '@tauri-apps/api/core';

import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  CloudUpload as CloudUploadIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
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

export type StudentCore = {
  id?: number;  // Optional for creation
  gr_number: string;
  roll_number?: string;
  full_name: string;
  dob?: string;
  gender: string;
  mother_name: string;
  father_name: string;
  father_occupation?: string;
  mother_occupation?: string;
  annual_income?: number;
  nationality?: string;
  profile_image?: string;
  class_id: string;
  section?: string;
  academic_year?: string;
};

export type StudentContact = {
  email?: string;
  mobile_number?: string;
  alternate_contact_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  guardian_contact_info?: string;
};

export type StudentHealth = {
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

export type StudentDocs = {
  birth_certificate?: string;
  transfer_certificate?: string;
  previous_academic_records?: string;
  address_proof?: string;
  id_proof?: string;
  passport_photo?: string;
  medical_certificate?: string;
  vaccination_certificate?: string;
  other_documents?: string;
};

export type Student = {
  id?: number;
  gr_number: string;
  roll_number?: string;
  full_name: string;
  dob?: string;
  gender: string;
  mother_name: string;
  father_name: string;
  father_occupation?: string;
  mother_occupation?: string;
  annual_income?: number;
  nationality?: string;
  profile_image?: string;
  class_id: string;
  section?: string;
  academic_year?: string;
  email?: string;
  mobile_number?: string;
  alternate_contact_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  guardian_contact_info?: string;
  blood_group?: string;
  status?: string;
  admission_date?: string;
  weight_kg?: number;
  height_cm?: number;
  hb_range?: string;
  medical_conditions?: string;
  emergency_contact_person?: string;
  emergency_contact?: string;
  birth_certificate?: string;
  transfer_certificate?: string;
  previous_academic_records?: string;
  address_proof?: string;
  id_proof?: string;
  passport_photo?: string;
  medical_certificate?: string;
  vaccination_certificate?: string;
  other_documents?: string;
};

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
    1: [], 
    2: [],
    3: []
  };

const STATUS_OPTIONS = ['Active', 'Inactive', 'Almini'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

type AddStudentViewProps = {
  editingStudent?: Student | null;
};



export function AddStudentView({ editingStudent = null }: AddStudentViewProps) {
  
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  const [touched, setTouched] = useState<Record<string, boolean>>({})
//  documents states in form 4 
const [documentFilePaths, setDocumentFilePaths] = useState<Record<string, string>>({});
const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string>>({});
const [isDocumentUploading, setIsDocumentUploading] = useState(false);

// passport state in form 4
const [passportFilePath, setPassportFilePath] = useState<string | null>(null);
const [passportImageUrl, setPassportImageUrl] = useState<string | null>(null);
const [isPhotoUploaded, setIsPhotoUploaded] = useState(false);
const [previousUploadedPhoto, setPreviousUploadedPhoto] = useState<string | null>(null);

const documentTypes = [
  { key: 'birth_certificate', label: 'Birth Certificate' },
  { key: 'transfer_certificate', label: 'Transfer Certificate' },
  { key: 'previous_academic_records', label: 'Previous Academic Records' },
  { key: 'address_proof', label: 'Address Proof' },
  { key: 'id_proof', label: 'ID Proof' },
  { key: 'medical_certificate', label: 'Medical Certificate' },
  { key: 'vaccination_certificate', label: 'Vaccination Certificate' },
  { key: 'other_documents', label: 'Other Documents' },
];


  const handleDocumentOpen = async (docType: string) => {
  try {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "PDF Documents", extensions: ["pdf"] }],
    });

    if (typeof file === 'string') {
      const fileName = file.split('/').pop() || 'Selected File';

      setDocumentFilePaths(prev => ({
        ...prev,
        [docType]: file
      }));

      // Optional: Show the file name on the chip label
      setUploadedDocuments(prev => ({
        ...prev,
        [docType]: fileName
      }));
    }
  } catch (err) {
    console.error("[handleDocumentOpen] Error opening file:", err);
    setSnackbar({
      open: true,
      message: 'Failed to select document',
      severity: 'error'
    });
  }
};

const handleSaveDocuments = async () => {
  if (Object.keys(documentFilePaths).length === 0) {
    setSnackbar({
      open: true,
      message: 'No documents selected to upload',
      severity: 'warning'
    });
    return;
  }

  setIsDocumentUploading(true);

  try {
    const newUploadedDocuments: Record<string, string> = {};

    for (const [docType, filePath] of Object.entries(documentFilePaths)) {
      try {
        const savedFileName: string = await invoke("save_student_document", {
          documentPath: filePath,
          documentType: docType
        });

        newUploadedDocuments[docType] = savedFileName;

        setFormData(prev => ({
          ...prev,
          [docType]: savedFileName
        }));
      } catch (error) {
        console.error(`[handleSaveDocuments] Error saving ${docType}:`, error);
      }
    }

    // Clear selection paths (but preserve uploaded doc state)
    setDocumentFilePaths({});

    // Set only newly uploaded files
    setUploadedDocuments(prev => ({
      ...prev,
      ...newUploadedDocuments
    }));

    setSnackbar({
      open: true,
      message: 'Documents uploaded successfully!',
      severity: 'success'
    });
  } catch (error) {
    console.error("[handleSaveDocuments] Error saving documents:", error);
    setSnackbar({
      open: true,
      message: 'Failed to save some documents',
      severity: 'error'
    });
  } finally {
    setIsDocumentUploading(false);
  }
};



const handlePassportOpen = async () => {
  try {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif"] }],
    });

    if (typeof file === 'string') {
      setPassportFilePath(file);
      setIsPhotoUploaded(false); // 🔄 Reset upload state
    }
  } catch (err) {
    console.error("[handlePassportOpen] Error opening passport file:", err);
  }
};


useEffect(() => {
  if (passportFilePath) {
    setPassportImageUrl(convertFileSrc(passportFilePath));
  }
}, [passportFilePath]);


const handleSave = async () => {
  if (!passportFilePath) {
    console.warn("[handleSave] No filePath to save.");
    return;
  }

  try {
    if (previousUploadedPhoto) {
      console.log("[handleSave] Deleting previous photo:", previousUploadedPhoto);
      await invoke("delete_passport_photo", { fileName: previousUploadedPhoto });
    }

    const savedFileName: string = await invoke("save_passport_photo", { passportFilePath });

    setPreviousUploadedPhoto(savedFileName);
    setIsPhotoUploaded(true);
    
    // Also update form data immediately
    setFormData(prev => ({
      ...prev,
      passport_photo: savedFileName
    }));

    setSnackbar({ 
      open: true, 
      message: 'Passport photo uploaded successfully!', 
      severity: 'success' 
    });

    setPassportFilePath(null);
  } catch (error) {
    console.error("[handleSave] Error saving image:", error);
    setSnackbar({ 
      open: true, 
      message: 'Failed to save passport photo.', 
      severity: 'error' 
    });
  }
};



  useEffect(() => {
    const init = async () => {
      const numericId = parseInt(id || '', 10);

      try {
        const classes = await invoke<{ id: number, class_name: string }[]>('get_active_classes');
        setClassOptions(classes);

        if (!editingStudent && id) {
          try {
            const [student] = await invoke<Student[]>('get_students', { id: numericId });
            
            if (student) {
              setFormData({
                ...student,
                class_id: student.class_id.toString(),
                roll_number: student.roll_number || '',
                dob: student.dob || '',
                profile_image: student.profile_image || '',
                weight_kg: student.weight_kg,
                height_cm: student.height_cm
              });
              setStudentId(numericId);
            }
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

  // Only check for required fields on step 0
  if (REQUIRED_FIELDS[0].includes(field) && !stringValue) {
    errorMessage = `${field} is required`;
  }

  // Only perform pattern validation if the field is non-empty
  if (stringValue) {
    switch (field) {
      case 'gr_number':
        if (!/^\d{4}$/.test(stringValue)) {
          errorMessage = 'GR Number must be exactly 4 digits';
        }
        break;
      case 'mobile_number':
      case 'alternate_contact_number':
      case 'emergency_contact':
        if (!/^\d{10}$/.test(stringValue)) {
          errorMessage = 'Phone number must be exactly 10 digits';
        }
        break;
      case 'email':
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(stringValue)) {
          errorMessage = 'Email must be in format example@gmail.com';
        }
        break;
      case 'postal_code':
        if (!/^\d{6}$/.test(stringValue)) {
          errorMessage = 'Postal code must be 6 digits';
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
      // Create a StudentCore object without the id field for new students
      const coreData: StudentCore = {
        gr_number: formData.gr_number,
        roll_number: formData.roll_number || undefined,
        full_name: formData.full_name,
        dob: formData.dob || undefined,
        gender: formData.gender,
        mother_name: formData.mother_name,
        father_name: formData.father_name,
        father_occupation: formData.father_occupation || undefined,
        mother_occupation: formData.mother_occupation || undefined,
        annual_income: formData.annual_income || undefined,
        nationality: formData.nationality || undefined,
        profile_image: formData.profile_image || undefined,
        class_id: formData.class_id,
        section: formData.section || undefined,
        academic_year: formData.academic_year || undefined,
      };

      // Only include id if we're editing
      if (formData.id) {
        coreData.id = formData.id;
      }

      const newId = await invoke<number>('create_student1', { core: coreData });
      
      setStudentId(newId);
      setFormData(prev => ({ ...prev, id: newId }));
      setSnackbar({ open: true, message: 'General information saved!', severity: 'success' });
      setActiveStep(1);
    } catch (error) {
      console.error('Error saving general info:', error);
      setSnackbar({ open: true, message: 'Failed to save general info.', severity: 'error' });
    }
  } else if (activeStep === 1 && (formData.id || studentId)) {
      try {
        await invoke('create_student2', {
  contact: {  // Change 'student' to 'contact'
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
  id: formData.id || studentId,  // Keep id separate
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
  health: {  // Change 'student' to 'health'
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
  id: formData.id || studentId,  // Keep id separate
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

  // Require uploaded photo
  if (activeStep === 3 && !isPhotoUploaded) {
    setSnackbar({ open: true, message: 'Passport photo is required before submission', severity: 'error' });
    return;
  }

  setIsSubmitting(true);

  try {
    // Prepare the document data including the passport photo path
    const docsData = {
      birth_certificate: formData.birth_certificate || null,
      transfer_certificate: formData.transfer_certificate || null,
      previous_academic_records: formData.previous_academic_records || null,
      address_proof: formData.address_proof || null,
      id_proof: formData.id_proof || null,
      passport_photo: previousUploadedPhoto || null, // This is the saved path from handleSave
      medical_certificate: formData.medical_certificate || null,
      vaccination_certificate: formData.vaccination_certificate || null,
      other_documents: formData.other_documents || null
    };

    // Update the student record with all document paths
    await invoke('create_student4', {
      docs: docsData,
      id: finalId,
    });

    // Also update the form data with the passport photo path
    setFormData(prev => ({
      ...prev,
      passport_photo: previousUploadedPhoto || ''
    }));

    setSnackbar({ 
      open: true, 
      message: 'Student saved successfully!', 
      severity: 'success' 
    });

    // Cleanup
    setPreviousUploadedPhoto(null);
    setIsPhotoUploaded(false);
    setPassportFilePath(null);

    setTimeout(() => {
      navigate('/dashboard/students', { replace: true });
    }, 1500);
  } catch (error) {
    console.error('Error saving student:', error);
    setSnackbar({ 
      open: true, 
      message: 'Failed to save student documents.', 
      severity: 'error' 
    });
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
      <TextField
        label="GR Number *"
        value={formData.gr_number ?? ''}
        onChange={handleChange('gr_number')}
        onBlur={handleBlur('gr_number')}
        fullWidth
        error={!!errors.gr_number}
        helperText={errors.gr_number}
        inputProps={{
          maxLength: 4,
          pattern: '\\d{4}',
          inputMode: 'numeric'
        }}
      />
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
      <TextField
        label="Mobile Number *"
        value={formData.mobile_number || ''}
        onChange={handleChange('mobile_number')}
        onBlur={handleBlur('mobile_number')}
        fullWidth
        error={!!errors.mobile_number}
        helperText={errors.mobile_number}
        inputProps={{
          maxLength: 10,
          inputMode: 'numeric',
          pattern: '[0-9]{10}'
        }}
      />
      <TextField
        label="Alternate Contact Number"
        value={formData.alternate_contact_number || ''}
        onChange={handleChange('alternate_contact_number')}
        onBlur={handleBlur('alternate_contact_number')}
        fullWidth
        error={!!errors.alternate_contact_number}
        helperText={errors.alternate_contact_number}
        inputProps={{
          maxLength: 10,
          inputMode: 'numeric',
          pattern: '[0-9]{10}'
        }}
      />
      <TextField
        label="Email *"
        value={formData.email || ''}
        onChange={handleChange('email')}
        onBlur={handleBlur('email')}
        fullWidth
        error={!!errors.email}
        helperText={errors.email}
        type="email"
        inputProps={{
          pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
        }}
      />
    </Stack>
    {/* Rest of the contact form remains the same */}
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
  <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
    <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium' }}>
      Document Upload
    </Typography>

    <Box sx={{ display: 'flex', gap: 3 }}>
      {/* Left Column - Documents Panel */}
      <Paper elevation={1} sx={{ p: 2, flex: 1 }}>
        <Stack spacing={3}>
          <Typography variant="h6">Required Documents (PDF only)</Typography>
          
          {/* Document List */}
          <Stack spacing={2}>
            {documentTypes.map((doc) => (
  <Box key={doc.key} sx={{
    p: 2,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <Typography>{doc.label}</Typography>

    {/* If already uploaded and saved to backend */}
   {formData[doc.key as keyof Student] ? (
      <Chip
        label="Uploaded"
        color="success"
        onDelete={() => {
          setUploadedDocuments(prev => {
            const newDocs = { ...prev };
            delete newDocs[doc.key];
            return newDocs;
          });

          setFormData(prev => ({
            ...prev,
            [doc.key]: undefined
          }));
        }}
      />
    ) : documentFilePaths[doc.key] ? (
      <Chip
        label={documentFilePaths[doc.key].split('/').pop() || 'Selected'}
        onDelete={() => {
          setDocumentFilePaths(prev => {
            const newPaths = { ...prev };
            delete newPaths[doc.key];
            return newPaths;
          });

          setUploadedDocuments(prev => {
            const newDocs = { ...prev };
            delete newDocs[doc.key];
            return newDocs;
          });
        }}
      />
    ) : (
      <Button
        variant="outlined"
        size="small"
        startIcon={<CloudUploadIcon />}
        onClick={() => handleDocumentOpen(doc.key)}
        disabled={isDocumentUploading}
      >
        Select
      </Button>
    )}
  </Box>
))}
          </Stack>

          {/* Upload Button - Only shown when documents are selected */}
          {Object.keys(documentFilePaths).length > 0 && (
            <Button
              variant="contained"
              onClick={handleSaveDocuments}
              disabled={isDocumentUploading}
              fullWidth
              startIcon={<CloudUploadIcon />}
              sx={{ mt: 2 }}
            >
              {isDocumentUploading ? 'Uploading...' : 'Upload Selected Documents'}
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Right Column - Passport Photo Panel */}
      <Paper elevation={1} sx={{ p: 2, flex: 1 }}>
        <Stack spacing={3}>
          <Typography variant="h6">Passport Photo *</Typography>
          <Typography variant="body2" color="text.secondary">
            Passport photo is required for submission
          </Typography>
          
          {/* Select Passport Photo Button - Disabled */}
<Button
  variant="outlined"
  startIcon={<CloudUploadIcon />}
  fullWidth
  onClick={handlePassportOpen} // Open file dialog to select passport photo
>
  Select Passport Photo
</Button>

         {passportImageUrl && (
  <Box sx={{ textAlign: "center", my: 1 }}>
    <img
      src={passportImageUrl}
      alt="Passport Preview"
      style={{
        maxWidth: "100%",
        maxHeight: "200px",
        objectFit: "contain",
        borderRadius: "4px",
      }}
    />
  </Box>
)}

          {/* Upload Passport Photo Button - Disabled */}
         <Button
  variant="contained"
  fullWidth
  sx={{ mt: 2 }}
  onClick={handleSave}
  disabled={!passportFilePath || isSubmitting}
>
  {isSubmitting ? 'Uploading...' : 'Upload Passport Photo'}
</Button>


          {/* Passport Photo Status - Not Uploaded */}
          <Box>
  <Typography variant="h6" sx={{ mb: 2 }}>Passport Photo Status</Typography>
  {isPhotoUploaded ? (
    <Typography variant="body2" color="success.main">
      Passport photo uploaded successfully.
    </Typography>
  ) : passportImageUrl ? (
    <Typography variant="body2" color="warning.main">
      Passport photo selected but not uploaded.
    </Typography>
  ) : (
    <Typography variant="body2" color="error">
      Passport photo is required.
    </Typography>
  )}
</Box>
        </Stack>
      </Paper>
    </Box>
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
        </Card>
      </DashboardContent>

      {/* Snackbar positioned at top center */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}