import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

// Import the Class type from the view component to ensure consistency
type Class = {
    id?: number;
    class_name: string;
    academic_year: string;
    status?: string;
    created_at?: string;
};

type FormErrors = {
    class_name?: string;
    academic_year?: string;
};

const INITIAL_VALUES: Class = {
    class_name: '',
    academic_year: '',
    status: 'active',
};

const ACADEMIC_YEARS = [
    '2024-2025',
    '2023-2024',
    '2022-2023',
];

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (formData: Class) => void;
    currentClass?: Class | null;
}

export function ClassForm({ open, onClose, onSubmit, currentClass }: Props) {
    const [formData, setFormData] = useState<Class>(INITIAL_VALUES);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (currentClass) {
            setFormData(currentClass);
        } else {
            setFormData(INITIAL_VALUES);
        }
        // Reset errors and touched state when form opens/closes
        setErrors({});
        setTouched({});
    }, [currentClass, open]);

    const validateField = (field: keyof Class, value: string) => {
        if (!value) {
            return `${field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} is required`;
        }
        return '';
    };

    const handleChange = (field: keyof Class) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Validate field if it's been touched
        if (touched[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: validateField(field, value),
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
            [field]: validateField(field, formData[field] as string),
        }));
    };

    const validateForm = () => {
        const newErrors: FormErrors = {};
        let isValid = true;

        // Validate required fields
        if (!formData.class_name) {
            newErrors.class_name = 'Class Name is required';
            isValid = false;
        }
        if (!formData.academic_year) {
            newErrors.academic_year = 'Academic Year is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = () => {
        // Mark all fields as touched
        const allTouched = Object.keys(formData).reduce((acc, key) => ({
            ...acc,
            [key]: true,
        }), {});
        setTouched(allTouched);

        if (validateForm()) {
            onSubmit(formData);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{currentClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Class Name"
                            value={formData.class_name}
                            onChange={handleChange('class_name')}
                            onBlur={handleBlur('class_name')}
                            error={touched.class_name && Boolean(errors.class_name)}
                            helperText={touched.class_name && errors.class_name}
                            placeholder="e.g., Nursery, LKG, Grade 1"
                        />
                        <TextField
                            select
                            fullWidth
                            label="Academic Year"
                            value={formData.academic_year}
                            onChange={handleChange('academic_year')}
                            onBlur={handleBlur('academic_year')}
                            error={touched.academic_year && Boolean(errors.academic_year)}
                            helperText={touched.academic_year && errors.academic_year}
                        >
                            {ACADEMIC_YEARS.map((year) => (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={formData.status || 'active'}
                            onChange={handleChange('status')}
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </TextField>
                    </Stack>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                >
                    {currentClass ? 'Update' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
} 