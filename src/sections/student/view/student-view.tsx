import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useMemo } from 'react';

import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Box, Card, Stack, Button, Typography, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Paper,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  FormControl, InputLabel, Select, TextField, MenuItem, CircularProgress, Snackbar
} from '@mui/material';

import { handleDownloadTemplate, handleFileChange } from 'src/utils/excel - template';

import { DashboardContent } from 'src/layouts/dashboard';
import { useStudentSearch } from 'src/contexts/StudentSearchContext';

import { StudentList } from 'src/sections/student/view/StudentList';
import { StudentPreview } from 'src/sections/student/view/studentpreview';

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
}

type DocumentUrls = {
  [key: string]: string | undefined;
};

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export function StudentView() {
  const navigate = useNavigate();
  const { grNumber, setGrNumber } = useStudentSearch();
  //  filteration of student on class selcetion start
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //  filteration of student on class selcetion end
  const [documentUrls, setDocumentUrls] = useState<Record<number, DocumentUrls>>({});
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [studentsToImport, setStudentsToImport] = useState<Student[]>([]);
  const [headerSelectedClass, setHeaderSelectedClass] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [headerMismatches, setHeaderMismatches] = useState<{ expected: string, found: string | null }[]>([]);
  const [validationStep, setValidationStep] = useState<'initial' | 'headers' | 'file-duplicates' | 'db-duplicates' | 'class-mismatch' | 'ready'>('initial');
  const [duplicateDetails, setDuplicateDetails] = useState<{ fileDuplicates: Student[], dbDuplicates: Student[] }>({ fileDuplicates: [], dbDuplicates: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);

  const updateStudentInList = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s
      )
    );
  };


  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedStudentId(null); // Reset selected student when changing class

    if (!classId) {
      // If no class selected, show all students
      setFilteredStudents(students);
      return;
    }

    // Filter students by class_id
    const filtered = students.filter(student =>
      String(student.class_id) === String(classId)
    );

    setFilteredStudents(filtered);

    // Auto-select first student in filtered list if available
    if (filtered.length > 0) {
      setSelectedStudentId(filtered[0].id);
    }
  };
  // Selected student data
  const selectedStudent = useMemo(() =>
    students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );
  // Handle student deletion
  const handleDelete = async () => {
    if (!selectedStudentId) {
      setSnackbar({
        open: true,
        message: 'No student selected',
        severity: 'warning'
      });
      return;
    }
    try {
      setLoading(true);
      await invoke('delete_student', { id: selectedStudentId });
      const updatedStudents = await invoke<Student[]>('get_students', { id: null });
      setStudents(updatedStudents);

      setSnackbar({
        open: true,
        message: 'Student deleted successfully',
        severity: 'success'
      });
    } catch (err) {  // Changed from 'error' to 'err'
      console.error('Delete failed:', err);
      setSnackbar({
        open: true,
        message: typeof err === 'string' ? err : 'Failed to delete student',
        severity: 'error'
      });
    }
  };


  const studentListProps = {
    students: filteredStudents,
    classMap,
    classes,
    selectedStudentId,
    loading,
    error,
    documentUrls,
    onStudentSelect: setSelectedStudentId,
    selectedClass,
    onClassChange: handleClassChange
  };

  // Props for StudentPreview
  const studentPreviewProps = {
    Student: selectedStudent ? [selectedStudent] : [],
    documentUrls: selectedStudentId ? documentUrls[selectedStudentId] : {},
    classMap,
    onEdit: () => selectedStudentId && navigate(`/dashboard/student/add/${selectedStudentId}`),
    onDelete: handleDelete,
    onStudentUpdate: updateStudentInList, // ✔️ Add it here

  };

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classesData, studentsData] = await Promise.all([
          invoke<Class[]>('get_active_classes'),
          invoke<Student[]>('get_students', { id: null }),
        ]);

        const newClassMap = classesData.reduce((acc, cls) => ({
          ...acc,
          [cls.id]: cls.class_name
        }), {} as Record<string, string>);

        setClasses(classesData);
        setClassMap(newClassMap);
        setStudents(studentsData);
        setFilteredStudents(studentsData); // Initialize with all students

        // Auto-select first student if available
        if (studentsData.length > 0) {
          setSelectedStudentId(studentsData[0].id);
        }
      } catch (err) {
        setError('Failed to load student data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch table headers
  useEffect(() => {
    invoke<string[]>('get_student_headers')
      .then(setTableHeaders)
      .catch(err => {
        console.error("Failed to fetch table headers:", err);
        setSnackbar({ open: true, message: "Failed to load table headers", severity: "error" });
      });
  }, []);

  // Validate headers for import
  const validateHeaders = (fileHeaders: string[]) => {
    if (tableHeaders.length === 0) return { isValid: false, message: "Table headers not loaded" };
    const missingHeaders = tableHeaders.filter(header =>
      !fileHeaders.some(fh => fh.toLowerCase() === header.toLowerCase())
    );
    if (missingHeaders.length > 0) {
      return {
        isValid: false,
        message: `Missing required headers: ${missingHeaders.join(', ')}`,
        missingHeaders,
      };
    }
    return { isValid: true, message: "" };
  };

  // Validate import file
  const validateFile = async () => {
    if (!file || !headerSelectedClass) {
      setSnackbar({ open: true, message: 'Please select a file and class first', severity: 'error' });
      return;
    }

    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        setSnackbar({ open: true, message: 'File is empty or has no data', severity: 'error' });
        return;
      }

      const fileHeaders = jsonData[0] as string[];
      const fileRows = jsonData.slice(1) as any[][];

      const headerValidation = validateHeaders(fileHeaders);
      if (!headerValidation.isValid) {
        setValidationData({
          type: 'header',
          message: headerValidation.message,
          data: headerValidation.missingHeaders || [],
        });
        setSnackbar({ open: true, message: headerValidation.message, severity: 'error' });
        return;
      }

      const selectedClassObj = classes.find(c => c.class_name === headerSelectedClass);
      if (!selectedClassObj) throw new Error("Selected class not found");

      const studentsData = fileRows.map((row) => {
        const student: Partial<Student> = { class_id: selectedClassObj.id };
        fileHeaders.forEach((header, colIndex) => {
          const key = header as keyof Student;
          const value = row[colIndex];
          if (value !== undefined && value !== null && value !== '') {
            (student as any)[key] = String(value);
          }
        });
        return student as Student;
      });

      setStudentsToImport(studentsData);
      setValidationData({
        type: 'success',
        message: `Validation successful. ${studentsData.length} students ready to import`,
        data: [],
      });
      setValidationStep('ready');
      setSnackbar({
        open: true,
        message: `Validation successful. ${studentsData.length} students ready to import`,
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Error processing file: ' + (err as Error).message, severity: 'error' });
    } finally {
      setImportLoading(false);
    }
  };

  // Submit import
  const handleSubmitImport = async () => {
    if (!headerSelectedClass || studentsToImport.length === 0) {
      setSnackbar({ open: true, message: 'No students data to import', severity: 'error' });
      return;
    }

    setImportLoading(true);
    try {
      const selectedClassObj = classes.find(c => c.class_name === headerSelectedClass);
      if (!selectedClassObj) throw new Error("Selected class not found");

      const result = await invoke('bulk_create_students', {
        students: studentsToImport,
        classId: selectedClassObj.id
      });

      if (result) {
        setSnackbar({
          open: true,
          message: `Successfully imported ${studentsToImport.length} students`,
          severity: 'success'
        });
        setImportDialogOpen(false);
        const updatedStudents = await invoke<Student[]>('get_students', { id: null });
        setStudents(updatedStudents);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error importing students: ' + (err as Error).message,
        severity: 'error'
      });
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) return (
    <DashboardContent>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    </DashboardContent>
  );

  if (error) return (
    <DashboardContent>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity="error">{error}</Alert>
      </Box>
    </DashboardContent>
  );

  return (
    <DashboardContent>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={700}>Student Management</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import Students
            </Button>
            <Button variant="contained" onClick={() => navigate('/dashboard/student/add')}>
              Add Student
            </Button>
            <Button
              variant="outlined"
              onClick={() => selectedStudentId && navigate(`/dashboard/student/add/${selectedStudentId}`)}
              disabled={!selectedStudentId}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              disabled={!selectedStudentId || loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Delete
            </Button>
          </Stack>
        </Stack>



        <Stack direction="row" spacing={2} alignItems="flex-start">

          <Card sx={{ width: '30%', p: 2, bgcolor: '#f7f9fb', height: '120vh' }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Select Class"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              sx={{ maxWidth: 300 }} // ✅ valid use of `sx`
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.class_name}
                </MenuItem>
              ))}
            </TextField>
            <StudentList {...studentListProps} />
          </Card>

          <Card
            sx={{
              width: '70%',
              borderRadius: 3,
              maxHeight: '120vh',
              height: 'auto'
            }}
          >
            <StudentPreview {...studentPreviewProps} />
          </Card>
        </Stack>
      </Stack>

      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportDialogOpen(false);
          setValidationStep('initial');
          setStudentsToImport([]);
          setFile(null);
          setValidationData(null);
          setFileName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Students</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Class</InputLabel>
              <Select
                value={headerSelectedClass}
                onChange={(e) => setHeaderSelectedClass(e.target.value as string)}
                label="Select Class"
              >
                {classes.map((cls) => (
                  <MenuItem key={cls.id} value={cls.class_name}>
                    {cls.class_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {headerSelectedClass && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => handleDownloadTemplate({
                    headerSelectedClass,
                    classes,
                    setSnackbar
                  })}
                  startIcon={<DownloadIcon />}
                >
                  Download Template
                </Button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e, {
                    setFile,
                    setFileName,
                    setStudentsToImport,
                    setValidationStep,
                    setHeaderMismatches,
                    setDuplicateDetails,
                    setSnackbar
                  })}
                  accept=".xls,.xlsx"
                  style={{ display: 'none' }}
                />
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<UploadIcon />}
                >
                  Select File
                </Button>

                {fileName && (
                  <Typography variant="body2">
                    Selected file: {fileName}
                  </Typography>
                )}

                {validationData && (
                  <Box mt={2}>
                    <Typography
                      variant="h6"
                      color={validationData.type === 'success' ? 'success.main' : 'error.main'}
                    >
                      {validationData.message}
                    </Typography>
                  </Box>
                )}

                {validationStep === 'ready' && (
                  <Box mt={2}>
                    <Typography variant="body2">
                      Ready to import {studentsToImport.length} students into {headerSelectedClass}.
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
          {headerSelectedClass && (
            validationStep === 'ready' ? (
              <Button
                onClick={handleSubmitImport}
                variant="contained"
                color="success"
                disabled={importLoading}
              >
                {importLoading ? <CircularProgress size={24} /> : 'Confirm Import'}
              </Button>
            ) : (
              <Button
                onClick={validateFile}
                variant="contained"
                disabled={!file || importLoading}
              >
                {importLoading ? <CircularProgress size={24} /> : 'Validate'}
              </Button>
            )
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}