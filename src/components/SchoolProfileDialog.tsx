import { appDataDir } from '@tauri-apps/api/path';
import React, { useEffect, useState } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';

import Config from '../../config';

interface School {
    id?: number;
    school_name: string;
    school_board: string;
    school_medium: string;
    principal_name: string;
    contact_number: string;
    alternate_contact_number?: string | null;
    school_email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    website?: string | null;
    school_image?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

interface SchoolProfileDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved: (school: School) => void;
}

const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

const StyledUploadBox = styled(Box)(({ theme }) => ({
    width: 144,
    height: 144,
    display: 'flex',
    cursor: 'pointer',
    overflow: 'hidden',
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
    borderRadius: '50%',
    border: `1px dashed ${alpha(theme.palette.grey[500], 0.32)}`,
    transition: theme.transitions.create(['border-color', 'background-color']),
    '&:hover': {
        backgroundColor: alpha(theme.palette.grey[500], 0.08),
    },
}));

export function SchoolProfileDialog({ open, onClose, onSaved }: SchoolProfileDialogProps) {
    const [form, setForm] = useState<School>({
        school_name: '',
        school_board: '',
        school_medium: '',
        principal_name: '',
        contact_number: '',
        alternate_contact_number: '',
        school_email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        website: '',
        school_image: null,
        is_active: true,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null); 

  useEffect(() => {
  const fetchSchoolData = async () => {
    if (!open) return;

    setLoading(true);

    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) {
      setError('No school ID found in localStorage.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${Config.backend}/schools/${schoolId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setForm({
        ...data,
        alternate_contact_number: data.alternate_contact_number || '',
        website: data.website || '',
        school_image: data.school_image || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      });

      // Handle image preview
      if (data.school_image) {
        setPhotoPreview(`${Config.backend}/uploads/${data.school_image}`);
      } else {
        setPhotoPreview(null);
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  fetchSchoolData();
}, [open]);



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError(null); // Clear error on input change
    };

    const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const name = e.target.name as string;
        const value = e.target.value as string;
        setForm({ ...form, [name]: value });
        setError(null);
    };

    const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const filename = file.name.replace(/\s+/g, '_');
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));

    const savedFileName = await invoke<string>('save_image', {
      filename,
      data: bytes,
    });

    const savedPath = await invoke<string>('get_image_path', {
      filename: savedFileName,
    });

    const savedBlob = new Blob([arrayBuffer], { type: file.type });
    const localFile = new File([savedBlob], savedFileName, { type: file.type });

    setSelectedImageFile(localFile); // ✅ This will be used in the API call

    setForm(prev => ({
      ...prev,
      school_image: savedFileName, // Optional: still storing filename in form
    }));

    setPhotoPreview(convertFileSrc(savedPath)); // For preview
  } catch (err) {
    console.error('Failed to save image:', err);
    setError('Failed to upload image. Please try again.');
  }
};


const handleSave = async () => {
  if (!form.school_name.trim()) {
    setError('School name is required');
    return;
  }

  const schoolId = localStorage.getItem('school_id');
  if (!schoolId) {
    setError('No school ID found in localStorage.');
    return;
  }

  const apiUrl = `${Config.backend}/schools/${schoolId}`;
  const formData = new FormData();

  formData.append('school_name', form.school_name);
  formData.append('school_board', form.school_board);
  formData.append('school_medium', form.school_medium);
  formData.append('principal_name', form.principal_name);
  formData.append('contact_number', form.contact_number);
  formData.append('alternate_contact_number', form.alternate_contact_number || '');
  formData.append('school_email', form.school_email);
  formData.append('address', form.address);
  formData.append('city', form.city);
  formData.append('state', form.state);
  formData.append('pincode', form.pincode);
  formData.append('website', form.website || '');

  // ✅ Send actual image file
  if (selectedImageFile) {
    formData.append('school_image', selectedImageFile);
  }

  setLoading(true);
  setError(null);

  console.log(form);

  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const updated = await response.json();
    onSaved(updated);
    onClose();
  } catch (err: any) {
    console.error('Save failed:', err);
    setError('Failed to save school profile to API.');
  } finally {
    setLoading(false);
  }
};




    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 }
            }}
        >
            <DialogTitle>
                <Stack spacing={1}>
                    <Typography variant="h4">
                        Edit School Profile
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.primary',
                                fontWeight: 500,
                            }}
                        >
                            Dashboard
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>•</Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.primary',
                                fontWeight: 500,
                            }}
                        >
                            School
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>•</Typography>
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            Edit Profile
                        </Typography>
                    </Stack>
                </Stack>
            </DialogTitle>

            <Divider />

            <DialogContent>
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        {/* Photo Upload Section */}
                        <Box sx={{ gridColumn: 'span 2', mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <label htmlFor="photo-upload">
                                    <StyledUploadBox>
                                        {photoPreview ? (
                                            <Box
                                                component="img"
                                                src={photoPreview}
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                        ) : (
                                            <Stack spacing={0.5} alignItems="center">
                                                <CameraAltOutlinedIcon sx={{ color: 'text.disabled', width: 32, height: 32 }} />
                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                    Upload photo
                                                </Typography>
                                            </Stack>
                                        )}
                                    </StyledUploadBox>
                                    <VisuallyHiddenInput
                                        id="photo-upload"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif"
                                        onChange={handlePhotoChange}
                                    />
                                </label>
                            </Box>
                            <Box sx={{ textAlign: 'center', mt: 1 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                    Allowed formats: *.jpeg, *.jpg, *.png, *.gif
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Maximum size: 3 MB
                                </Typography>
                            </Box>
                        </Box>

                        {/* Form Fields */}
                        <Box>
                            <TextField
                                fullWidth
                                label="School Name"
                                name="school_name"
                                value={form.school_name}
                                onChange={handleChange}
                                required
                                helperText="Enter the official name of your school"
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="School Board"
                                name="school_board"
                                value={form.school_board}
                                onChange={handleChange}
                                required
                                helperText="E.g., CBSE, ICSE, State Board"
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="School Medium"
                                name="school_medium"
                                value={form.school_medium}
                                onChange={handleChange}
                                required
                                helperText="Medium of instruction, e.g., English, Hindi"
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Principal Name"
                                name="principal_name"
                                value={form.principal_name}
                                onChange={handleChange}
                                required
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Contact Number"
                                name="contact_number"
                                value={form.contact_number}
                                onChange={handleChange}
                                required
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Alternate Contact Number"
                                name="alternate_contact_number"
                                value={form.alternate_contact_number || ''}
                                onChange={handleChange}
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="School Email"
                                name="school_email"
                                value={form.school_email}
                                onChange={handleChange}
                                required
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Address"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                required
                                multiline
                                minRows={2}
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="City"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                required
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="State"
                                name="state"
                                value={form.state}
                                onChange={handleChange}
                                required
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Pincode"
                                name="pincode"
                                value={form.pincode}
                                onChange={handleChange}
                                required
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Website"
                                name="website"
                                value={form.website || ''}
                                onChange={handleChange}
                            />
                        </Box>
                    </Box>

                    {error && (
                        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                </Box>
            </DialogContent>

            <Divider />

            <DialogActions>
                <Button color="inherit" onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
