import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { appDataDir, join } from '@tauri-apps/api/path';

import { TextField } from '@mui/material';
import {
  Box, Card, Stack, Button, Typography, Avatar,
  ListItemText, ListItemAvatar, ListItem, ListItemButton, List,
  ToggleButton, ToggleButtonGroup, Alert
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

type StudentBasic = {
  id: number;
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
};

type StudentContact = {
  id: number;
  email: string;
  mobile_number: string;
  alternate_contact_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  guardian_contact_info: string;
};

type StudentHealth = {
  id: number;
  blood_group: string;
  status: string;
  admission_date: string;
  weight_kg: number;
  height_cm: number;
  hb_range: string;
  medical_conditions: string;
  emergency_contact_person: string;
  emergency_contact: string;
  vaccination_certificate: string;
};

type StudentDocuments = {
  id: number;
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

export function StudentView() {
  const [basicInfo, setBasicInfo] = useState<StudentBasic[]>([]);
  const [contactInfo, setContactInfo] = useState<StudentContact[]>([]);
  const [healthInfo, setHealthInfo] = useState<StudentHealth[]>([]);
  const [documentsInfo, setDocumentsInfo] = useState<StudentDocuments[]>([]);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [infoTab, setInfoTab] = useState<'general' | 'contact' | 'health' | 'documents'>('general');
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('image');
  const [downloadStatus, setDownloadStatus] = useState<{success: boolean, message: string} | null>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!selectedStudentId) return;
    
    const student = basicInfo.find(s => s.id === selectedStudentId);
    if (!student) return;

    const confirm = window.confirm(`Are you sure you want to delete ${student.full_name}?`);
    if (!confirm) return;

    try {
      await invoke('delete_student', { id: selectedStudentId });
      const updated = basicInfo.filter((s) => s.id !== selectedStudentId);
      setBasicInfo(updated);
      setSelectedStudentId(updated[0]?.id || null);
    } catch (err) {
      console.error('Failed to delete student:', err);
      setError('Failed to delete student');
    }
  };

  const getDocumentPaths = async (documents: StudentDocuments) => {
  const paths: Record<string, string> = {};
  
  const docEntries = [
    ['birth_certificate', documents.birth_certificate],
    ['transfer_certificate', documents.transfer_certificate],
    ['previous_academic_records', documents.previous_academic_records],
    ['address_proof', documents.address_proof],
    ['id_proof', documents.id_proof],
    ['passport_photo', documents.passport_photo],
    ['medical_certificate', documents.medical_certificate],
    ['vaccination_certificate', documents.vaccination_certificate],
    ['other_documents', documents.other_documents],
  ] as const;

  for (const [key, filename] of docEntries) {
    if (filename) {
      try {
        // Get the full file path from the backend
        const filePath = await invoke<string>('get_student_document_path', { 
          fileName: filename 
        });
        
        // Store the file path
        paths[key] = filePath;
        
        // Determine file type for preview
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png')) {
          setPreviewType('image');
        } else if (filename.endsWith('.pdf')) {
          setPreviewType('pdf');
        } else {
          setPreviewType('other');
        }
      } catch (err) {
        console.error(`Failed to get document ${key}:`, err);
        paths[key] = '';
      }
    }
  }

  return paths;
};
function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

 const handleDownload = async (filepath: string) => {
  try {
    setDownloadStatus(null);
    
    // Get the filename from the path
    const filename = filepath.split(/[\\/]/).pop() || 'document';
    
    // Use Tauri's download command
    const result = await invoke<string>('download_student_document', { 
      sourcePath: filepath 
    });
    
    setDownloadStatus({
      success: true,
      message: `File downloaded to: ${result}`
    });
    
    setTimeout(() => {
      setDownloadStatus(null);
    }, 3000);
  } catch (err) {
    console.error('Download failed:', err);
    setDownloadStatus({
      success: false,
      message: 'Failed to download document'
    });
  }
};

  const renderDocumentLink = (label: string, documentKey: keyof StudentDocuments) => {
  const filepath = documentUrls[documentKey as string];
  const filename = selectedDocumentsInfo?.[documentKey];
  
  if (!filepath || !filename) {
    return <Typography variant="body2">-</Typography>;
  }

    // Ensure filename is treated as string
    const filenameStr = filename.toString();
    const displayName = filenameStr.split(/[\\/]/).pop() || '';

     return (
    <Stack direction="row" spacing={1}>
      <Button 
        variant="outlined" 
        size="small"
        onClick={() => {
          setPreviewUrl(filepath);
          setPreviewOpen(true);
        }}
        sx={{ textTransform: 'none' }}
      >
        View
      </Button>
      <Button 
        variant="contained" 
        size="small"
        onClick={() => handleDownload(filepath)}
        sx={{ textTransform: 'none' }}
      >
        Download
      </Button>
    </Stack>
  );
};

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [classes, basicData, contactData, healthData, documentsData] = await Promise.all([
          invoke<{id: string, class_name: string}[]>('get_all_classes'),
          invoke<[number, StudentBasic][]>('get_all_student1'),
          invoke<[number, StudentContact][]>('get_all_student2'),
          invoke<[number, StudentHealth][]>('get_all_student3'),
          invoke<[number, StudentDocuments][]>('get_all_student4')
        ]);

        const newClassMap = classes.reduce((acc, cls) => {
          acc[cls.id] = cls.class_name;
          return acc;
        }, {} as Record<string, string>);

        const transformedBasic = basicData.map(([id, data]) => ({ ...data, id }));
        const transformedContact = contactData.map(([id, data]) => ({ ...data, id }));
        const transformedHealth = healthData.map(([id, data]) => ({ ...data, id }));
        const transformedDocuments = documentsData.map(([id, data]) => ({ ...data, id }));

        if (transformedDocuments.length > 0) {
          const urls = await getDocumentPaths(transformedDocuments[0]);
          setDocumentUrls(urls);
        }

        setClassMap(newClassMap);
        setBasicInfo(transformedBasic);
        setContactInfo(transformedContact);
        setHealthInfo(transformedHealth);
        setDocumentsInfo(transformedDocuments);
        setSelectedStudentId(transformedBasic[0]?.id || null);
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
        const documents = documentsInfo.find(d => d.id === selectedStudentId);
        if (documents) {
          const urls = await getDocumentPaths(documents);
          setDocumentUrls(urls);
        }
      }
    };

    updateDocumentUrls();
  }, [selectedStudentId, documentsInfo]);

  useEffect(() => {
    if (infoRef.current) {
      setCardHeight(infoRef.current.clientHeight + 240);
    }
  }, [selectedStudentId, infoTab]);

  if (loading) {
    return (
      <DashboardContent>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography>Loading student data...</Typography>
        </Box>
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Alert severity="error">{error}</Alert>
        </Box>
      </DashboardContent>
    );
  }

  const selectedBasicInfo = basicInfo.find(s => s.id === selectedStudentId);
  const selectedContactInfo = contactInfo.find(s => s.id === selectedStudentId);
  const selectedHealthInfo = healthInfo.find(s => s.id === selectedStudentId);
  const selectedDocumentsInfo = documentsInfo.find(s => s.id === selectedStudentId);

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        <Typography variant="body2">{value || '-'}</Typography>
      </Stack>
    );
  }

  function InfoRowWithLink({ 
    label, 
    documentKey, 
    renderLink 
  }: { 
    label: string; 
    documentKey: keyof StudentDocuments; 
    renderLink: (label: string, documentKey: keyof StudentDocuments) => React.ReactNode 
  }) {
    return (
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        {renderLink(label, documentKey)}
      </Stack>
    );
  }

  return (
    <DashboardContent>
      <Stack spacing={2}>
        {downloadStatus && (
          <Alert severity={downloadStatus.success ? "success" : "error"}>
            {downloadStatus.message}
          </Alert>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={700}>Student Management</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={() => navigate('/dashboard/student/add')}>
              Add Student
            </Button>
            <Button
              variant="outlined"
              disabled={!selectedStudentId}
              onClick={() => navigate(`/dashboard/student/add/${selectedStudentId}`)}
            >
              Edit
            </Button>
            <Button variant="outlined" color="error" disabled={!selectedStudentId} onClick={handleDelete}>
              Delete
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Card sx={{ width: '30%', p: 2, bgcolor: '#f7f9fb', height: cardHeight || 600 }}>
            <TextField fullWidth size="small" label="Search Students" sx={{ mb: 2 }} />
            <Box sx={{ overflowY: 'auto', maxHeight: cardHeight ? cardHeight - 80 : 520 }}>
              {basicInfo.length > 0 ? (
                <List>
                  {basicInfo.map((s) => (
                    <ListItem disablePadding key={s.id}>
                      <ListItemButton 
                        selected={selectedStudentId === s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                      >
                        <ListItemAvatar>
                          <Avatar src={s.profile_image || "/assets/avatars/avatar_1.jpg"} />
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
                  <Typography variant="body1" color="text.secondary">
                    No students found
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>

          <Card sx={{ width: '70%', overflow: 'hidden', borderRadius: 3, height: cardHeight || 600 }}>
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  height: 160,
                  backgroundImage: 'url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=80")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backdropFilter: 'blur(4px)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                <ToggleButtonGroup
                  value={infoTab}
                  exclusive
                  onChange={(e, v) => v && setInfoTab(v)}
                  size="medium"
                  sx={{
                    '& .MuiToggleButton-root': {
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.4)',
                      fontWeight: 600,
                    },
                    '& .Mui-selected': {
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.8)',
                    },
                    '& .MuiToggleButton-root:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
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
                src={selectedBasicInfo?.profile_image || "/assets/avatars/avatar_1.jpg"}
                sx={{
                  width: 90,
                  height: 90,
                  border: '4px solid white',
                  position: 'absolute',
                  top: -45,
                  left: 24,
                }}
              />
              <Box sx={{ pl: 12 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selectedBasicInfo ? 
                    `${selectedBasicInfo.full_name}, Class: ${classMap[selectedBasicInfo.class_id] || `Class ${selectedBasicInfo.class_id}`}, Section: ${selectedBasicInfo.section}` : 
                    "No student selected"}
                </Typography>
                {selectedBasicInfo && (
                  <Typography variant="body2">
                    GR No: {selectedBasicInfo.gr_number} | Roll No: {selectedBasicInfo.roll_number}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box maxWidth={560} mx="auto" px={3} pb={3} ref={infoRef}>
              {selectedBasicInfo ? (
                <>
                  {infoTab === 'general' && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>General Information</Typography>
                      <InfoRow label="GR Number" value={selectedBasicInfo.gr_number} />
                      <InfoRow label="Student ID" value={selectedBasicInfo.student_id} />
                      <InfoRow label="Roll Number" value={selectedBasicInfo.roll_number} />
                      <InfoRow label="Full Name" value={selectedBasicInfo.full_name} />
                      <InfoRow label="Date of Birth" value={selectedBasicInfo.dob} />
                      <InfoRow label="Gender" value={selectedBasicInfo.gender} />
                      <InfoRow label="Mother's Name" value={selectedBasicInfo.mother_name} />
                      <InfoRow label="Father's Name" value={selectedBasicInfo.father_name} />
                      <InfoRow label="Nationality" value={selectedBasicInfo.nationality} />
                      <InfoRow label="Class" value={classMap[selectedBasicInfo.class_id] || `Class ${selectedBasicInfo.class_id}`} />
                      <InfoRow label="Section" value={selectedBasicInfo.section} />
                      <InfoRow label="Academic Year" value={selectedBasicInfo.academic_year} />
                    </Stack>
                  )}

                  {infoTab === 'contact' && selectedContactInfo && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Contact Information</Typography>
                      <InfoRow label="Email" value={selectedContactInfo.email} />
                      <InfoRow label="Mobile Number" value={selectedContactInfo.mobile_number} />
                      <InfoRow label="Alternate Contact" value={selectedContactInfo.alternate_contact_number} />
                      <InfoRow label="Address" value={selectedContactInfo.address} />
                      <InfoRow label="City" value={selectedContactInfo.city} />
                      <InfoRow label="State" value={selectedContactInfo.state} />
                      <InfoRow label="Country" value={selectedContactInfo.country} />
                      <InfoRow label="Postal Code" value={selectedContactInfo.postal_code} />
                      <InfoRow label="Guardian Contact Info" value={selectedContactInfo.guardian_contact_info} />
                    </Stack>
                  )}

                  {infoTab === 'health' && selectedHealthInfo && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Health & Admission</Typography>
                      <InfoRow label="Blood Group" value={selectedHealthInfo.blood_group} />
                      <InfoRow label="Status" value={selectedHealthInfo.status} />
                      <InfoRow label="Admission Date" value={selectedHealthInfo.admission_date} />
                      <InfoRow label="Weight (kg)" value={selectedHealthInfo.weight_kg?.toString() || '-'} />
                      <InfoRow label="Height (cm)" value={selectedHealthInfo.height_cm?.toString() || '-'} />
                      <InfoRow label="HB Range" value={selectedHealthInfo.hb_range} />
                      <InfoRow label="Medical Conditions" value={selectedHealthInfo.medical_conditions} />
                      <InfoRow label="Emergency Contact Person" value={selectedHealthInfo.emergency_contact_person} />
                      <InfoRow label="Emergency Contact" value={selectedHealthInfo.emergency_contact} />
                      <InfoRow label="Vaccination Certificate" value={selectedHealthInfo.vaccination_certificate} />
                    </Stack>
                  )}

                  {infoTab === 'documents' && selectedDocumentsInfo && (
                    <Stack spacing={1.25} pt={1}>
                      <Typography fontWeight={600} mb={1} fontSize={16}>Documents</Typography>
                      <InfoRowWithLink 
                        label="Birth Certificate" 
                        documentKey="birth_certificate" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="Transfer Certificate" 
                        documentKey="transfer_certificate" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="Previous Academic Records" 
                        documentKey="previous_academic_records" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="Address Proof" 
                        documentKey="address_proof" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="ID Proof" 
                        documentKey="id_proof" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="Passport Photo" 
                        documentKey="passport_photo" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="Medical Certificate" 
                        documentKey="medical_certificate" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="Vaccination Certificate" 
                        documentKey="vaccination_certificate" 
                        renderLink={renderDocumentLink} 
                      />
                      <InfoRowWithLink 
                        label="Other Documents" 
                        documentKey="other_documents" 
                        renderLink={renderDocumentLink} 
                      />
                    </Stack>
                  )}
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={300}>
                  <Typography variant="body1" color="text.secondary">
                    No student selected or found
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Stack>
      </Stack>

      {/* Document Preview Modal */}
     {previewOpen && (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 1300,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
    onClick={() => {
      setPreviewOpen(false);
      // Revoke the blob URL when done to free memory
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    }}
  >
    <Box
      sx={{
        maxWidth: '90%',
        maxHeight: '90%',
        backgroundColor: 'white',
        p: 2,
        borderRadius: 1,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {previewType === 'pdf' ? (
        <iframe 
          src={previewUrl} 
          width="800" 
          height="600" 
          style={{ border: 'none' }}
          title="Document Preview"
        />
      ) : previewType === 'image' ? (
        <img 
          src={previewUrl} 
          alt="Document Preview" 
          style={{ maxWidth: '100%', maxHeight: '80vh' }}
        />
      ) : (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Document Preview Not Available
          </Typography>
          <Typography>
            This file type cannot be previewed. Please download the file to view it.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => handleDownload(previewUrl)}
            sx={{ mt: 2 }}
          >
            Download File
          </Button>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button 
          variant="contained" 
          onClick={() => {
            setPreviewOpen(false);
            if (previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl);
            }
          }}
        >
          Close
        </Button>
      </Box>
    </Box>
  </Box>
)}
    </DashboardContent>
  );
}