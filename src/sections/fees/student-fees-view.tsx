import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

import {
  Container,
  Stack,
  Card,
  TextField,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

import { StudentList } from 'src/sections/student/view/StudentList';

type Student = {
  id: number;
  gr_number: string;
  roll_number?: string;
  full_name: string;
  class_id: string;
  section?: string;
  passport_photo?: string;
  gender: string;
  mother_name: string;
  father_name: string;
  dob?: string;
  email?: string;
  mobile_number?: string;
  address?: string;
  city?: string;
  state?: string;
};

interface Class {
  id: string;
  class_name: string;
}

export function StudentFeesView() {
  // State management
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<number, { passport_photo?: string }>>({});
  const [feesTab, setFeesTab] = useState<'summary' | 'breakdown' | 'history'>('summary');

  // Data fetching
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
      setFilteredStudents(studentsData);
    } catch (err) {
      setError('Failed to load student data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Class change handler
  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedStudentId(null);

    if (!classId) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter(student => 
      String(student.class_id) === String(classId)
    );
    setFilteredStudents(filtered);

    if (filtered.length > 0) {
      setSelectedStudentId(filtered[0].id);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Selected student data
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Prepare props for StudentList
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {/* Left sidebar - Student List */}
        <Card sx={{ 
          width: '30%', 
          p: 2, 
          bgcolor: '#f7f9fb', 
          height: '110vh', 
          minHeight: 300 
        }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Select Class"
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            sx={{ maxWidth: 300, mb: 2 }}
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

        {/* Right side - Student Preview with Fees Tabs */}
        <Card sx={{
          width: '70%',
          borderRadius: 3,
          maxHeight: '120vh',
          minHeight: 300,
          height: '110vh',
          overflow: 'hidden',
          p: 0
        }}>
          {/* Header with background image - Maintained exactly as in StudentPreview */}
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ 
              height: 160, 
              backgroundImage: 'url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }} />
            
            {/* Fees Tabs */}
            <Box sx={{ 
              position: 'absolute', 
              top: 12, 
              right: 12, 
              backdropFilter: 'blur(4px)', 
              backgroundColor: 'rgba(255, 255, 255, 0.15)', 
              borderRadius: 1, 
              p: 0.5 
            }}>
              <ToggleButtonGroup
                value={feesTab}
                exclusive
                onChange={(e, v) => v && setFeesTab(v)}
                size="medium"
                sx={{
                  '& .MuiToggleButton-root': { 
                    color: '#fff', 
                    borderColor: 'rgba(255,255,255,0.4)', 
                    fontWeight: 600,
                    textTransform: 'none'
                  },
                  '& .Mui-selected': { 
                    backgroundColor: 'rgba(255,255,255,0.25)', 
                    color: '#fff', 
                    borderColor: 'rgba(255,255,255,0.8)' 
                  },
                  '& .MuiToggleButton-root:hover': { 
                    backgroundColor: 'rgba(255,255,255,0.1)' 
                  },
                }}
              >
                <ToggleButton value="summary">Fees Summary</ToggleButton>
                <ToggleButton value="breakdown">Fees Breakdown</ToggleButton>
                <ToggleButton value="history">Payment History</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Student photo and basic info - Maintained exactly as in StudentPreview */}
          <Box sx={{ px: 4, position: 'relative', minHeight: 65 }}>
            <Box
              sx={{
                position: 'absolute',
                top: -65,
                left: 24,
                width: 120,
                height: 120,
                borderRadius: '50%',
                overflow: 'hidden',
              }}
            >
              <Avatar
                src={
                  selectedStudent?.passport_photo
                    ? convertFileSrc(selectedStudent.passport_photo)
                    : "/assets/avatars/avatar_1.jpg"
                }
                sx={{
                  width: 120,
                  height: 120,
                  border: '4px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(0, 0, 0, 0.15)',
                  backgroundColor: 'white',
                }}
              />
            </Box>

            <Box sx={{ pl: 16, pt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {selectedStudent ? `${selectedStudent.full_name}, Class: ${selectedStudent.class_id}, Section: ${selectedStudent.section}` : 'No student selected'}
              </Typography>
              <Typography variant="body2">
                {selectedStudent ? `GR No: ${selectedStudent.gr_number} | Roll No: ${selectedStudent.roll_number}` : 'Select a student to view details'}
              </Typography>
            </Box>
          </Box>

          {/* Content area with Fees Tabs content */}
          <Box sx={{ px: 3, pb: 3, overflow: 'auto' }}>
            {!selectedStudent ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
              }}>
                <Typography variant="h6">No student selected</Typography>
              </Box>
            ) : (
              <>
                {/* Fees Summary Tab */}
                {feesTab === 'summary' && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                      Fees Summary
                    </Typography>
                    <TableContainer component={Paper} sx={{ mb: 3 }}>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Total Annual Fees</TableCell>
                            <TableCell align="right">$1,200.00</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Paid Amount</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>$900.00</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Pending Amount</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>$300.00</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Next Due Date</TableCell>
                            <TableCell align="right">15/10/2023</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Typography variant="subtitle2" gutterBottom>
                      Payment Schedule
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell>Term 1</TableCell>
                            <TableCell align="right">$400.00</TableCell>
                            <TableCell align="right">15/06/2023</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>Paid</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Term 2</TableCell>
                            <TableCell align="right">$400.00</TableCell>
                            <TableCell align="right">15/08/2023</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>Paid</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Term 3</TableCell>
                            <TableCell align="right">$400.00</TableCell>
                            <TableCell align="right">15/10/2023</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>Pending</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Fees Breakdown Tab */}
                {feesTab === 'breakdown' && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                      Fees Breakdown
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Tuition Fee</TableCell>
                            <TableCell align="right">$800.00</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>Paid</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Library Fee</TableCell>
                            <TableCell align="right">$100.00</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>Paid</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Sports Fee</TableCell>
                            <TableCell align="right">$50.00</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>Pending</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Activity Fee</TableCell>
                            <TableCell align="right">$150.00</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>Pending</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Transportation Fee</TableCell>
                            <TableCell align="right">$100.00</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>Paid</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Payment History Tab */}
                {feesTab === 'history' && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                      Payment History
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell>15/06/2023</TableCell>
                            <TableCell>Tuition Fee (1st Installment)</TableCell>
                            <TableCell align="right">$400.00</TableCell>
                            <TableCell align="right">Receipt #45678</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>15/07/2023</TableCell>
                            <TableCell>Library Fee</TableCell>
                            <TableCell align="right">$100.00</TableCell>
                            <TableCell align="right">Receipt #45679</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>15/08/2023</TableCell>
                            <TableCell>Tuition Fee (2nd Installment)</TableCell>
                            <TableCell align="right">$400.00</TableCell>
                            <TableCell align="right">Receipt #45680</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Card>
      </Stack>
    </Container>
  );
}