import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';

import { InputAdornment } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
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
  id?: number; // or string, depending on your backend
  class_name: string;
  academic_years: number; // This seems to be the ID of the academic year
  status: string;
  created_at?: string;
  updated_at?: string;
  academic_year_details?: AcademicYear; // Using your existing AcademicYear interface
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
  id: number; // Make sure this is properly typed
  academic_year: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  const [missingClasses, setMissingClasses] = useState<{ className: string, academicYear: string }[]>([]);
  const [duplicateGrNumbers, setDuplicateGrNumbers] = useState<{ grNumber: string, studentName: string }[]>([]);
 const [studentsToImport, setStudentsToImport] = useState<Student[]>([]);
  const [searchAlert, setSearchAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

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
    if (!selectedStudentId) return;
    try {
      const dataUrl = await invoke<string>('get_student_document_base64', { fileName: filename });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadStatus({ success: true, message: 'Download started successfully' });
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadStatus({ success: false, message: 'Failed to download document' });
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
        const [classes, studentsData] = await Promise.all([
          invoke<{ id: string, class_name: string }[]>('get_all_classes'),
          invoke<Student[]>('get_students', { id: null })
        ]);
        // console.log(studentsData);

        const newClassMap = classes.reduce((acc, cls) => ({ ...acc, [cls.id]: cls.class_name }), {} as Record<string, string>);

        if (studentsData.length > 0) {
          const urls: Record<number, DocumentUrls> = {};
          for (const student of studentsData) {
            urls[student.id] = await getDocumentPaths(student);
          }
          setDocumentUrls(urls);
        }

        setClassMap(newClassMap);
        setStudents(studentsData);
        setSelectedStudentId(prev => prev !== null ? prev : (studentsData[0]?.id || null));
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
      setGrNumber(''); // Clear after use
    }
  }, [grNumber, students, setGrNumber]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

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
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Box>
    </DashboardContent>
  );


  // const handleImportClick = () => {
  //   setImportDialogOpen(true);
  //   setMissingClasses([]);
  //   setDuplicateGrNumbers([]);
  //   setStudentsToImport([]);
  // };
  // const handleDownloadTemplate = async () => {
  //   try {
  //     const publicPath = '/assets/Student_Data.xlsx';
  //     const response = await fetch(publicPath);

  //     if (!response.ok) throw new Error('Failed to fetch template');

  //     const blob = await response.blob();
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'Student_Import_Template.xlsx';
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     window.URL.revokeObjectURL(url);

  //     setSnackbar({
  //       open: true,
  //       message: 'Template downloaded successfully',
  //       severity: 'success'
  //     });
  //   } catch (err) {
  //     console.error("Failed to download template:", err);
  //     setSnackbar({
  //       open: true,
  //       message: 'Failed to download template file. Make sure Student_Data.xlsx exists in public/assets/',
  //       severity: 'error'
  //     });
  //   }
  // };
  // const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) {
  //     setSnackbar({ open: true, message: 'No file selected', severity: 'error' });
  //     return;
  //   }

  //   // Reset previous state
  //   setMissingClasses([]);
  //   setDuplicateGrNumbers([]);
  //   setStudentsToImport([]);

  //   // File type validation
  //   const validExtensions = ['.xlsx', '.xls'];
  //   const fileExtension = file.name.split('.').pop()?.toLowerCase();

  //   if (!fileExtension || !validExtensions.includes(`.${fileExtension}`)) {
  //     setSnackbar({
  //       open: true,
  //       message: 'Please select a valid Excel file (.xlsx or .xls)',
  //       severity: 'error'
  //     });
  //     return;
  //   }

  //   const requiredHeaders = [
  //     'gr_number', 'roll_number', 'full_name', 'dob', 'gender',
  //     'mother_name', 'father_name', 'father_occupation', 'mother_occupation',
  //     'annual_income', 'nationality', 'class_name', 'section', 'academic_year',
  //     'email', 'mobile_number', 'alternate_contact_number', 'address', 'city',
  //     'state', 'country', 'postal_code', 'guardian_contact_info', 'blood_group',
  //     'status', 'admission_date', 'weight_kg', 'height_cm', 'hb_range',
  //     'medical_conditions', 'emergency_contact_person', 'emergency_contact', 'profile_image'
  //   ];

  //   const mandatoryHeaders = [
  //     'gr_number', 'full_name', 'gender', 'mother_name', 'father_name', 'class_name', 'academic_year'
  //   ];

  //   const reader = new FileReader();
  //   reader.onload = async (loadEvent: ProgressEvent<FileReader>) => {
  //     if (!loadEvent.target?.result) {
  //       setSnackbar({ open: true, message: 'Error reading file', severity: 'error' });
  //       return;
  //     }

  //     try {
  //       const data = new Uint8Array(loadEvent.target.result as ArrayBuffer);
  //       const workbook = XLSX.read(data, { type: 'array' });
  //       const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  //       // Get headers
  //       const excelHeaders: string[] = [];
  //       const range = XLSX.utils.decode_range(firstSheet['!ref'] || '');

  //       for (let C = range.s.c; C <= range.e.c; ++C) {
  //         const cell = firstSheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
  //         if (cell && cell.t) {
  //           excelHeaders.push(cell.v.toString().toLowerCase().replace(/ /g, '_'));
  //         }
  //       }

  //       // Validate headers
  //       const missingMandatoryHeaders = mandatoryHeaders.filter(
  //         header => !excelHeaders.includes(header)
  //       );

  //       if (missingMandatoryHeaders.length > 0) {
  //         setSnackbar({
  //           open: true,
  //           message: `Missing mandatory columns: ${missingMandatoryHeaders.join(', ')}`,
  //           severity: 'error'
  //         });
  //         return;
  //       }

  //       const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

  //       if (jsonData.length === 0) {
  //         setSnackbar({
  //           open: true,
  //           message: 'The file is empty. Please fill in student data.',
  //           severity: 'error'
  //         });
  //         return;
  //       }

  //       // Check for duplicate GR numbers in Excel
  //       const grNumbers = new Set<string>();
  //       const duplicateRows: number[] = [];

  //       for (let i = 0; i < jsonData.length; i++) {
  //         const row = jsonData[i];
  //         const grNumber = row['gr_number']?.toString() || '';

  //         if (!grNumber) {
  //           setSnackbar({
  //             open: true,
  //             message: `Row ${i + 2} is missing GR Number (required field)`,
  //             severity: 'error'
  //           });
  //           return;
  //         }

  //         if (grNumbers.has(grNumber)) {
  //           duplicateRows.push(i + 2);
  //         } else {
  //           grNumbers.add(grNumber);
  //         }
  //       }

  //       if (duplicateRows.length > 0) {
  //         setSnackbar({
  //           open: true,
  //           message: `Duplicate GR Numbers found at rows: ${duplicateRows.join(', ')}. GR Numbers must be unique.`,
  //           severity: 'error'
  //         });
  //         return;
  //       }

  //       // Check for existing GR numbers in database
  //       const existingStudents = await invoke<Student[]>('get_students', { id: null });
  //       const existingGrNumbers = new Set(existingStudents.map(s => s.gr_number));

  //       const duplicateGrNumbersInDb: { grNumber: string, studentName: string }[] = [];
  //       for (const grNumber of grNumbers) {
  //         if (existingGrNumbers.has(grNumber)) {
  //           const student = existingStudents.find(s => s.gr_number === grNumber);
  //           duplicateGrNumbersInDb.push({
  //             grNumber,
  //             studentName: student?.full_name || 'Unknown'
  //           });
  //         }
  //       }

  //       if (duplicateGrNumbersInDb.length > 0) {
  //         setDuplicateGrNumbers(duplicateGrNumbersInDb);
  //         setSnackbar({
  //           open: true,
  //           message: `${duplicateGrNumbersInDb.length} GR numbers already exist in database. Please resolve conflicts.`,
  //           severity: 'error'
  //         });
  //         return;
  //       }

  //       // Check for existing classes
  //       const existingClasses = await invoke<Class[]>('get_all_classes');
  //       const missingClassesList: { className: string, academicYear: string }[] = [];
  //       const classYearPairs = new Map<string, { className: string, academicYearStr: string }>();

  //       for (const row of jsonData) {
  //         const className = row['class_name']?.toString()?.trim() || '';
  //         const academicYearStr = row['academic_year']?.toString()?.trim() || '';

  //         if (!className) {
  //           setSnackbar({
  //             open: true,
  //             message: 'Missing class_name in one or more rows',
  //             severity: 'error'
  //           });
  //           return;
  //         }

  //         if (!academicYearStr) {
  //           setSnackbar({
  //             open: true,
  //             message: 'Missing academic_year in one or more rows',
  //             severity: 'error'
  //           });
  //           return;
  //         }

  //         const key = `${className.toLowerCase()}_${academicYearStr}`;
  //         if (!classYearPairs.has(key)) {
  //           classYearPairs.set(key, { className, academicYearStr });

  //           const classExists = existingClasses.some(c =>
  //             c.class_name.toLowerCase() === className.toLowerCase() &&
  //             c.academic_year_details?.academic_year === academicYearStr
  //           );

  //           if (!classExists) {
  //             missingClassesList.push({ className, academicYear: academicYearStr });
  //           }
  //         }
  //       }

  //       if (missingClassesList.length > 0) {
  //         setMissingClasses(missingClassesList);
  //         setSnackbar({
  //           open: true,
  //           message: `${missingClassesList.length} classes not found. Please create them first.`,
  //           severity: 'error'
  //         });
  //         return;
  //       }

  //       // Prepare student data for import
  //       const preparedStudents = jsonData.map(row => {
  //         const className = row['class_name']?.toString()?.trim() || '';
  //         const academicYearStr = row['academic_year']?.toString()?.trim() || '';

  //         const existingClass = existingClasses.find(c =>
  //           c.class_name.toLowerCase() === className.toLowerCase() &&
  //           c.academic_year_details?.academic_year === academicYearStr
  //         );

  //         return {
  //           gr_number: row['gr_number']?.toString()?.trim() || '',
  //           roll_number: row['roll_number']?.toString()?.trim(),
  //           full_name: row['full_name']?.toString()?.trim() || '',
  //           dob: row['dob']?.toString()?.trim(),
  //           gender: row['gender']?.toString()?.trim() || '',
  //           mother_name: row['mother_name']?.toString()?.trim() || '',
  //           father_name: row['father_name']?.toString()?.trim() || '',
  //           father_occupation: row['father_occupation']?.toString()?.trim(),
  //           mother_occupation: row['mother_occupation']?.toString()?.trim(),
  //           annual_income: row['annual_income'] ? parseFloat(row['annual_income'].toString()) : null,
  //           nationality: row['nationality']?.toString()?.trim(),
  //           profile_image: row['profile_image']?.toString()?.trim(),
  //           class_id: existingClass?.id || 0,
  //           section: row['section']?.toString()?.trim(),
  //           academic_year: academicYearStr,
  //           email: row['email']?.toString()?.trim(),
  //           mobile_number: row['mobile_number']?.toString()?.trim(),
  //           alternate_contact_number: row['alternate_contact_number']?.toString()?.trim(),
  //           address: row['address']?.toString()?.trim(),
  //           city: row['city']?.toString()?.trim(),
  //           state: row['state']?.toString()?.trim(),
  //           country: row['country']?.toString()?.trim(),
  //           postal_code: row['postal_code']?.toString()?.trim(),
  //           guardian_contact_info: row['guardian_contact_info']?.toString()?.trim(),
  //           blood_group: row['blood_group']?.toString()?.trim(),
  //           status: row['status']?.toString()?.trim() || 'active',
  //           admission_date: row['admission_date']?.toString()?.trim(),
  //           weight_kg: row['weight_kg'] ? parseFloat(row['weight_kg'].toString()) : null,
  //           height_cm: row['height_cm'] ? parseFloat(row['height_cm'].toString()) : null,
  //           hb_range: row['hb_range']?.toString()?.trim(),
  //           medical_conditions: row['medical_conditions']?.toString()?.trim(),
  //           emergency_contact_person: row['emergency_contact_person']?.toString()?.trim(),
  //           emergency_contact: row['emergency_contact']?.toString()?.trim(),
  //           birth_certificate: row['birth_certificate']?.toString()?.trim(),
  //           transfer_certificate: row['transfer_certificate']?.toString()?.trim(),
  //           previous_academic_records: row['previous_academic_records']?.toString()?.trim(),
  //           address_proof: row['address_proof']?.toString()?.trim(),
  //           id_proof: row['id_proof']?.toString()?.trim(),
  //           passport_photo: row['passport_photo']?.toString()?.trim(),
  //           medical_certificate: row['medical_certificate']?.toString()?.trim(),
  //           vaccination_certificate: row['vaccination_certificate']?.toString()?.trim(),
  //           other_documents: row['other_documents']?.toString()?.trim(),
  //         };
  //       });

  //       setStudentsToImport(preparedStudents);
  //       setSnackbar({
  //         open: true,
  //         message: 'File validated successfully. Click Submit to import.',
  //         severity: 'success'
  //       });

  //     } catch (err) {
  //       console.error('Error processing Excel file:', err);
  //       setSnackbar({
  //         open: true,
  //         message: `Error processing the Excel file: ${err instanceof Error ? err.message : String(err)}`,
  //         severity: 'error'
  //       });
  //     }
  //   };

  //   reader.readAsArrayBuffer(file);
  // };
  // const handleSubmitImport = async () => {
  //   if (!studentsToImport || studentsToImport.length === 0) {
  //     setSnackbar({
  //       open: true,
  //       message: 'No valid student data to import',
  //       severity: 'error'
  //     });
  //     return;
  //   }

  //   try {
  //     const studentIds = await invoke<number[]>('excel_bulk_insert', { students: studentsToImport });

  //     setSnackbar({
  //       open: true,
  //       message: `Successfully imported ${studentIds.length} students`,
  //       severity: 'success'
  //     });

  //     // Refresh student list
  //     const updatedStudents = await invoke<Student[]>('get_students', { id: null });
  //     setStudents(updatedStudents);
  //     setImportDialogOpen(false);
  //     setStudentsToImport([]);

  //   } catch (err) {
  //     console.error('Failed to import students:', err);
  //     setSnackbar({
  //       open: true,
  //       message: `Failed to import students: ${err instanceof Error ? err.message : String(err)}`,
  //       severity: 'error'
  //     });
  //   }
  // };

  
  return (
    <DashboardContent>
      <Stack spacing={2}>
        {downloadStatus && <Alert severity={downloadStatus.success ? "success" : "error"}>{downloadStatus.message}</Alert>}

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={700}>Student Management</Typography>
          <Stack direction="row" spacing={2}>
            {/* <Button
              variant="contained"
              color="success"
              onClick={handleImportClick}
            >
              Import Student
            </Button> */}
            <Button variant="contained" onClick={() => navigate('/dashboard/student/add')}>Add Student</Button>
            <Button variant="outlined" disabled={!selectedStudentId} onClick={() => navigate(`/dashboard/student/add/${selectedStudentId}`)}>Edit</Button>
            <Button variant="outlined" color="error" disabled={!selectedStudentId} onClick={handleDelete}>Delete</Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Card sx={{ width: '30%', p: 2, bgcolor: '#f7f9fb', height: cardHeight || 600 }}>
            <TextField fullWidth size="small" label="Search Students" sx={{ mb: 2 }} />
            <Box sx={{ overflowY: 'auto', maxHeight: cardHeight ? cardHeight - 80 : 520 }}>
              {students.length > 0 ? (
                <List>
                  {students.map((s) => (
                    <ListItem disablePadding key={s.id}>
                      <ListItemButton selected={selectedStudentId === s.id} onClick={() => setSelectedStudentId(s.id)}>
                        <ListItemAvatar>
                          <Avatar src={documentUrls[s.id]?.passport_photo || "/assets/avatars/avatar_1.jpg"} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography fontWeight={600}>{s.full_name}</Typography>}
                          secondary={`Class: ${classMap[s.class_id] || `Class ${s.class_id}`}`}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={300}>
                  <Typography variant="body1" color="text.secondary">No students found</Typography>
                </Box>
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
                        <Table >
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

      {/* <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Students</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Typography variant="body1">
              Download the template file, fill in student data, then import it.
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleDownloadTemplate}
                startIcon={<DownloadIcon />}
                sx={{ flexShrink: 0 }}
              >
                Download Template
              </Button>

              <Box sx={{ position: 'relative', flexGrow: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Select Excel File"
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <UploadIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          component="span"
                          sx={{
                            textTransform: 'none',
                            pointerEvents: 'none'
                          }}
                        >
                          Browse
                        </Button>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      paddingLeft: '14px',
                      cursor: 'pointer',
                      backgroundColor: 'background.paper',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }
                  }}
                />
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  style={{
                    opacity: 0,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
              </Box>
            </Box>
          </Stack>

          {missingClasses.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography color="error" variant="subtitle1" gutterBottom>
                The following classes need to be created first:
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Class Name</TableCell>
                      <TableCell>Academic Year</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {missingClasses.map((cls, index) => (
                      <TableRow key={index}>
                        <TableCell>{cls.className}</TableCell>
                        <TableCell>{cls.academicYear}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {duplicateGrNumbers.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography color="error" variant="subtitle1" gutterBottom>
                The following GR numbers already exist:
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>GR Number</TableCell>
                      <TableCell>Student Name</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {duplicateGrNumbers.map((gr, index) => (
                      <TableRow key={index}>
                        <TableCell>{gr.grNumber}</TableCell>
                        <TableCell>{gr.studentName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitImport}
            disabled={!studentsToImport || studentsToImport.length === 0}
          >
            Submit Import
          </Button>
        </DialogActions>
      </Dialog> */}
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