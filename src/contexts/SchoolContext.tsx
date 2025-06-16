import { invoke } from '@tauri-apps/api/core';
import { createContext, useState, useEffect, ReactNode } from 'react';

// Updated School interface with all fields
export interface School {
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

interface SchoolContextType {
    school: School | null;
    refreshSchool: () => Promise<void>;
}

export const SchoolContext = createContext<SchoolContextType>({
    school: null,
    refreshSchool: async () => {},
});

interface SchoolProviderProps {
    children: ReactNode;
}

export function SchoolProvider({ children }: SchoolProviderProps) {
    const [school, setSchool] = useState<School | null>(null);

    const refreshSchool = async () => {
        try {
            const schoolId = localStorage.getItem('school_id');
            if (!schoolId) {
                console.error('No school ID found in localStorage');
                return;
            }
            
            const response = await fetch(`http://192.168.1.17:5000/schools/${schoolId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch school data');
            }
            const data = await response.json();
            // Ensure the returned data conforms to the School interface
            setSchool(data as School | null);
         
        } catch (err) {
            console.error('Failed to load school data:', err);
        }
    };

    useEffect(() => {
        refreshSchool();
    }, []);

    return (
        <SchoolContext.Provider value={{ school, refreshSchool }}>
            {children}
        </SchoolContext.Provider>
    );
}
