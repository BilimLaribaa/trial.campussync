import { v4 as uuidv4 } from 'uuid';
import Cropper from 'react-easy-crop';
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir } from '@tauri-apps/api/path';
import {useEffect, useState, useRef,} from 'react';
import { invoke , convertFileSrc} from '@tauri-apps/api/core';

import { Box, Typography, Avatar, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableRow, TableHead,Dialog,DialogTitle,DialogActions,DialogContent,Button,Snackbar,Alert, Slider } from '@mui/material';

import getCroppedImg from 'src/utils/cropImage';

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
  documentUrls = {}, // Provide default empty object
  classMap,
  onEdit,
  onDelete,
    onStudentUpdate // ← Add this

}: StudentPreviewProps) {
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [infoTab, setInfoTab] = useState<'general' | 'contact' | 'health' | 'documents'>('general');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const currentStudent = Student?.[currentStudentIndex];

  // passport  photo save and preview state
const [passportFilePath, setPassportFilePath] = useState<string | null>(null);
const [passportImageUrl, setPassportImageUrl] = useState<string | null>(null);
const [previewOpen, setPreviewOpen] = useState(false);
const [snackbar, setSnackbar] = useState<{open: boolean;message: string;severity: 'success' |'error';}>({ open: false, message: '', severity: 'success' });
// croper state
const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

const onCropComplete = (_: any, areaPixels: any) => {
  setCroppedAreaPixels(areaPixels);
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
    setPreviewOpen(true); // ✅ Only open the preview after URL is ready
  }
}, [passportFilePath]);
const handleSave = async () => {
  console.log("handleSave started");

  if (!passportImageUrl || !croppedAreaPixels) {
    console.warn("Missing passport image or crop area.");
    return;
  }
  console.log("passportImageUrl and croppedAreaPixels are present");

  try {
    // 1. Get cropped image Blob from your cropper utility
    console.log("Calling getCroppedImg...");
    const croppedBlob = await getCroppedImg(passportImageUrl, croppedAreaPixels);
    console.log("Cropped image blob obtained:", croppedBlob);

    // 2. Convert Blob to Uint8Array (binary format for writing)
    console.log("Converting Blob to Uint8Array...");
    const arrayBuffer = await croppedBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log("Uint8Array created with length:", uint8Array.length);

    // 3. Generate a temporary filename and path
    const tempFileName = `${uuidv4()}.png`;
    const tempDir = await appDataDir();
    const tempPath = `${tempDir}${tempFileName}`;
    console.log("Temporary file path generated:", tempPath);

    // 4. Write the cropped image to a temp file on disk using Tauri command
    console.log("Writing binary file to tempPath...");
    await invoke("write_binary_file", {
      path: tempPath,
      contents: Array.from(uint8Array), // convert Uint8Array to normal array for IPC
    });
    console.log("Temp file written successfully");

    // 5. Send the temp file path to backend to copy/save permanently
    console.log("Invoking save_passport_photo with tempPath:", tempPath);
   const savedPath = await invoke<string>("save_passport_photo", {
  passportFilePath: tempPath,
});
    console.log("Passport photo saved permanently at:", savedPath);

    // 6. Delete the temp file (cleanup)
    console.log("Removing temp file:", tempPath);
    await invoke("remove_file_cmd", { path: tempPath });
    console.log("Temp file removed");

    // 7. Update the database with new saved image path
    console.log("Updating database with new image path for student ID:", currentStudent.id);
    await invoke("update_student_passport_photo", {
      studentId: currentStudent.id,
      imagePath: savedPath,
    });
    console.log("Database updated");

    // 8. Update the frontend image preview and state
    console.log("Converting saved file path to URL");
    const newImageUrl = convertFileSrc(savedPath);
    console.log("New image URL:", newImageUrl);

    Student[currentStudentIndex].passport_photo = savedPath;
    setPassportImageUrl(newImageUrl);
    setPreviewOpen(false);
    console.log("Frontend state updated with new image");

    setSnackbar({
      open: true,
      message: "Passport photo saved successfully!",
      severity: "success",
    });

    // 9. Call parent update if callback provided
    if (onStudentUpdate) {
      console.log("Calling onStudentUpdate callback");
      onStudentUpdate({
        ...currentStudent,
        passport_photo: savedPath,
      });
    }

    console.log("handleSave completed successfully");
  } catch (error) {
    console.error("Error saving passport photo:", error);
    setSnackbar({
      open: true,
      message: "Failed to save passport photo.",
      severity: "error",
    });
  }
};







if (!currentStudent) {
    return (
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Typography variant="h6">No students selected</Typography>
      </Box>
    );
  }




const passportPhoto = currentStudent?.passport_photo
  ? convertFileSrc(currentStudent.passport_photo)
  : documentUrls?.passport_photo || "/assets/avatars/avatar_1.jpg";

   return (
    <Box
  sx={{
    p: 0,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '120vh', // or 110vh
  }}
>
      {/* Header with photo background */}
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

      {/* Student photo and basic info */}
      <Box sx={{ px: 4, position: 'relative', minHeight: 65 }}>
        <Avatar
          src={passportPhoto}
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
          onClick={handlePassportOpen}
        />
        <Box sx={{ pl: 16, pt: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {currentStudent.full_name}, Class: {currentStudent.class_id}, Section: {currentStudent.section}
          </Typography>
          <Typography variant="body2">GR No: {currentStudent.gr_number} | Roll No: {currentStudent.roll_number}</Typography>
        </Box>
      </Box>

      {/* Student profile preview */}
      <Box
        ref={previewRef}
        sx={{
          flex: 1,
          px: 3,
          pb: 3
        }}
      >
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
                    <TableCell sx={{ fontWeight: 500 }}>Section</TableCell>
                    <TableCell>{currentStudent.section || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>Academic Year</TableCell>
                    <TableCell>{currentStudent.academic_year || '-'}</TableCell>
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
      {/* Cropper Area */}
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

      {/* Zoom Slider Area */}
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
    </Box>
    
  );
}