import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';

import { Download as DownloadIcon } from '@mui/icons-material';
import {
  Box, Card, Stack, Button, Typography, Avatar, TextField,
  ListItemText, ListItemAvatar, ListItem, ListItemButton, List,
  ToggleButton, ToggleButtonGroup, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

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

export function StudentView() {
  const navigate = useNavigate();
  const infoRef = useRef<HTMLDivElement>(null);
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
console.log(studentsData);

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
        setSelectedStudentId(studentsData[0]?.id || null);
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

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" fontWeight={500}>{label}</Typography>
      <Typography variant="body2">{value || '-'}</Typography>
    </Stack>
  );

  const InfoRowWithLink = ({ label, documentKey }: { label: string; documentKey: keyof DocumentUrls }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" fontWeight={500}>{label}</Typography>
      {renderDocumentLink(label, documentKey)}
    </Stack>
  );

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
        <Alert severity="error">{error}</Alert>
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

            <Box maxWidth={560} mx="auto" mt={-2} px={3} pb={3} ref={infoRef}>
              {selectedStudent ? (
                <>
                  {infoTab === 'general' && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>General Information</Typography>
                      <InfoRow label="GR Number" value={selectedStudent.gr_number} />
                      <InfoRow label="Roll Number" value={selectedStudent.roll_number} />
                      <InfoRow label="Full Name" value={selectedStudent.full_name} />
                      <InfoRow label="Date of Birth" value={selectedStudent.dob} />
                      <InfoRow label="Gender" value={selectedStudent.gender} />
                      <InfoRow label="Mother's Name" value={selectedStudent.mother_name} />
                      <InfoRow label="Mother's Occupation" value={selectedStudent.mother_occupation} />
                      <InfoRow label="Father's Name" value={selectedStudent.father_name} />
                      <InfoRow label="Father's Occupation" value={selectedStudent.father_occupation} />
                      <InfoRow label="Annual Income" value={selectedStudent.annual_income !== undefined ? `$${selectedStudent.annual_income}` : '-'} />
                      <InfoRow label="Nationality" value={selectedStudent.nationality} />
                      <InfoRow label="Class" value={classMap[selectedStudent.class_id] || `Class ${selectedStudent.class_id}`} />
                      <InfoRow label="Section" value={selectedStudent.section} />
                      <InfoRow label="Academic Year" value={selectedStudent.academic_year} />
                    </Stack>
                  )}

                  {infoTab === 'contact' && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Contact Information</Typography>
                      <InfoRow label="Email" value={selectedStudent.email} />
                      <InfoRow label="Mobile Number" value={selectedStudent.mobile_number} />
                      <InfoRow label="Alternate Contact" value={selectedStudent.alternate_contact_number} />
                      <InfoRow label="Address" value={selectedStudent.address} />
                      <InfoRow label="City" value={selectedStudent.city} />
                      <InfoRow label="State" value={selectedStudent.state} />
                      <InfoRow label="Country" value={selectedStudent.country} />
                      <InfoRow label="Postal Code" value={selectedStudent.postal_code} />
                      <InfoRow label="Guardian Contact Info" value={selectedStudent.guardian_contact_info} />
                    </Stack>
                  )}

                  {infoTab === 'health' && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Health & Admission</Typography>
                      <InfoRow label="Blood Group" value={selectedStudent.blood_group} />
                      <InfoRow label="Status" value={selectedStudent.status} />
                      <InfoRow label="Admission Date" value={selectedStudent.admission_date} />
                      <InfoRow label="Weight (kg)" value={selectedStudent.weight_kg?.toString()} />
                      <InfoRow label="Height (cm)" value={selectedStudent.height_cm?.toString()} />
                      <InfoRow label="HB Range" value={selectedStudent.hb_range} />
                      <InfoRow label="Medical Conditions" value={selectedStudent.medical_conditions} />
                      <InfoRow label="Emergency Contact Person" value={selectedStudent.emergency_contact_person} />
                      <InfoRow label="Emergency Contact" value={selectedStudent.emergency_contact} />
                      <InfoRow label="Vaccination Certificate" value={selectedStudent.vaccination_certificate} />
                    </Stack>
                  )}

                  {infoTab === 'documents' && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Documents</Typography>
                      {(['birth_certificate', 'transfer_certificate', 'previous_academic_records', 'address_proof',
                        'id_proof', 'passport_photo', 'medical_certificate', 'vaccination_certificate',
                        'other_documents'] as const).map((docKey) => (
                          <InfoRowWithLink key={docKey} label={docKey.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} documentKey={docKey} />
                        ))}
                    </Stack>
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

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Document Preview - {previewFileName}</DialogTitle>
        <DialogContent>
          {previewType === 'image' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <img src={previewData} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </Box>
          ) : previewType === 'pdf' ? (
            <Box sx={{ height: '70vh' }}>
              <iframe src={previewData} width="100%" height="100%" title="PDF Preview" style={{ border: 'none' }} />
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>Preview not available for this file type</Typography>
              <Typography variant="body1">You can download the file to view it with an appropriate application.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => handleDownload(previewData, previewFileName)} startIcon={<DownloadIcon />} disabled={!previewData}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}