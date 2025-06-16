import { invoke } from '@tauri-apps/api/core';
import { useNavigate, useLocation } from 'react-router-dom';

import { AddStaffView } from './add-staff-view';

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

export function AddStaffContainer() {
    const navigate = useNavigate();
    const location = useLocation();
    const editingStaff = location.state?.staff as Staff | null;

    const handleClose = () => {
        navigate('/dashboard/staff');
    };

    const handleSubmit = async (formData: Staff) => {
        try {
            if (editingStaff?.id) {
             
                await invoke('update_staff', {
                    id: editingStaff.id,
                    staff: {
                        ...formData,
                        id: editingStaff.id // Preserve the ID
                    }
                });
            } else {
             
                const newId = await invoke<number>('create_staff', {
                    staff: {
                        ...formData,
                        status: formData.status || 'active' // Ensure status is set
                    }
                });
              
            }

            navigate('/dashboard/staff', {
                state: {
                    message: editingStaff ? 'Staff updated successfully!' : 'Staff added successfully!'
                }
            });
        } catch (error) {
            console.error('Error saving staff:', error);
            // Show error in UI
            navigate('/dashboard/staff', {
                state: {
                    message: `Failed to ${editingStaff ? 'update' : 'create'} staff: ${error}`,
                    error: true
                }
            });
        }
    };

    return (
        <AddStaffView
            open
            onClose={handleClose}
            onSubmit={handleSubmit}
            currentStaff={editingStaff}
        />
    );
}

// For lazy loading
export default AddStaffContainer; 