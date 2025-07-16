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
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [allFilteredStudents, setAllFilteredStudents] = useState<Student[]>([]);

  // Filtered students based on class (only when selected) and search
  const filteredStudents = useMemo(() => {
     if (!selectedClass) {
      setAllFilteredStudents([]);
      return [];
    }
    
    let result = students.filter(
      (student) => student.class_id.toString() === selectedClass
    );
    
    if (search) {
      result = result.filter(
        (student) =>
          student.full_name.toLowerCase().includes(search.toLowerCase()) ||
          student.gr_number.toLowerCase().includes(search.toLowerCase())
      );
    }
    setAllFilteredStudents(result);
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

  useEffect(() => {
    // Automatically select first student when filtered students change
    if (filteredStudents.length > 0 && selectedStudents.length === 0) {
      setSelectedStudents([filteredStudents[0]]);
    }
  }, [filteredStudents]);

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

  const handleSelectStudent = (student: Student) => {
    setSelectedStudents(prev => 
      prev.some(s => s.id === student.id) 
        ? [] 
        : [student]
    );
  };

  //  const handleClearSelection = () => {
  //   setSelectedStudents([]);
  //   setSuccessMessage('Cleared all selected students');
  //   setShowToast(true);
  //   setDesignUrl(null);
  //   setDesignFile(null);
  // };

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">ID Card Management</Typography>
      </Box>

      <Stack direction="row" spacing={3} sx={{ height: 'calc(100vh - 180px)' }}>
        {/* Student Table - Left Panel */}
        <Card sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Box sx={{ overflow: 'auto', height: '100%' }}>
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
            </Box>
          </Box>
        </Card>

        {/* ID Card Preview - Right Panel */}
        <Card sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <IDCardPreview
              Student={selectedStudents?.length > 0 ? selectedStudents : filteredStudents || []}
              AllStudents={allFilteredStudents}  
              // onClearSelection={handleClearSelection}
            />
          </Box>
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