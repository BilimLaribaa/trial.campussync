import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

type Student = {
  id: number;
  gr_number: string;
  roll_number: string;
  full_name: string;
  dob: string;
  gender: string;
  mother_name: string;
  father_name: string;
  father_occupation: string;
  mother_occupation: string;
  annual_income: number;
  nationality: string;
  profile_image: string;
  class_id: string;
  section: string;
  academic_year: string;
  email: string;
  mobile_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  blood_group: string;
  status: string;
  admission_date: string;
};

type Class = {
  id: number;
  name: string;
};

export function IdCardView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [successMessage, setSuccessMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Helper function to get class name by ID
  const getClassNameById = (classId: string) => {
    const foundClass = classes.find(cls => cls.id.toString() === classId);
    return foundClass ? foundClass.name : classId;
  };

 

  const fetchClasses = async () => {
    try {
      const data = await invoke<Class[]>('get_all_classes');
      setClasses(data);
      console.log(data);
      
    } catch (error) {
      console.error('Error fetching classes:', error);
      setSuccessMessage('Failed to load classes');
      setShowToast(true);
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Student[]>('get_all_students_for_idcards');
      console.log(data);
      
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setSuccessMessage('Failed to load students');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  const handleClassChange = (event: SelectChangeEvent) => {
    setSelectedClass(event.target.value);
    setPage(0);
  };

  const handleGenerateIdCard = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleGenerateAll = () => {
    const targetStudents = selectedClass 
      ? students.filter(s => s.class_id === selectedClass)
      : students;
    
    setSuccessMessage(
      `Generating ID cards for ${targetStudents.length} student(s)` +
      (selectedClass ? ` in class ${getClassNameById(selectedClass)}` : '')
    );
    setShowToast(true);
  };

  // Filter students based on selected class and search term
  const filtered = students
    .filter(student => 
      selectedClass === '' || student.class_id === selectedClass
    )
    .filter(student =>
      student.full_name.toLowerCase().includes(search.toLowerCase()) ||
      student.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
      student.gr_number.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          ID Card Management
        </Typography>
      </Box>

      <Stack direction="row" spacing={3}>
        {/* Left Column - Student Data */}
        <Card sx={{ flex: 1 }}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={selectedClass}
                  onChange={handleClassChange}
                  label="Select Class"
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id.toString()}>
                      {cls.class_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Search Students"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <Button
                variant="contained"
                onClick={handleGenerateAll}
                startIcon={<Iconify icon="solar:pen-bold" width={20} />}
              >
                Generate All
              </Button>
            </Stack>
          </Box>

          <Scrollbar>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>GR No.</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>Blood Group</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((student) => (
                        <TableRow key={student.id} hover>
                          <TableCell>{student.gr_number}</TableCell>
                          <TableCell>{student.full_name}</TableCell>
                          <TableCell>{getClassNameById(student.class_id)}</TableCell>
                          <TableCell>{student.section}</TableCell>
                          <TableCell>{student.gender}</TableCell>
                          <TableCell>{student.blood_group}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleGenerateIdCard(student)}
                            >
                              <Iconify icon="solar:pen-bold" width={20} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Card>

        {/* Right Column - ID Card Preview */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">ID Card Preview</Typography>
          </Box>
          
          <Box sx={{ p: 2, flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            {selectedStudent ? (
              <Box sx={{ 
                width: '100%',
                maxWidth: '300px',
                height: '450px', 
                border: '1px dashed grey',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                position: 'relative'
              }}>
                {selectedStudent.profile_image ? (
                  <Box sx={{ 
                    width: '100px', 
                    height: '120px', 
                    mb: 2,
                    overflow: 'hidden',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}>
                    <img 
                      src={selectedStudent.profile_image} 
                      alt={selectedStudent.full_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ 
                    width: '100px', 
                    height: '120px', 
                    mb: 2,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}>
                    <Iconify icon="solar:user-bold" width={40} />
                  </Box>
                )}
                
                <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
                  {selectedStudent.full_name}
                </Typography>
                <Typography variant="body2">GR No: {selectedStudent.gr_number}</Typography>
                <Typography variant="body2">Roll No: {selectedStudent.roll_number}</Typography>
                <Typography variant="body2">
                  Class: {getClassNameById(selectedStudent.class_id)} - {selectedStudent.section}
                </Typography>
                <Typography variant="body2">DOB: {selectedStudent.dob}</Typography>
                <Typography variant="body2">Blood Group: {selectedStudent.blood_group}</Typography>
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%'
              }}>
                <Typography variant="body1" color="text.secondary">
                  Select a student to preview ID card
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={!selectedStudent}
              onClick={() => {
                if (selectedStudent) {
                  setSuccessMessage(`Generating ID card for ${selectedStudent.full_name}`);
                  setShowToast(true);
                }
              }}
              startIcon={<Iconify icon="material-symbols:print-outline" width={20} />}
              sx={{ width: '100%', maxWidth: '300px' }}
            >
              Print ID Card
            </Button>
          </Box>
        </Card>
      </Stack>

      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowToast(false)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}