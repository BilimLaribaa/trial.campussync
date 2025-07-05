
import { useEffect, useState } from 'react';

import { 
  Box, Stack, Alert, Dialog, Button, MenuItem, 
  TextField, DialogTitle, DialogActions, DialogContent 
} from '@mui/material';

type AcademicYear = {
  id: number;
  academic_year: string;
  status?: string;
};

type Class = {
  id?: number;
  class_name: string;
  academic_years: number;
  status?: string;
  academic_year_details?: AcademicYear;
};

type FormErrors = {
  class_name?: string;
  academic_years?: string;
};

const INITIAL_VALUES: Class = {
  class_name: '',
  academic_years: 0,
  status: 'active',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: Class) => Promise<void>;
  currentClass?: Class | null;
  academicYears: AcademicYear[];
}

export function ClassForm({ open, onClose, onSubmit, currentClass, academicYears }: Props) {
  const [formData, setFormData] = useState<Class>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentClass) {
      setFormData({
        ...currentClass,
        academic_years: currentClass.academic_years || 0
      });
    } else {
      setFormData(INITIAL_VALUES);
    }
    setErrors({});
    setTouched({});
    setErrorMessage('');
  }, [currentClass, open]);

  const validateField = (field: keyof Class, value: any) => {
    if (field === 'class_name' && !value) {
      return 'Class Name is required';
    }
    if (field === 'academic_years' && (!value || value === 0)) {
      return 'Academic Year is required';
    }
    return '';
  };

  const handleChange = (field: keyof Class) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === 'academic_years' ? Number(value) : value
    }));
    if (touched[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: validateField(field, field === 'academic_years' ? Number(value) : value),
      }));
    }
  };

  const handleBlur = (field: keyof Class) => () => {
    setTouched(prev => ({
      ...prev,
      [field]: true,
    }));
    setErrors(prev => ({
      ...prev,
      [field]: validateField(field, formData[field]),
    }));
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!formData.class_name) {
      newErrors.class_name = 'Class Name is required';
      isValid = false;
    }

    if (!formData.academic_years || formData.academic_years === 0) {
      newErrors.academic_years = 'Academic Year is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
  const allTouched = {
    class_name: true,
    academic_years: true
  };
  setTouched(allTouched);

  if (!validateForm()) return;

  await onSubmit({
    class_name: formData.class_name.trim(),
    academic_years: formData.academic_years,
    status: formData.status || 'active',
    ...(formData.id && { id: formData.id })
  });
};
  const sortedAcademicYears = [...academicYears].sort((a, b) =>
    b.academic_year.localeCompare(a.academic_year)
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {currentClass ? 'Edit Class' : 'Add New Class'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Class Name"
              value={formData.class_name}
              onChange={handleChange('class_name')}
              onBlur={handleBlur('class_name')}
              error={touched.class_name && Boolean(errors.class_name)}
              helperText={touched.class_name && errors.class_name}
              placeholder="e.g., Nursery, LKG, Grade 1"
              size="small"
            />

            <TextField
              select
              fullWidth
              label="Academic Year"
              value={formData.academic_years || ''}
              onChange={handleChange('academic_years')}
              onBlur={handleBlur('academic_years')}
              error={touched.academic_years && Boolean(errors.academic_years)}
              helperText={touched.academic_years && errors.academic_years}
              size="small"
            >
              <MenuItem value="" disabled>
                Select Academic Year
              </MenuItem>
              {sortedAcademicYears.map((year) => (
                <MenuItem
                  key={year.id}
                  value={year.id}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {year.academic_year}
                  {year.status === 'inactive' && ' (Inactive)'}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Status"
              value={formData.status || 'active'}
              onChange={handleChange('status')}
              size="small"
            >
              <MenuItem value="active" sx={{ fontSize: '0.875rem' }}>Active</MenuItem>
              <MenuItem value="inactive" sx={{ fontSize: '0.875rem' }}>Inactive</MenuItem>
            </TextField>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{ borderRadius: 1 }}
          disabled={!formData.class_name || !formData.academic_years}
        >
          {currentClass ? 'Update Class' : 'Add Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}