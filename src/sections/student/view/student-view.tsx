import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useMemo } from 'react';

import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { InputAdornment, MenuItem } from '@mui/material';
import {
  Box, Card, Stack, Button, Typography, Avatar, TextField,
  ListItemText, ListItemAvatar, ListItem, ListItemButton, List,
  ToggleButton, ToggleButtonGroup, Snackbar, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Paper,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';
import { useStudentSearch } from 'src/contexts/StudentSearchContext';

type Student = {
  id: number;
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

interface Class {
  id: string;
  class_name: string;
  academic_years: number;
  status: string;
  created_at?: string;
  updated_at?: string;
  academic_year_details?: AcademicYear;
}

type DocumentUrls = {
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

interface AcademicYear {
  id: number;
  academic_year: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  autoHideDuration?: number;
}

const EXPECTED_HEADERS = [
  'gr_number',
  'roll_number',
  'full_name',
  'dob',
  'gender',
  'mother_name',
  'father_name',
  'father_occupation',
  'mother_occupation',
  'annual_income',
  'nationality',
  'class_id',
  'section',
  'academic_year',
  'email',
  'mobile_number',
  'alternate_contact_number',
  'address',
  'city',
  'state',
  'country',
  'postal_code',
  'guardian_contact_info',
  'blood_group',
  'status',
  'admission_date',
  'weight_kg',
  'height_cm',
  'hb_range',
  'medical_conditions',
  'emergency_contact_person',
  'emergency_contact'
];

export function StudentView() {
  const navigate = useNavigate();
  const infoRef = useRef<HTMLDivElement>(null);
  const { grNumber, setGrNumber } = useStudentSearch();
  const [students, setStudents] = useState<Student[]>([]);
  const [documentUrls, setDocumentUrls] = useState<Record<number, DocumentUrls>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [infoTab, setInfoTab] = useState<'general' | 'contact' | 'health' | 'documents'>('general');
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<string>('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'unsupported'>('unsupported');
  const [previewFileName, setPreviewFileName] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<{ success: boolean, message: string } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [studentsToImport, setStudentsToImport] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [headerSelectedClass, setHeaderSelectedClass] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchAlert, setSearchAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [file, setFile] = useState<File | null>(null);
  const [headerMismatches, setHeaderMismatches] = useState<{ expected: string, found: string | null }[]>([]);
  const [validationStep, setValidationStep] = useState<'initial' | 'headers' | 'file-duplicates' | 'db-duplicates' | 'class-mismatch' | 'ready'>('initial');
  const [duplicateDetails, setDuplicateDetails] = useState<{ fileDuplicates: Student[], dbDuplicates: Student[] }>({ fileDuplicates: [], dbDuplicates: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);



  const normalizeClassName = (className: string): string =>
    className.replace(/^Class\s*/i, '').trim().toLowerCase();

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return students;
    return students.filter(student => student.class_id === String(selectedClass));
  }, [students, selectedClass]);

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  // useEffect(() => {
  //   if (filteredStudents.length > 0 && !selectedStudentId) {
  //     setSelectedStudentId(filteredStudents[0].id);
  //   } else if (filteredStudents.length > 0 && selectedStudentId) {
  //     const studentExists = filteredStudents.some(s => s.id === selectedStudentId);
  //     if (!studentExists) {
  //       setSelectedStudentId(filteredStudents[0].id);
  //     }
  //   } else {
  //     setSelectedStudentId(null);
  //   }
  // }, [filteredStudents, selectedStudentId]);

  const handleDelete = async () => {
    if (!selectedStudentId) return;
    const student = students.find(s => s.id === selectedStudentId);
    if (!student || !window.confirm(`Are you sure you want to delete ${student.full_name}?`)) return;
    try {
      await invoke('delete_student', { id: selectedStudentId });
      const updated = students.filter((s) => s.id !== selectedStudentId);
      setStudents(updated);
      setSelectedStudentId(updated[0]?.id || null);
    } catch (err) {
      console.error('Failed to delete student:', err);
      setError('Failed to delete student');
    }
  };

  const getDocumentPaths = async (student: Student): Promise<DocumentUrls> => {
    const paths: DocumentUrls = {};
    const docKeys = ['birth_certificate', 'transfer_certificate', 'previous_academic_records', 'address_proof',
      'id_proof', 'passport_photo', 'medical_certificate', 'vaccination_certificate', 'other_documents'] as const;

    for (const key of docKeys) {
      const filename = student[key];
      if (filename) {
        try {
          paths[key] = key === 'passport_photo'
            ? await invoke<string>('get_student_document_base64', { fileName: filename })
            : await invoke<string>('get_student_document_path', { fileName: filename }) || '';
        } catch (err) {
          console.error(`Failed to get document ${key}:`, err);
          paths[key] = '';
        }
      }
    }
    return paths;
  };

  const handlePreview = async (filepath: string, filename: string) => {
    if (!selectedStudentId) return;
    try {
      setDownloadStatus(null);
      const extension = filename.split('.').pop()?.toLowerCase();
      const fileType = ['jpg', 'jpeg', 'png', 'gif'].includes(extension || '') ? 'image' : extension === 'pdf' ? 'pdf' : 'unsupported';
      const fileUrl = await invoke<string>('get_student_document_base64', { fileName: filename });
      setPreviewType(fileType);
      setPreviewData(fileUrl);
      setPreviewFileName(filename);
      setPreviewOpen(true);
    } catch (err) {
      console.error('Failed to preview document:', err);
      setDownloadStatus({ success: false, message: 'Failed to load document for preview' });
    }
  };

  const handleDownload = async (filepath: string, filename: string) => {
    try {
      await invoke('download_file', { filePath: filepath, fileName: filename });
      setDownloadStatus({ success: true, message: 'Download started successfully' });
    } catch (err) {
      console.error('Failed to download document:', err);
      setDownloadStatus({ success: false, message: 'Failed to download document' });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      if (!headerSelectedClass) {
        setSnackbar({ open: true, message: 'Please select a class first', severity: 'warning' });
        return;
      }

      const selectedClassObj = classes.find(c => c.class_name === headerSelectedClass);
      const selectedClassName = selectedClassObj?.class_name || 'Student_Data';
      const safeClassName = selectedClassName.replace(/\s+/g, '_'); // Replace spaces with underscores
      const templatePath = '/assets/Student_Data.xlsx';

      const response = await fetch(templatePath);
      const arrayBuffer = await response.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Define the headers
      const headers = [
        'gr_number', 'roll_number', 'full_name', 'dob', 'gender',
        'mother_name', 'father_name', 'father_occupation', 'mother_occupation', 'annual_income',
        'nationality', 'class_id', 'section', 'academic_year', 'email',
        'mobile_number', 'alternate_contact_number', 'address', 'city', 'state',
        'country', 'postal_code', 'guardian_contact_info', 'blood_group', 'status',
        'admission_date', 'weight_kg', 'height_cm', 'hb_range', 'medical_conditions',
        'emergency_contact_person', 'emergency_contact'
      ];

      // Write headers to the first row (row 0)
      headers.forEach((header, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
        worksheet[cellAddress] = { t: 's', v: header };
      });

      // Create dummy data for the second row (row 1)
      const dummyData = [
        'GR-SKVS0000',         // gr_number
        '1',                   // roll_number
        'John Doe',            // full_name
        'dd/mm/yy',            // dob
        'male',                // gender
        'Jane Doe',            // mother_name
        'John Doe Sr.',        // father_name
        'Business',            // father_occupation
        'Teacher',             // mother_occupation
        '500000',              // annual_income
        'Indian',              // nationality
        headerSelectedClass,   // class_id
        'A',                   // section
        'yyyy-yyyy',           // academic_year
        'john.doe@example.com',// email
        '9876543210',          // mobile_number
        '9876543211',          // alternate_contact_number
        '123 Main Street',     // address
        'Mumbai',              // city
        'Maharashtra',         // state
        'India',               // country
        '400001',              // postal_code
        '9876543212',          // guardian_contact_info
        'O+',                  // blood_group
        'Active',              // status
        'dd/mm/yy',            // admission_date
        '45',                  // weight_kg
        '150',                 // height_cm
        'none',              // hb_range
        'none',                // medical_conditions
        'John Doe Sr.',        // emergency_contact_person
        '9876543210'           // emergency_contact
      ];

      // Write dummy data to the second row
      dummyData.forEach((value, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 1, c: colIndex });
        worksheet[cellAddress] = { t: typeof value === 'number' ? 'n' : 's', v: value };
      });

      // Update the worksheet range to include both rows
      worksheet['!ref'] = XLSX.utils.encode_range(
        { r: 0, c: 0 },
        { r: 1, c: headers.length - 1 }
      );

      const newArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([newArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeClassName}_Student_Data.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'Template downloaded successfully', severity: 'success' });
    } catch (err) {
      console.error('Failed to download template:', err);
      setSnackbar({ open: true, message: 'Failed to download template', severity: 'error' });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Import] File selection changed');
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        console.log('[Import] Valid file selected:', selectedFile.name);
        setFile(selectedFile);
        setValidationStep('initial');
        setHeaderMismatches([]);
        setStudentsToImport([]);
        setDuplicateDetails({ fileDuplicates: [], dbDuplicates: [] });
      } else {
        console.log('[Import] Invalid file type selected:', fileExtension);
        setSnackbar({ open: true, message: 'Only Excel files (.xlsx, .xls) are allowed', severity: 'error' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const validateHeaders = (worksheet: XLSX.WorkSheet): boolean => {
    console.log('[Import] Validating headers...');
    const headers: string[] = [];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1');

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const cell = worksheet[cellAddress];
      if (cell && cell.t) headers.push(cell.v.toString().toLowerCase().trim().replace(/\s+/g, '_'));
    }

    console.log('[Import] File headers:', headers);
    console.log('[Import] Expected headers:', EXPECTED_HEADERS);

    const mismatches: { expected: string, found: string | null }[] = [];
    EXPECTED_HEADERS.forEach(expected => {
      const found = headers.find(h => h === expected);
      if (!found) {
        mismatches.push({ expected, found: null });
      }
    });

    headers.forEach(header => {
      if (!EXPECTED_HEADERS.includes(header)) {
        mismatches.push({ expected: '', found: header });
      }
    });

    if (mismatches.length > 0) {
      console.log('[Import] Header validation failed with mismatches:', mismatches);
      setHeaderMismatches(mismatches);
      return false;
    }

    console.log('[Import] Headers validation passed');
    return true;
  };

  const findFileDuplicates = (studentList: Student[]): Student[] => {
    console.log('[Import] Checking for duplicates within file...');
    const fileGrNumberMap = new Map<string, Student>(); // Renamed
    const fileRollNumberMap = new Map<string, Student>(); // Renamed
    const duplicates: Student[] = [];

    studentList.forEach(currentStudent => { // Renamed parameter
      // Ensure consistent string comparison
      const currentGrNumber = currentStudent.gr_number.toString().trim(); // Renamed
      const currentRollNumber = currentStudent.roll_number
        ? currentStudent.roll_number.toString().trim()
        : null; // Renamed

      // Check GR number duplicates
      if (fileGrNumberMap.has(currentGrNumber)) {
        console.log(`[Import] Duplicate GR number found in file: ${currentGrNumber}`);
        const originalStudent = fileGrNumberMap.get(currentGrNumber); // Renamed
        if (originalStudent && !duplicates.some(s =>
          s.gr_number.toString().trim() === currentGrNumber
        )) {
          duplicates.push(originalStudent);
        }
        duplicates.push(currentStudent);
      } else {
        fileGrNumberMap.set(currentGrNumber, currentStudent);
      }

      // Check Roll number duplicates (only if roll number exists)
      if (currentRollNumber && fileRollNumberMap.has(currentRollNumber)) {
        console.log(`[Import] Duplicate Roll number found in file: ${currentRollNumber}`);
        const originalStudent = fileRollNumberMap.get(currentRollNumber); // Renamed
        if (originalStudent && !duplicates.some(s =>
          s.roll_number && s.roll_number.toString().trim() === currentRollNumber
        )) {
          duplicates.push(originalStudent);
        }
        duplicates.push(currentStudent);
      } else if (currentRollNumber) {
        fileRollNumberMap.set(currentRollNumber, currentStudent);
      }
    });

    // Remove exact duplicates (same student appearing multiple times)
    const uniqueDuplicates = duplicates.filter(
      (student, index, self) =>
        index === self.findIndex((s) => (
          s.gr_number.toString().trim() === student.gr_number.toString().trim() &&
          ((s.roll_number ? s.roll_number.toString().trim() : null) ===
            (student.roll_number ? student.roll_number.toString().trim() : null))
        ))
    );

    console.log('[Import] Found duplicates within file:', uniqueDuplicates);
    return uniqueDuplicates;
  };


  const findDatabaseDuplicates = (fileStudents: Student[], dbStudents: Student[]): Student[] => {
    console.log('[Import] Checking against database students...');

    // Create maps for quick lookup (all values treated as strings)
    const existingGrNumbers = new Set(dbStudents.map(s => s.gr_number.toString().trim()));
    const existingRollNumbers = new Set(
      dbStudents
        .filter(s => s.roll_number !== undefined && s.roll_number !== null)
        .map(s => s.roll_number?.toString().trim() ?? '')
    );

    console.log('[Import] Existing GR numbers:', existingGrNumbers);
    console.log('[Import] Existing Roll numbers:', existingRollNumbers);

    const duplicates: Student[] = [];

    fileStudents.forEach(fileStudent => {
      // Ensure file values are treated as strings
      const fileGrNumber = fileStudent.gr_number.toString().trim();
      const fileRollNumber = fileStudent.roll_number ? fileStudent.roll_number.toString().trim() : null;

      // Check GR number duplicates
      if (existingGrNumbers.has(fileGrNumber)) {
        console.log(`[Import] Duplicate GR number found in database: ${fileGrNumber}`);
        const existingStudent = dbStudents.find(s => s.gr_number.toString().trim() === fileGrNumber);
        if (existingStudent && !duplicates.some(d => d.gr_number.toString().trim() === fileGrNumber)) {
          duplicates.push({
            ...fileStudent,
            class_id: existingStudent.class_id,
            full_name: existingStudent.full_name
          });
        }
        return;
      }

      // Check roll number duplicates (only if roll number exists)
      if (fileRollNumber && existingRollNumbers.has(fileRollNumber)) {
        console.log(`[Import] Duplicate Roll number found in database: ${fileRollNumber}`);
        const existingStudent = dbStudents.find(s =>
          s.roll_number && s.roll_number.toString().trim() === fileRollNumber
        );
        if (existingStudent && !duplicates.some(d =>
          d.roll_number && d.roll_number.toString().trim() === fileRollNumber
        )) {
          duplicates.push({
            ...fileStudent,
            class_id: existingStudent.class_id,
            full_name: existingStudent.full_name
          });
        }
      }
    });

    console.log('[Import] Found duplicates in database:', duplicates);
    return duplicates;
  };



  const checkClassMismatches = (studentList: Student[], selectedClassName: string): Student[] => {
    console.log('[Import] Checking for class mismatches...');

    if (!selectedClassName) {
      console.log('[Import] No class selected for import');
      return [];
    }

    const selectedClassNormalized = normalizeClassName(selectedClassName);

    const mismatches = studentList.filter(student => {
      const studentClassNormalized = normalizeClassName(student.class_id); // assume file has `class_name`
      return studentClassNormalized !== selectedClassNormalized;
    });

    console.log('[Import] Found class mismatches:', mismatches.length);
    return mismatches;
  };


  const formatDate = (inputDate: number | string | undefined, isDob?: boolean): string => {
  // Handle undefined/missing dates
  if (inputDate === undefined || inputDate === null || inputDate === '') {
    return isDob ? '00/00/0000' : 'dd/mm/yyyy';
  }

  // If it's already a string date, clean and return it
  if (typeof inputDate === 'string') {
    const cleanDate = inputDate.trim();
    
    // Check for various valid date formats
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(cleanDate)) {
      const [day, month, year] = cleanDate.split('/');
      const paddedDay = day.padStart(2, '0');
      const paddedMonth = month.padStart(2, '0');
      
      // Handle 2-digit year (convert to 4-digit)
      let fullYear = year;
      if (year.length === 2) {
        fullYear = parseInt(year) < 30 ? `20${year}` : `19${year}`;
      }
      
      return `${paddedDay}/${paddedMonth}/${fullYear}`;
    }
  }

  // Handle Excel serial numbers (only for non-DOB fields)
  if (typeof inputDate === 'number' && !isDob) {
    const utcDays = Math.floor(inputDate - 1);
    const date = new Date(utcDays * 86400 * 1000);
    if (inputDate >= 60) date.setUTCDate(date.getUTCDate() - 1); // Excel leap year bug
    
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  // Fallback for invalid dates
  return isDob ? '00/00/0000' : 'dd/mm/yyyy';
};

const validateAcademicYear = (year: string | undefined): string => {
  if (!year) return '2023-2024';
  
  // Handle cases where year might be in different formats
  const cleanYear = year.trim();
  
  // Already in correct format (yyyy-yyyy)
  if (/^\d{4}-\d{4}$/.test(cleanYear)) {
    return cleanYear;
  }
  
  // Handle single year (convert to yyyy-yyyy+1)
  if (/^\d{4}$/.test(cleanYear)) {
    const startYear = parseInt(cleanYear);
    return `${startYear}-${startYear + 1}`;
  }
  
  return '2023-2024'; // default
};

const handleImportSubmit = async () => {
  console.log('[Import] Starting import process...');

  // Basic validations
  if (!file) {
    setSnackbar({ open: true, message: 'Please select a file first', severity: 'warning' });
    return;
  }

  if (!headerSelectedClass) {
    setSnackbar({ open: true, message: 'Please select a class first', severity: 'warning' });
    return;
  }

  // Validate filename
  const expectedClassName = headerSelectedClass.replace(/\s+/g, '_');
  if (!file.name.includes(expectedClassName)) {
    setSnackbar({
      open: true,
      message: `File name must contain the selected class name (${expectedClassName})`,
      severity: 'error'
    });
    return;
  }

  setSnackbar({ open: true, message: 'Processing import file...', severity: 'info' });

  try {
    // Read and parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Validate headers
    if (!validateHeaders(worksheet)) {
      setValidationStep('headers');
      setSnackbar({ open: true, message: 'Header validation failed', severity: 'error' });
      return;
    }

    // Convert to JSON and format dates
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Student[];
    if (jsonData.length === 0) {
      setSnackbar({ open: true, message: 'No data found in the file', severity: 'error' });
      return;
    }

    // Format dates and academic year with null checks
const formattedData = jsonData.map(student => ({
  ...student,
  dob: formatDate(student.dob, true), // true indicates this is DOB field
  admission_date: formatDate(student.admission_date),
  academic_year: validateAcademicYear(student.academic_year)
}));

    // Dummy data check
    const dummyDataPattern = [
      'GR-SKVS0000', '1', 'John Doe', 'dd/mm/yy', 'male', 
      'Jane Doe', 'John Doe Sr.', 'Business', 'Teacher', '500000',
      'Indian', headerSelectedClass, 'A', '2023-2024', 
      'john.doe@example.com', '9876543210', '9876543211',
      '123 Main Street', 'Mumbai', 'Maharashtra', 'India', '400001',
      '9876543212', 'O+', 'Active', 'dd/mm/yy', '45', '150',
      'none', 'none', 'John Doe Sr.', '9876543210'
    ];

    const isDummyDataPresent = formattedData.some(student =>
      dummyDataPattern.every((value, index) => 
        String(Object.values(student)[index]) === value
      )
    );

    if (isDummyDataPresent) {
      const allDummyData = formattedData.every(student =>
        dummyDataPattern.every((value, index) => 
          String(Object.values(student)[index]) === value
        )
      );

      setSnackbar({
        open: true,
        message: allDummyData 
          ? 'File contains only dummy data. Please replace with actual student data.'
          : 'File contains some dummy data. Please remove all dummy entries before importing.',
        severity: 'error',
        autoHideDuration: 10000
      });
      return;
    }

    // Check for duplicates
    const fileDuplicates = findFileDuplicates(formattedData);
    if (fileDuplicates.length > 0) {
      setDuplicateDetails(prev => ({ ...prev, fileDuplicates }));
      setValidationStep('file-duplicates');
      setStudentsToImport(fileDuplicates);
      setSnackbar({
        open: true,
        message: `Found ${fileDuplicates.length} duplicate records within file`,
        severity: 'error',
        autoHideDuration: 10000
      });
      return;
    }

    // Check against existing students
    const dbDuplicates = findDatabaseDuplicates(formattedData, students);
    if (dbDuplicates.length > 0) {
      setDuplicateDetails(prev => ({ ...prev, dbDuplicates }));
      setValidationStep('db-duplicates');
      setStudentsToImport(dbDuplicates);
      setSnackbar({
        open: true,
        message: `Found ${dbDuplicates.length} existing student records`,
        severity: 'error',
        autoHideDuration: 10000
      });
      return;
    }

    // Check class mismatches
    const classMismatches = checkClassMismatches(formattedData, headerSelectedClass);
    if (classMismatches.length > 0) {
      setValidationStep('class-mismatch');
      setStudentsToImport(classMismatches);
      setSnackbar({
        open: true,
        message: `Found ${classMismatches.length} students with class mismatch`,
        severity: 'error',
        autoHideDuration: 10000
      });
      return;
    }

    // All validations passed
    setValidationStep('ready');
    setStudentsToImport(formattedData);
    setSnackbar({
      open: true,
      message: 'File validated successfully - ready for import',
      severity: 'success'
    });

  } catch (err) {
    console.error('[Import] Error processing import file:', err);
    setSnackbar({
      open: true,
      message: 'Error processing import file',
      severity: 'error'
    });
  }
};

  const handleConfirmImport = async () => {
    try {
      if (!headerSelectedClass) {
        alert("Please select a class before importing students.");
        return;
      }

      // Find the selected class object
      const selectedClassObj = classes.find(c => c.class_name === headerSelectedClass);
      if (!selectedClassObj) {
        alert("Selected class not found in database");
        return;
      }

      // Prepare students data with proper class_id
      const finalStudentsArray = studentsToImport.map(student => ({
        gr_number: String(student.gr_number ?? ''),
        roll_number: String(student.roll_number ?? ''),
        full_name: String(student.full_name ?? ''),
        dob: String(student.dob ?? ''),
        gender: String(student.gender ?? ''),
        mother_name: String(student.mother_name ?? ''),
        father_name: String(student.father_name ?? ''),
        father_occupation: String(student.father_occupation ?? ''),
        mother_occupation: String(student.mother_occupation ?? ''),
        annual_income: Number(student.annual_income ?? 0),
        nationality: String(student.nationality ?? ''),
        profile_image: student.profile_image ?? null,
        class_id: String(selectedClassObj.id),
        section: String(student.section ?? ''),
        academic_year: String(student.academic_year ?? ''),
        email: String(student.email ?? ''),
        mobile_number: String(student.mobile_number ?? ''),
        alternate_contact_number: String(student.alternate_contact_number ?? ''),
        address: String(student.address ?? ''),
        city: String(student.city ?? ''),
        state: String(student.state ?? ''),
        country: String(student.country ?? ''),
        postal_code: String(student.postal_code ?? ''),
        guardian_contact_info: String(student.guardian_contact_info ?? ''),
        blood_group: String(student.blood_group ?? ''),
        status: String(student.status ?? ''),
        admission_date: String(student.admission_date ?? ''),
        weight_kg: Number(student.weight_kg ?? 0),
        height_cm: Number(student.height_cm ?? 0),
        hb_range: String(student.hb_range ?? ''),
        medical_conditions: String(student.medical_conditions ?? ''),
        emergency_contact_person: String(student.emergency_contact_person ?? ''),
        emergency_contact: String(student.emergency_contact ?? ''),
        birth_certificate: student.birth_certificate ?? null,
        transfer_certificate: student.transfer_certificate ?? null,
        previous_academic_records: student.previous_academic_records ?? null,
        address_proof: student.address_proof ?? null,
        id_proof: student.id_proof ?? null,
        passport_photo: student.passport_photo ?? null,
        medical_certificate: student.medical_certificate ?? null,
        vaccination_certificate: student.vaccination_certificate ?? null,
        other_documents: student.other_documents ?? null
      }));

      // Debug: Log the full array of students to be imported
      console.log("Full students array to be imported:", finalStudentsArray);

      // Debug: Log class mapping for verification
      console.log("Class mapping:", {
        selectedClassName: headerSelectedClass,
        selectedClassId: selectedClassObj.id,
        allClasses: classes.map(c => ({ id: c.id, name: c.class_name }))
      });

      // Perform the bulk insert
      const result = await invoke<number>('bulk_create_students', {
        students: finalStudentsArray
      });

      alert(`Successfully imported ${result} students`);
      setImportDialogOpen(false);

      // Refresh the student list
      const updatedStudents = await invoke<Student[]>('get_students', { id: null });
      setStudents(updatedStudents.map(s => ({
        ...s,
        class_id: String(s.class_id) // Ensure class_id is string for consistency
      })));

    } catch (importError) {
      console.error("Error during student import:", importError);
      alert(`Import failed: ${importError instanceof Error ? importError.message : String(importError)}`);
    }
  };

  const renderDocumentLink = (label: string, documentKey: keyof DocumentUrls) => {
    if (documentsLoading) return <Typography variant="body2">Loading...</Typography>;
    const filename = selectedStudent?.[documentKey];
    if (!filename) return <Typography variant="body2">No document uploaded</Typography>;
    const filepath = selectedStudentId ? documentUrls[selectedStudentId]?.[documentKey] : '';
    if (!filepath) return <Typography variant="body2">Document not found</Typography>;
    return (
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" size="small" onClick={() => handlePreview(filepath, filename)} sx={{ textTransform: 'none' }}>View</Button>
        <Button variant="contained" size="small" onClick={() => handleDownload(filepath, filename)} sx={{ textTransform: 'none' }}>Download</Button>
      </Stack>
    );
  };



  useEffect(() => {
    if (downloadStatus) setTimeout(() => setDownloadStatus(null), 100);
  }, [downloadStatus]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [classesData, studentsData] = await Promise.all([
          invoke<Class[]>('get_active_classes'),
          invoke<Student[]>('get_students', { id: null })
        ]);

        const newClassMap = classesData.reduce((acc, cls) => {
          const id = String(cls.id);
          return { ...acc, [id]: cls.class_name };
        }, {} as Record<string, string>);

        const normalizedStudents = studentsData.map(student => ({
          ...student,
          class_id: String(student.class_id)
        }));

        if (normalizedStudents.length > 0) {
          const urls: Record<number, DocumentUrls> = {};
          for (const student of normalizedStudents) {
            urls[student.id] = await getDocumentPaths(student);
          }
          setDocumentUrls(urls);
        }

        setClasses(classesData);
        setClassMap(newClassMap);
        setStudents(normalizedStudents);

        if (normalizedStudents.length > 0) {
          setSelectedStudentId(normalizedStudents[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const updateDocumentUrls = async () => {
      if (selectedStudentId) {
        setDocumentsLoading(true);
        try {
          const student = students.find(s => s.id === selectedStudentId);
          if (student) {
            const urls = await getDocumentPaths(student);
            setDocumentUrls(prev => ({ ...prev, [selectedStudentId]: urls }));
          }
        } catch (err) {
          console.error('Failed to load documents:', err);
          setError('Failed to load documents');
        } finally {
          setDocumentsLoading(false);
        }
      }
    };
    updateDocumentUrls();
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (infoRef.current) setCardHeight(infoRef.current.clientHeight + 240);
  }, [selectedStudentId, infoTab]);

  useEffect(() => {
    if (grNumber && students.length > 0) {
      const found = students.find(s => s.gr_number.toLowerCase().includes(grNumber.toLowerCase()));
      if (found) {
        setSelectedStudentId(found.id);
        setSearchAlert({ open: true, message: `Student found: ${found.full_name}`, severity: 'success' });
      } else {
        setSearchAlert({ open: true, message: 'No student found for GR number: ' + grNumber, severity: 'error' });
      }
      setGrNumber('');
    }
  }, [grNumber, students, setGrNumber]);

  if (loading) return (
    <DashboardContent>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading student data...</Typography>
      </Box>
    </DashboardContent>
  );

  if (error) return (
    <DashboardContent>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Box>
    </DashboardContent>
  );

  return (
    <DashboardContent>
      <Stack spacing={2}>
        {downloadStatus && <Alert severity={downloadStatus.success ? "success" : "error"}>{downloadStatus.message}</Alert>}

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={700}>Student Management</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => {
                console.log('[Import] Opening import dialog');
                setImportDialogOpen(true);
              }}
            >
              Import Students
            </Button>
            <Button variant="contained" onClick={() => navigate('/dashboard/student/add')}>Add Student</Button>
            <Button variant="outlined" disabled={!selectedStudentId} onClick={() => navigate(`/dashboard/student/add/${selectedStudentId}`)}>Edit</Button>
            <Button variant="outlined" color="error" disabled={!selectedStudentId} onClick={handleDelete}>Delete</Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Card sx={{ width: '30%', p: 2, bgcolor: '#f7f9fb', height: cardHeight || 600 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Select Class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={String(cls.id)}>
                  {cls.class_name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ overflowY: 'auto', maxHeight: cardHeight ? cardHeight - 80 : 520 }}>
              {students.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={300}>
                  <Typography variant="body1" color="text.secondary">
                    No students found
                  </Typography>
                </Box>
              ) : (
                <List>
                  {filteredStudents.map((s) => (
                    <ListItem disablePadding key={s.id}>
                      <ListItemButton selected={selectedStudentId === s.id} onClick={() => setSelectedStudentId(s.id)}>
                        <ListItemAvatar>
                          <Avatar src={documentUrls[s.id]?.passport_photo || "/assets/avatars/avatar_1.jpg"} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography fontWeight={600}>{s.full_name}</Typography>}
                          secondary={
                            <>
                              <Typography component="span" display="block">
                                Class: {classMap[s.class_id] || `Class ${s.class_id}`}
                              </Typography>
                              {s.roll_number && (
                                <Typography component="span" display="block">
                                  Roll No: {s.roll_number}
                                </Typography>
                              )}
                            </>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Card>

          <Card sx={{ width: '70%', overflow: 'hidden', borderRadius: 3, height: cardHeight || 600 }}>
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ height: 160, backgroundImage: 'url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=80")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <Box sx={{ position: 'absolute', top: 12, right: 12, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 1, p: 0.5 }}>
                <ToggleButtonGroup
                  value={infoTab}
                  exclusive
                  onChange={(e, v) => v && setInfoTab(v)}
                  size="medium"
                  sx={{
                    '& .MuiToggleButton-root': { color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontWeight: 600 },
                    '& .Mui-selected': { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', borderColor: 'rgba(255,255,255,0.8)' },
                    '& .MuiToggleButton-root:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <ToggleButton value="general">General</ToggleButton>
                  <ToggleButton value="contact">Contact</ToggleButton>
                  <ToggleButton value="health">Health</ToggleButton>
                  <ToggleButton value="documents">Documents</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            <Box sx={{ px: 3, position: 'relative', minHeight: 90 }}>
              <Avatar
                src={selectedStudentId ? documentUrls[selectedStudentId]?.passport_photo || "/assets/avatars/avatar_1.jpg" : "/assets/avatars/avatar_1.jpg"}
                sx={{
                  width: 120,
                  height: 120,
                  border: '4px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(0, 0, 0, 0.15)',
                  backgroundColor: 'white',
                  position: 'absolute',
                  top: -65,
                  left: 24
                }}
              />
              <Box sx={{ pl: 16, pt: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selectedStudent ? `${selectedStudent.full_name}, Class: ${classMap[selectedStudent.class_id] || `Class ${selectedStudent.class_id}`}, Section: ${selectedStudent.section}` : "No student selected"}
                </Typography>
                {selectedStudent && <Typography variant="body2">GR No: {selectedStudent.gr_number} | Roll No: {selectedStudent.roll_number}</Typography>}
              </Box>
            </Box>

            <Box mx="5" mt={-2} ref={infoRef} sx={{ px: 4 }}>
              {selectedStudent ? (
                <>
                  {infoTab === 'general' && (
                    <>
                      <Typography fontWeight={600} mb={1} fontSize={16}>General Information</Typography>
                      <TableContainer>
                        <Table>
                          <TableBody>
                            {(() => {
                              const fields = [
                                ['GR Number', selectedStudent.gr_number],
                                ['Roll Number', selectedStudent.roll_number],
                                ['Full Name', selectedStudent.full_name],
                                ['Date of Birth', selectedStudent.dob],
                                ['Gender', selectedStudent.gender],
                                ['Class', classMap[selectedStudent.class_id] || `Class ${selectedStudent.class_id}`],
                                ["Mother's Name", selectedStudent.mother_name],
                                ["Mother's Occupation", selectedStudent.mother_occupation],
                                ["Father's Name", selectedStudent.father_name],
                                ["Father's Occupation", selectedStudent.father_occupation],
                                ['Annual Income', selectedStudent.annual_income !== undefined && selectedStudent.annual_income !== null ? `$${selectedStudent.annual_income}` : selectedStudent.annual_income === 0 ? '$0' : '-'],
                                ['Nationality', selectedStudent.nationality],
                                ['Section', selectedStudent.section],
                                ['Academic Year', selectedStudent.academic_year],
                              ];
                              const rows = [];
                              for (let i = 0; i < fields.length; i += 2) {
                                const [label1, value1] = fields[i];
                                const pair = fields[i + 1];
                                const label2 = pair ? pair[0] : '';
                                const value2 = pair ? pair[1] : '';
                                rows.push(
                                  <TableRow key={label1} sx={{ backgroundColor: (i / 2) % 2 === 0 ? 'action.hover' : 'background.paper' }}>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{label1}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{value1 || '-'}</TableCell>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{label2}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{value2 || '-'}</TableCell>
                                  </TableRow>
                                );
                              }
                              return rows;
                            })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                  {infoTab === 'contact' && (
                    <>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Contact Information</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {(() => {
                              const fields = [
                                ['Email', selectedStudent.email],
                                ['Mobile Number', selectedStudent.mobile_number],
                                ['Alternate Contact', selectedStudent.alternate_contact_number],
                                ['Address', selectedStudent.address],
                                ['City', selectedStudent.city],
                                ['State', selectedStudent.state],
                                ['Country', selectedStudent.country],
                                ['Postal Code', selectedStudent.postal_code],
                                ['Guardian Contact Info', selectedStudent.guardian_contact_info],
                              ];
                              const rows = [];
                              for (let i = 0; i < fields.length; i += 2) {
                                const [label1, value1] = fields[i];
                                const pair = fields[i + 1];
                                const label2 = pair ? pair[0] : '';
                                const value2 = pair ? pair[1] : '';
                                rows.push(
                                  <TableRow key={label1} sx={{ backgroundColor: (i / 2) % 2 === 0 ? 'action.hover' : 'background.paper' }}>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{label1}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{value1 || '-'}</TableCell>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{label2}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{value2 || '-'}</TableCell>
                                  </TableRow>
                                );
                              }
                              return rows;
                            })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                  {infoTab === 'health' && (
                    <>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Health & Admission</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {(() => {
                              const fields = [
                                ['Blood Group', selectedStudent.blood_group],
                                ['Status', selectedStudent.status],
                                ['Admission Date', selectedStudent.admission_date],
                                ['Weight (kg)', selectedStudent.weight_kg?.toString()],
                                ['Height (cm)', selectedStudent.height_cm?.toString()],
                                ['HB Range', selectedStudent.hb_range],
                                ['Medical Conditions', selectedStudent.medical_conditions],
                                ['Emergency Contact Person', selectedStudent.emergency_contact_person],
                                ['Emergency Contact', selectedStudent.emergency_contact],
                                ['Vaccination Certificate', selectedStudent.vaccination_certificate],
                              ];
                              const rows = [];
                              for (let i = 0; i < fields.length; i += 2) {
                                const [label1, value1] = fields[i];
                                const pair = fields[i + 1];
                                const label2 = pair ? pair[0] : '';
                                const value2 = pair ? pair[1] : '';
                                rows.push(
                                  <TableRow key={label1} sx={{ backgroundColor: (i / 2) % 2 === 0 ? 'action.hover' : 'background.paper' }}>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{label1}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{value1 || '-'}</TableCell>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{label2}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{value2 || '-'}</TableCell>
                                  </TableRow>
                                );
                              }
                              return rows;
                            })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                  {infoTab === 'documents' && (
                    <>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Documents</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {(() => {
                              const docKeys = [
                                'birth_certificate', 'transfer_certificate', 'previous_academic_records', 'address_proof',
                                'id_proof', 'passport_photo', 'medical_certificate', 'vaccination_certificate',
                                'other_documents'
                              ];
                              const rows = [];
                              for (let i = 0; i < docKeys.length; i += 2) {
                                const docKey1 = docKeys[i];
                                const docKey2 = docKeys[i + 1];
                                rows.push(
                                  <TableRow key={docKey1} sx={{ backgroundColor: (i / 2) % 2 === 0 ? 'action.hover' : 'background.paper' }}>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{docKey1.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{renderDocumentLink(docKey1.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), docKey1 as keyof DocumentUrls)}</TableCell>
                                    <TableCell sx={{ fontWeight: 500, width: '18%' }}>{docKey2 ? docKey2.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : ''}</TableCell>
                                    <TableCell sx={{ width: '32%' }}>{docKey2 ? renderDocumentLink(docKey2.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), docKey2 as keyof DocumentUrls) : ''}</TableCell>
                                  </TableRow>
                                );
                              }
                              return rows;
                            })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={300}>
                  <Typography variant="body1" color="text.secondary">No student selected or found</Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Stack>
      </Stack>

      <Dialog
        open={importDialogOpen}
        onClose={() => {
          // Automatically clear the file selection when dialog is closed
          console.log('[Import] Closing import dialog');
          setImportDialogOpen(false);
          setValidationStep('initial');
          setHeaderMismatches([]);
          setStudentsToImport([]);
          setDuplicateDetails({ fileDuplicates: [], dbDuplicates: [] });
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        maxWidth="md"
        fullWidth
      >


        <DialogTitle>Import Students</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Select Class for Import"
              value={headerSelectedClass}
              onChange={(e) => setHeaderSelectedClass(e.target.value as string)}
              required
            >
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.class_name}>
                  {cls.class_name}
                </MenuItem>
              ))}
            </TextField>

            {headerSelectedClass && (
              <>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                  sx={{ mb: 2 }}
                  disabled={!headerSelectedClass}
                >
                  Download Template
                </Button>

                <Typography variant="body1">
                  Upload your Excel file with student data:
                </Typography>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                />

                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                >
                  Select Excel File
                  <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                  />
                </Button>

                {file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected file: {file.name}
                  </Typography>
                )}

                {validationStep === 'headers' && headerMismatches.length > 0 && (
                  <Box>
                    <Typography color="error" gutterBottom>
                      The following header issues were found in the file:
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Expected Header</TableCell>
                            <TableCell>Found in File</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {headerMismatches.map((mismatch, index) => (
                            <TableRow key={index}>
                              <TableCell>{mismatch.expected || '-'}</TableCell>
                              <TableCell>{mismatch.found || '-'}</TableCell>
                              <TableCell>
                                {mismatch.expected && !mismatch.found ? (
                                  <Typography color="error">Missing</Typography>
                                ) : !mismatch.expected && mismatch.found ? (
                                  <Typography color="warning.main">Extra</Typography>
                                ) : (
                                  <Typography color="error">Mismatch</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Please correct the headers in your file to match the template and try again.
                    </Typography>
                  </Box>
                )}

                {validationStep === 'file-duplicates' && (
                  <Box>
                    <Typography color="error" gutterBottom>
                      The following duplicate student records were found within the file:
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>GR Number</TableCell>
                            <TableCell>Roll Number</TableCell>
                            <TableCell>Student Name</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {duplicateDetails.fileDuplicates.map((student, index) => (
                            <TableRow key={`file-duplicate-${index}`}>
                              <TableCell>{student.gr_number}</TableCell>
                              <TableCell>{student.roll_number || '-'}</TableCell>
                              <TableCell>{student.full_name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography variant="body2" sx={{ mt: 2, color: 'error.main' }}>
                      Import cannot proceed until all duplicate records within the file are resolved.
                    </Typography>
                  </Box>
                )}

                {validationStep === 'db-duplicates' && (
                  <Box>
                    <Typography color="error" gutterBottom>
                      The following students already exist in the database:
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>GR Number</TableCell>
                            <TableCell>Roll Number</TableCell>
                            <TableCell>Student Name</TableCell>
                            <TableCell>Existing Class</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {duplicateDetails.dbDuplicates.map((student, index) => {
                            const existingStudent = students.find(s =>
                              s.gr_number === student.gr_number ||
                              (student.roll_number && s.roll_number === student.roll_number)
                            );
                            return (
                              <TableRow key={`db-duplicate-${index}`}>
                                <TableCell>{student.gr_number}</TableCell>
                                <TableCell>{student.roll_number || '-'}</TableCell>
                                <TableCell>{student.full_name}</TableCell>
                                <TableCell>
                                  {existingStudent ? classMap[existingStudent.class_id] : 'Unknown'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography variant="body2" sx={{ mt: 2, color: 'error.main' }}>
                      Import cannot proceed until all duplicate records with existing students are resolved.
                    </Typography>
                  </Box>
                )}

                {validationStep === 'class-mismatch' && (
                  <Box>
                    <Typography color="error" gutterBottom>
                      The following students have class mismatches (Selected class: {classes.find(c => normalizeClassName(c.class_name) === headerSelectedClass)?.class_name}):
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>GR Number</TableCell>
                            <TableCell>Student Name</TableCell>
                            <TableCell>File Class</TableCell>
                            <TableCell>Selected Class</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {studentsToImport.map((student, index) => (
                            <TableRow key={`class-mismatch-${index}`}>
                              <TableCell>{student.gr_number}</TableCell>
                              <TableCell>{student.full_name}</TableCell>
                              <TableCell>
                                {student.class_id}
                              </TableCell>
                              <TableCell>
                                {classes.find(c => normalizeClassName(c.class_name) === headerSelectedClass)?.class_name}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography variant="body2" sx={{ mt: 2, color: 'error.main' }}>
                      All students must belong to the selected class ({classes.find(c => normalizeClassName(c.class_name) === headerSelectedClass)?.class_name}) to be imported.
                    </Typography>
                  </Box>
                )}

                {validationStep === 'ready' && (
                  <Box>
                    <Typography color="success.main" gutterBottom>
                      File validation successful!
                    </Typography>
                    <Typography variant="body2">
                      Ready to import {studentsToImport.length} students into {classes.find(c => c.class_name === headerSelectedClass)?.class_name}.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      <strong>Students to be imported:</strong>
                    </Typography>
                    <TableContainer component={Paper} sx={{ mt: 1, maxHeight: 400, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>GR Number</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Class</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {studentsToImport.map((student, index) => (
                            <TableRow key={`preview-${index}`}>
                              <TableCell>{student.gr_number}</TableCell>
                              <TableCell>{student.full_name}</TableCell>
                              <TableCell>{classes.find(c => c.class_name === headerSelectedClass)?.class_name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            console.log('[Import] Cancelling import');
            setImportDialogOpen(false);
            setValidationStep('initial');
            setHeaderMismatches([]);
            setStudentsToImport([]);
            setDuplicateDetails({ fileDuplicates: [], dbDuplicates: [] });
            setFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}>Cancel</Button>

          {headerSelectedClass && (
            validationStep === 'headers' ||
              validationStep === 'file-duplicates' ||
              validationStep === 'db-duplicates' ? (
              <Button
                onClick={handleImportSubmit}
                variant="contained"
                color="warning"
              >
                Revalidate
              </Button>
            ) : validationStep === 'ready' ? (
              <Button
                onClick={handleConfirmImport}
                variant="contained"
                color="success"
              >
                Confirm Import
              </Button>
            ) : (
              <Button
                onClick={handleImportSubmit}
                variant="contained"
                disabled={!file}
              >
                Validate
              </Button>
            )
          )}
        </DialogActions>
      </Dialog>

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
      <Snackbar open={searchAlert.open} autoHideDuration={3000} onClose={() => setSearchAlert(a => ({ ...a, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSearchAlert(a => ({ ...a, open: false }))} severity={searchAlert.severity} sx={{ width: '100%' }}>
          {searchAlert.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}