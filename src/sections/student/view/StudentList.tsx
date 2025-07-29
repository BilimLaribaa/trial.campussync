import { useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

import {
  Box, Typography, Avatar, List, ListItem, ListItemButton,
  ListItemAvatar, ListItemText, CircularProgress, Alert
} from '@mui/material';

type Student = {
  id: number;
  gr_number: string;
  roll_number?: string;
  full_name: string;
  class_id: string;
  section?: string;
  passport_photo?: string;
};

interface Class {
  id: string;
  class_name: string;
}

interface StudentListProps {
  students: Student[];
  classMap: Record<string, string>;
  classes: Class[];
  selectedStudentId: number | null;
  loading: boolean;
  error: string | null;
  documentUrls: Record<number, { passport_photo?: string }>;
  onStudentSelect: (studentId: number | null) => void;
  selectedClass: string;  // Add this line
  onClassChange: (classId: string) => void;
}

export function StudentList({
  students,
  classMap,
  selectedStudentId,
  loading,
  error,
  documentUrls,
  onStudentSelect,
  selectedClass,
}: StudentListProps) {

 useEffect(() => {
    // Only auto-select first student if there are students in the list
    if (students.length > 0 && !selectedStudentId) {
      onStudentSelect(students[0].id);
    }
  }, [students, selectedStudentId, onStudentSelect]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }


  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {students.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography variant="body1" color="text.secondary">
            No students {selectedClass ? 'found in selected class' : 'available'}
          </Typography>
        </Box>
      ) : (
        <List sx={{ overflowY: 'auto', flex: 1 }}>
          {students.map((student) => (
            <ListItem disablePadding key={student.id}>
              <ListItemButton
                selected={selectedStudentId === student.id}
                onClick={() => onStudentSelect(student.id)}
              >
                <ListItemAvatar>
                  <Avatar
                    src={
                      student.passport_photo
                        ? convertFileSrc(student.passport_photo)
                        : "/assets/avatars/avatar_1.jpg"
                    }
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography fontWeight={600}>{student.full_name}</Typography>}
                  secondary={
                    <>
                      <Typography component="span" display="block">
                      {classMap[student.class_id] || student.class_id}
                      </Typography>
                      {student.roll_number && (
                        <Typography component="span" display="block">
                          Roll No: {student.roll_number}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
