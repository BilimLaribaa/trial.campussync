import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

type Enquiry = {
  id?: number;
  student_name: string;
  parent_name: string;
  phone: string;
  email?: string;
  source: string;
  status?: string;
  created_at?: string;
};

type EnquiryFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingEnquiry: Enquiry | null;
};

export function EnquiryForm({ open, onClose, onSuccess, editingEnquiry }: EnquiryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [studentName, setStudentName] = useState(editingEnquiry?.student_name || '');
  const [parentName, setParentName] = useState(editingEnquiry?.parent_name || '');
  const [phone, setPhone] = useState(editingEnquiry?.phone || '');
  const [email, setEmail] = useState(editingEnquiry?.email || '');
  const [source, setSource] = useState(editingEnquiry?.source || 'In-person');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let valid = true;
    setErrorMessage('');
    setPhoneError(false);
    setEmailError(false);

    if (!/^[0-9]{10}$/.test(phone)) {
      setPhoneError(true);
      setErrorMessage('Phone number must be exactly 10 digits.');
      valid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(true);
      setErrorMessage('Please enter a valid email address.');
      valid = false;
    }

    if (!valid) {
      setSubmitting(false);
      return;
    }

    const formData: Enquiry = {
      student_name: studentName,
      parent_name: parentName,
      phone,
      email,
      source,
      status: editingEnquiry?.status || 'new'
    };

    try {
      if (editingEnquiry?.id) {
        await invoke('update_enquiry', { id: editingEnquiry.id, enquiry: formData });
      } else {
        await invoke('create_enquiry', { enquiry: formData });
      }

      onSuccess();
      resetForm();
      setSubmitting(false);
    } catch (error) {
      console.error('Error saving enquiry:', error);
      setErrorMessage('Failed to save enquiry. Please try again.');
      setSubmitting(false);
    }
  };

  function resetForm() {
    setStudentName('');
    setParentName('');
    setPhone('');
    setEmail('');
    setSource('In-person');
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingEnquiry ? 'Edit Enquiry' : 'New Enquiry'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            <TextField
              required
              label="Student Name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
            <TextField
              required
              label="Parent Name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />
            <TextField
              required
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phoneError}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
            />
            <TextField
              select
              required
              label="Source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <MenuItem value="In-person">In-person</MenuItem>
              <MenuItem value="Phone">Phone</MenuItem>
              <MenuItem value="Email">Email</MenuItem>
              <MenuItem value="Website">Website</MenuItem>
              <MenuItem value="Social Media">Social Media</MenuItem>
              <MenuItem value="Referral">Referral</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 