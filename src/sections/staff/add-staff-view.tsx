import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    Box,
    Step,
    Stack,
    Button,
    Stepper,
    MenuItem,
    StepLabel,
    TextField,
    Container,
    Typography,
    Paper,
} from '@mui/material';

type Staff = {
    id?: number;
    name: string;
    gender: string;
    dob: string;
    phone: string;
    alt_phone?: string;
    email: string;
    qualification: string;
    designation: string;
    department: string;
    joining_date: string;
    employment_type: string;
    photo_url?: string;
    status?: string;
    created_at?: string;
};

type FormErrors = {
    [key in keyof Staff]?: string;
};

const INITIAL_VALUES: Staff = {
    name: '',
    gender: '',
    dob: '',
    phone: '',
    email: '',
    qualification: '',
    designation: '',
    department: '',
    joining_date: '',
    employment_type: '',
    status: 'active',
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
const DEPARTMENTS = ['Academic', 'Administration', 'Support', 'Management'];

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_REGEX = /^\d{10}$/;

interface AddStaffViewProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (formData: Staff) => void;
    currentStaff?: Staff | null;
}

const validateEmail = (value: string) => {
    if (!EMAIL_REGEX.test(value)) {
        return 'Please enter a valid email address';
    }
    return '';
};

const validatePhone = (value: string, isRequired = true) => {
    if (!value && !isRequired) return '';
    if (!PHONE_REGEX.test(value)) {
        return 'Please enter a valid 10-digit phone number';
    }
    return '';
};

const validateName = (value: string) => {
    if (value.length < 2) {
        return 'Name must be at least 2 characters long';
    }
    if (!/^[a-zA-Z\s]+$/.test(value)) {
        return 'Name can only contain letters and spaces';
    }
    return '';
};

const validateDOB = (value: string) => {
    const dobDate = new Date(value);
    const today = new Date();
    const minAge = new Date();
    minAge.setFullYear(today.getFullYear() - 18);

    if (dobDate > today) {
        return 'Date of birth cannot be in the future';
    }
    if (dobDate > minAge) {
        return 'Staff member must be at least 18 years old';
    }
    return '';
};

const validateJoiningDate = (value: string) => {
    const joinDate = new Date(value);
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 3);

    if (joinDate > maxFutureDate) {
        return 'Joining date cannot be more than 3 months in the future';
    }
    return '';
};

const validateLength = (value: string, fieldName: string, minLength = 2) => {
    if (value.length < minLength) {
        return `${fieldName} must be at least ${minLength} characters long`;
    }
    return '';
};

export function AddStaffView({ open, onClose, onSubmit, currentStaff }: AddStaffViewProps) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<Staff>(INITIAL_VALUES);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [activeStep, setActiveStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentStaff) {
            setFormData(currentStaff);
        } else {
            setFormData(INITIAL_VALUES);
        }
        setErrors({});
        setTouched({});
        setActiveStep(0);
    }, [currentStaff]);

    const steps = ['Personal Information', 'Contact Information', 'Employment Details'];

    const validateField = (field: keyof Staff, value: string) => {
        if (!value && field !== 'alt_phone' && field !== 'photo_url' && field !== 'status') {
            return `${field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} is required`;
        }

        switch (field) {
            case 'email':
                return validateEmail(value);
            case 'phone':
                return validatePhone(value, true);
            case 'alt_phone':
                return validatePhone(value, false);
            case 'name':
                return validateName(value);
            case 'dob':
                return validateDOB(value);
            case 'joining_date':
                return validateJoiningDate(value);
            case 'qualification':
                return validateLength(value, 'Qualification');
            case 'designation':
                return validateLength(value, 'Designation');
            default:
                return '';
        }
    };

    const handleChange = (field: keyof Staff) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));

        if (touched[field]) {
            setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
        }
    };

    const handleBlur = (field: keyof Staff) => () => {
        setTouched(prev => ({ ...prev, [field]: true }));
        setErrors(prev => ({ ...prev, [field]: validateField(field, formData[field] as string) }));
    };

    const validateCurrentStep = () => {
        const newErrors: FormErrors = {};
        let isValid = true;

        if (activeStep === 0) {
            // Personal Information validation
            ['name', 'gender', 'dob'].forEach(field => {
                const error = validateField(field as keyof Staff, formData[field as keyof Staff] as string);
                if (error) {
                    newErrors[field as keyof Staff] = error;
                    isValid = false;
                }
            });
        } else if (activeStep === 1) {
            // Contact Information validation
            ['phone', 'email'].forEach(field => {
                const error = validateField(field as keyof Staff, formData[field as keyof Staff] as string);
                if (error) {
                    newErrors[field as keyof Staff] = error;
                    isValid = false;
                }
            });

            if (formData.alt_phone) {
                const error = validateField('alt_phone', formData.alt_phone);
                if (error) {
                    newErrors.alt_phone = error;
                    isValid = false;
                }
            }
        } else if (activeStep === 2) {
            // Employment Details validation
            ['qualification', 'designation', 'department', 'joining_date', 'employment_type'].forEach(field => {
                const error = validateField(field as keyof Staff, formData[field as keyof Staff] as string);
                if (error) {
                    newErrors[field as keyof Staff] = error;
                    isValid = false;
                }
            });
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            setActiveStep((prevStep) => prevStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const handleSubmit = async () => {
        if (validateCurrentStep()) {
            setIsSubmitting(true);
            try {
                onSubmit(formData);
            } catch (error) {
                console.error('Error submitting staff data:', error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Full Name"
                            value={formData.name}
                            onChange={handleChange('name')}
                            onBlur={handleBlur('name')}
                            error={!!errors.name}
                            helperText={errors.name}
                            required
                        />
                        <TextField
                            select
                            fullWidth
                            label="Gender"
                            value={formData.gender}
                            onChange={handleChange('gender')}
                            onBlur={handleBlur('gender')}
                            error={!!errors.gender}
                            helperText={errors.gender}
                            required
                        >
                            {GENDER_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            type="date"
                            label="Date of Birth"
                            value={formData.dob}
                            onChange={handleChange('dob')}
                            onBlur={handleBlur('dob')}
                            error={!!errors.dob}
                            helperText={errors.dob}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                    </Stack>
                );
            case 1:
                return (
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Phone Number"
                            value={formData.phone}
                            onChange={handleChange('phone')}
                            onBlur={handleBlur('phone')}
                            error={!!errors.phone}
                            helperText={errors.phone}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Alternative Phone"
                            value={formData.alt_phone}
                            onChange={handleChange('alt_phone')}
                        />
                        <TextField
                            fullWidth
                            type="email"
                            label="Email"
                            value={formData.email}
                            onChange={handleChange('email')}
                            onBlur={handleBlur('email')}
                            error={!!errors.email}
                            helperText={errors.email}
                            required
                        />
                    </Stack>
                );
            case 2:
                return (
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Qualification"
                            value={formData.qualification}
                            onChange={handleChange('qualification')}
                            onBlur={handleBlur('qualification')}
                            error={!!errors.qualification}
                            helperText={errors.qualification}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Designation"
                            value={formData.designation}
                            onChange={handleChange('designation')}
                            onBlur={handleBlur('designation')}
                            error={!!errors.designation}
                            helperText={errors.designation}
                            required
                        />
                        <TextField
                            select
                            fullWidth
                            label="Department"
                            value={formData.department}
                            onChange={handleChange('department')}
                            onBlur={handleBlur('department')}
                            error={!!errors.department}
                            helperText={errors.department}
                            required
                        >
                            {DEPARTMENTS.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            type="date"
                            label="Joining Date"
                            value={formData.joining_date}
                            onChange={handleChange('joining_date')}
                            onBlur={handleBlur('joining_date')}
                            error={!!errors.joining_date}
                            helperText={errors.joining_date}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <TextField
                            select
                            fullWidth
                            label="Employment Type"
                            value={formData.employment_type}
                            onChange={handleChange('employment_type')}
                            onBlur={handleBlur('employment_type')}
                            error={!!errors.employment_type}
                            helperText={errors.employment_type}
                            required
                        >
                            {EMPLOYMENT_TYPES.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                );
            default:
                return null;
        }
    };

    return (
        <Container maxWidth="md">
            <Paper sx={{ p: 4, mt: 4 }}>
                <Typography variant="h4" gutterBottom align="center">
                    Add New Staff Member
                </Typography>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === steps.length ? (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>
                            All steps completed - Staff member added successfully!
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/dashboard/staff')}
                            sx={{ mt: 2 }}
                        >
                            View Staff List
                        </Button>
                    </Box>
                ) : (
                    <>
                        {renderStepContent(activeStep)}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
                            <Button
                                disabled={activeStep === 0}
                                onClick={handleBack}
                            >
                                Back
                            </Button>
                            {activeStep === steps.length - 1 ? (
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                >
                                    Next
                                </Button>
                            )}
                        </Box>
                    </>
                )}
            </Paper>
        </Container>
    );
}