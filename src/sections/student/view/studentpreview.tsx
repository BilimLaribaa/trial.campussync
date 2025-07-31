import { v4 as uuidv4 } from 'uuid';
import Cropper from 'react-easy-crop';
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir } from '@tauri-apps/api/path';
import { useEffect, useState, useRef, } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

import { Box, Typography, Avatar, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableRow, TableHead, Dialog, DialogTitle, DialogActions, DialogContent, Button, Snackbar, Alert, Slider } from '@mui/material';

import getCroppedImg from 'src/utils/cropImage';

import { Iconify } from 'src/components/iconify';

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

type StudentPreviewProps = {
  Student: Student[];
  documentUrls: DocumentUrls;
  classMap: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onStudentUpdate?: (updated: Student) => void;
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

export function StudentPreview({
  Student,
  documentUrls = {},
  classMap,
  onEdit,
  onDelete,
  onStudentUpdate
}: StudentPreviewProps) {
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [infoTab, setInfoTab] = useState<'general' | 'contact' | 'health' | 'documents'>('general');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const currentStudent = Student?.[currentStudentIndex];

  // passport photo save and preview state
  const [passportFilePath, setPassportFilePath] = useState<string | null>(null);
  const [passportImageUrl, setPassportImageUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error'; }>({ open: false, message: '', severity: 'success' });
  // croper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = (_: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
  };

  const handlePassportOpen = async () => {
    if (!currentStudent) return;
    
    try {
      const file = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif"] }],
      });
      if (typeof file === 'string') {
        setPassportFilePath(file);
      }
    } catch (err) {
      console.error("[handlePassportOpen] Error opening passport file:", err);
    }
  };

  useEffect(() => {
    if (passportFilePath) {
      const url = convertFileSrc(passportFilePath);
      console.log("Selected image path:", passportFilePath);
      console.log("Converted preview URL:", url);
      setPassportImageUrl(url);
      setPreviewOpen(true);
    }
  }, [passportFilePath]);

  const handleSave = async () => {
    console.log("handleSave started");

    if (!passportImageUrl || !croppedAreaPixels || !currentStudent) {
      console.warn("Missing passport image or crop area or no student selected.");
      return;
    }

    try {
      const croppedBlob = await getCroppedImg(passportImageUrl, croppedAreaPixels);
      const arrayBuffer = await croppedBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const tempFileName = `${uuidv4()}.png`;
      const tempDir = await appDataDir();
      const tempPath = `${tempDir}${tempFileName}`;

      await invoke("write_binary_file", {
        path: tempPath,
        contents: Array.from(uint8Array),
      });

      const savedPath = await invoke<string>("save_passport_photo", {
        passportFilePath: tempPath,
      });

      await invoke("remove_file_cmd", { path: tempPath });

      await invoke("update_student_passport_photo", {
        studentId: currentStudent.id,
        imagePath: savedPath,
      });

      const newImageUrl = convertFileSrc(savedPath);
      Student[currentStudentIndex].passport_photo = savedPath;
      setPassportImageUrl(newImageUrl);
      setPreviewOpen(false);

      setSnackbar({
        open: true,
        message: "Passport photo saved successfully!",
        severity: "success",
      });

      if (onStudentUpdate) {
        onStudentUpdate({
          ...currentStudent,
          passport_photo: savedPath,
        });
      }
    } catch (error) {
      console.error("Error saving passport photo:", error);
      setSnackbar({
        open: true,
        message: "Failed to save passport photo.",
        severity: "error",
      });
    }
  };

  const passportPhoto = currentStudent?.passport_photo
    ? convertFileSrc(currentStudent.passport_photo)
    : documentUrls?.passport_photo || "/assets/avatars/avatar_1.jpg";

  return (
    <Box
      sx={{
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '120vh',
      }}
    >
      {/* Header with photo background - Always shown */}
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

      {/* Student photo and basic info - Always shown */}
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
            '&:hover .avatar-overlay': {
              opacity: currentStudent ? 1 : 0,
              pointerEvents: currentStudent ? 'auto' : 'none',
            },
          }}
        >
          <Avatar
            src={passportPhoto}
            sx={{
              width: 120,
              height: 120,
              border: '4px solid white',
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(0, 0, 0, 0.15)',
              backgroundColor: 'white',
            }}
            onClick={currentStudent ? handlePassportOpen : undefined}
          />

          <Box
            className="avatar-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              opacity: 0,
              transition: 'opacity 0.3s',
              pointerEvents: 'none',
              cursor: 'pointer',
            }}
            onClick={currentStudent ? handlePassportOpen : undefined}
          >
            <Iconify icon="solar:pen-bold" width={24} color="white" />
          </Box>
        </Box>

        <Box sx={{ pl: 16, pt: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {currentStudent ? `${currentStudent.full_name}, Class: ${currentStudent.class_id}, Section: ${currentStudent.section}` : 'No student selected'}
          </Typography>
          <Typography variant="body2">
            {currentStudent ? `GR No: ${currentStudent.gr_number} | Roll No: ${currentStudent.roll_number}` : 'Select a student to view details'}
          </Typography>
        </Box>
      </Box>

      {/* Student profile preview */}
      <Box
        ref={previewRef}
        sx={{
          flex: 1,
          px: 3,
          pb: 3,
          overflow: 'auto'
        }}
      >
        {!currentStudent ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            
          }}>
            <Typography variant="h6">No students selected</Typography>
          </Box>
        ) : (
          <>
            {infoTab === 'general' && (
              <>
                <Typography fontWeight={600} mb={1} fontSize={16}>General Information</Typography>
                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>GR Number</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.gr_number || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>Roll Number</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.roll_number || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Full Name</TableCell>
                        <TableCell>{currentStudent.full_name || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Date of Birth</TableCell>
                        <TableCell>{currentStudent.dob || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Gender</TableCell>
                        <TableCell>{currentStudent.gender || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Class</TableCell>
                        <TableCell>{currentStudent.class_id || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Mother&apos;s Name</TableCell>
                        <TableCell>{currentStudent.mother_name || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Mother&apos;s Occupation</TableCell>
                        <TableCell>{currentStudent.mother_occupation || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Father&apos;s Name</TableCell>
                        <TableCell>{currentStudent.father_name || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Father&apos;s Occupation</TableCell>
                        <TableCell>{currentStudent.father_occupation || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Annual Income</TableCell>
                        <TableCell>{currentStudent.annual_income !== undefined && currentStudent.annual_income !== null ? `$${currentStudent.annual_income}` : currentStudent.annual_income === 0 ? '$0' : '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Nationality</TableCell>
                        <TableCell>{currentStudent.nationality || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Academic Year</TableCell>
                        <TableCell>{currentStudent.academic_year || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }} />
                        <TableCell />
                      </TableRow>
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
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>Email</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.email || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>Mobile Number</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.mobile_number || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Alternate Contact</TableCell>
                        <TableCell>{currentStudent.alternate_contact_number || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Address</TableCell>
                        <TableCell>{currentStudent.address || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>City</TableCell>
                        <TableCell>{currentStudent.city || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>State</TableCell>
                        <TableCell>{currentStudent.state || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Country</TableCell>
                        <TableCell>{currentStudent.country || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Postal Code</TableCell>
                        <TableCell>{currentStudent.postal_code || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Guardian Contact Info</TableCell>
                        <TableCell colSpan={3}>{currentStudent.guardian_contact_info || '-'}</TableCell>
                      </TableRow>
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
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>Blood Group</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.blood_group || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>Status</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.status || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Admission Date</TableCell>
                        <TableCell>{currentStudent.admission_date || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Weight (kg)</TableCell>
                        <TableCell>{currentStudent.weight_kg?.toString() || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Height (cm)</TableCell>
                        <TableCell>{currentStudent.height_cm?.toString() || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>HB Range</TableCell>
                        <TableCell>{currentStudent.hb_range || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Medical Conditions</TableCell>
                        <TableCell colSpan={3}>{currentStudent.medical_conditions || '-'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Emergency Contact Person</TableCell>
                        <TableCell>{currentStudent.emergency_contact_person || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Emergency Contact</TableCell>
                        <TableCell>{currentStudent.emergency_contact || '-'}</TableCell>
                      </TableRow>
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
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>Birth Certificate</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.birth_certificate ? 'Available' : 'Not available'}</TableCell>
                        <TableCell sx={{ fontWeight: 500, width: '18%' }}>Transfer Certificate</TableCell>
                        <TableCell sx={{ width: '32%' }}>{currentStudent.transfer_certificate ? 'Available' : 'Not available'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Previous Academic Records</TableCell>
                        <TableCell>{currentStudent.previous_academic_records ? 'Available' : 'Not available'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Address Proof</TableCell>
                        <TableCell>{currentStudent.address_proof ? 'Available' : 'Not available'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>ID Proof</TableCell>
                        <TableCell>{currentStudent.id_proof ? 'Available' : 'Not available'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Passport Photo</TableCell>
                        <TableCell>{currentStudent.passport_photo ? 'Available' : 'Not available'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Medical Certificate</TableCell>
                        <TableCell>{currentStudent.medical_certificate ? 'Available' : 'Not available'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>Vaccination Certificate</TableCell>
                        <TableCell>{currentStudent.vaccination_certificate ? 'Available' : 'Not available'}</TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 500 }}>Other Documents</TableCell>
                        <TableCell colSpan={3}>{currentStudent.other_documents || 'None'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}
      </Box>

      <Dialog
        open={previewOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            setPreviewOpen(false);
          }
        }}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
          },
        }}
      >
        <DialogTitle>Preview Passport Photo</DialogTitle>
        <DialogContent sx={{ backgroundColor: '#333', p: 0 }}>
          {passportImageUrl ? (
            <>
              <Box sx={{ position: 'relative', height: 400 }}>
                <Cropper
                  image={passportImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </Box>

              <Box sx={{ px: 3, py: 2, backgroundColor: '#222' }}>
                <Typography variant="body2" color="white" gutterBottom>
                  Zoom
                </Typography>
                <Slider
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(_, value) => setZoom(value as number)}
                  valueLabelDisplay="auto"
                  sx={{
                    color: '#90caf9',
                    '& .MuiSlider-thumb': { color: '#fff' },
                    '& .MuiSlider-track': { color: '#90caf9' },
                    '& .MuiSlider-rail': { color: '#555' },
                  }}
                />
              </Box>
            </>
          ) : (
            <Typography sx={{ p: 2, color: 'white' }}>No image selected</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} color="secondary">Cancel</Button>
          <Button onClick={handleSave} color="primary" variant="contained">Save</Button>
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
    </Box>
  );
}