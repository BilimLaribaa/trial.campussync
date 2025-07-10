import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useMemo } from 'react';

import {
  Box,
  Card,
  Stack,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { StudentTable } from './StudentTable';
import { IDCardPreview } from './IDCardPreview';

// Types
type Student = {
  id: number;
  gr_number: string;
  roll_number: string;
  full_name: string;
  dob: string;
  gender: string;
  class_id: string;
  section: string;
  blood_group: string;
  passport_photo: string | null;
};

type Class = {
  id: number;
  class_name: string;
};

export function IdCardView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Filtered students based on class (only when selected) and search
  const filteredStudents = useMemo(() => {
    // If no class is selected, return empty array
    if (!selectedClass) return [];
    
    let result = students.filter(
      (student) => student.class_id.toString() === selectedClass
    );
    
    // Apply search filter if there's a search term
    if (search) {
      result = result.filter(
        (student) =>
          student.full_name.toLowerCase().includes(search.toLowerCase()) ||
          student.gr_number.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return result;
  }, [students, selectedClass, search]);

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const data = await invoke<Class[]>('get_active_classes');
      setClasses(data);
      // Don't set any default class initially
    } catch (error) {
      console.error('Error fetching classes:', error);
      setSuccessMessage('Failed to load classes');
      setShowToast(true);
    }
  };

  // Fetch students
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Student[]>('get_students', { id: null });

      // Fetch base64 images for each student
      const studentsWithImages = await Promise.all(
        data.map(async (student) => {
          if (student.passport_photo) {
            try {
              const base64Image = await invoke<string>(
                'get_student_document_base64',
                { fileName: student.passport_photo }
              );
              return { ...student, passport_photo: base64Image };
            } catch (error) {
              console.error(
                `Error fetching passport photo for student ${student.id}:`,
                error
              );
              return { ...student, passport_photo: null };
            }
          }
          return student;
        })
      );

      setStudents(studentsWithImages);
    } catch (error) {
      console.error('Error fetching students:', error);
      setSuccessMessage('Failed to load students');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedStudents([]);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleSelectStudent = (studentOrStudents: Student | Student[]) => {
    if (Array.isArray(studentOrStudents)) {
      setSelectedStudents(studentOrStudents);
    } else {
      setSelectedStudents((prev) =>
        prev.some((s) => s.id === studentOrStudents.id)
          ? prev.filter((s) => s.id !== studentOrStudents.id)
          : [...prev, studentOrStudents]
      );
    }
  };

  const handleClearSelection = () => {
    setSelectedStudents([]);
    setSuccessMessage('Cleared all selected students');
    setShowToast(true);
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">ID Card Management</Typography>
      </Box>

      <Stack direction="row" spacing={3} sx={{ height: 'calc(100vh - 180px)' }}>
        {/* Student Table */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <StudentTable
            students={filteredStudents}
            classes={classes}
            selectedClass={selectedClass}
            search={search}
            isLoading={isLoading}
            selectedStudents={selectedStudents}
            onClassChange={handleClassChange}
            onSearchChange={handleSearchChange}
            onSelectStudent={handleSelectStudent}
          />
        </Card>

        {/* ID Card Preview */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <IDCardPreview
  Student={selectedStudents?.length > 0 ? selectedStudents : filteredStudents || []}
  onClearSelection={handleClearSelection}
/>
        </Card>
      </Stack>

      {/* Snackbar for success messages */}
      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowToast(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}