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
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchAlert, setSearchAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return students; // Show all students when no class is selected
    return students.filter(student => student.class_id === String(selectedClass));
  }, [students, selectedClass]);

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  useEffect(() => {
    if (filteredStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(filteredStudents[0].id);
    } else if (filteredStudents.length > 0 && selectedStudentId) {
      const studentExists = filteredStudents.some(s => s.id === selectedStudentId);
      if (!studentExists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      setSelectedStudentId(null);
    }
  }, [filteredStudents, selectedStudentId]);

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
        
        // Initially select the first student if any exist
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