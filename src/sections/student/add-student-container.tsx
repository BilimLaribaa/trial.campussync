import React from 'react';
import { useLocation } from 'react-router-dom';

import { Student } from './view/add-student-view'; // Adjust path if needed
import { AddStudentView } from './view/add-student-view';

export default function AddStudentContainer() {
  const location = useLocation();
  const student: Student | undefined = location.state?.student;

  return <AddStudentView editingStudent={student || null} />;
}
