import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StudentSearchContextType {
  grNumber: string;
  setGrNumber: (gr: string) => void;
}

const StudentSearchContext = createContext<StudentSearchContextType | undefined>(undefined);

export function useStudentSearch() {
  const context = useContext(StudentSearchContext);
  if (!context) {
    throw new Error('useStudentSearch must be used within a StudentSearchProvider');
  }
  return context;
}

export function StudentSearchProvider({ children }: { children: ReactNode }) {
  const [grNumber, setGrNumber] = useState('');
  return (
    <StudentSearchContext.Provider value={{ grNumber, setGrNumber }}>
      {children}
    </StudentSearchContext.Provider>
  );
} 