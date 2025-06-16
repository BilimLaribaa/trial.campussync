import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

import {
  Box, Card, Stack, Button, TextField, Typography, Avatar,
  ListItemText, ListItemAvatar, ListItem, ListItemButton, List,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

type StudentStep1 = {
  full_name: string;
  gender: string;
  dob: string;
  aadhaar_no?: string;
  religion: string;
  caste: string;
  nationality: string;
  mobile_number: string;
  email?: string;
  address: string;
};

type StudentStep2 = {
  id: number;
  father_name: string;
  mother_name: string;
  father_occupation: string;
  mother_occupation: string;
  father_education: string;
  mother_education: string;
  emergency_contact: string;
};

type StudentStep3 = {
  id: number;
  prev_school?: string;
  last_class?: string;
  admission_date?: string;
  class_id?: number;
  status: string;
};

type FullStudent = {
  id: number;
  step1: StudentStep1;
  step2?: StudentStep2;
  step3?: StudentStep3;
};

export function StudentView() {
  const [students, setStudents] = useState<FullStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<FullStudent | null>(null);
  const [infoTab, setInfoTab] = useState<'personal' | 'guardian' | 'background'>('personal');
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const infoRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const [classOptions, setClassOptions] = useState<{ id: number, class_name: string }[]>([]);

  const getClassName = (id?: number) => {
    if (!id) return '-';
    const found = classOptions.find(cls => cls.id === id);
    return found ? found.class_name : `ID ${id}`;
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;

    const confirm = window.confirm(`Are you sure you want to delete ${selectedStudent.step1.full_name}?`);
    if (!confirm) return;

    try {
      await invoke('delete_student', { id: selectedStudent.id });

      const updated = students.filter((s) => s.id !== selectedStudent.id);
      setStudents(updated);
      setSelectedStudent(updated[0] || null);
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Failed to delete student.');
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      const s1 = await invoke<[number, StudentStep1][]>('get_all_student1');
      const s2 = await invoke<[number, StudentStep2][]>('get_all_student2');
      const s3 = await invoke<[number, StudentStep3][]>('get_all_student3');

      const s2Map = new Map(s2.map(([id, data]) => [id, data]));
      const s3Map = new Map(s3.map(([id, data]) => [id, data]));

      const all: FullStudent[] = s1.map(([id, data]) => ({
        id,
        step1: data,
        step2: s2Map.get(id),
        step3: s3Map.get(id),
      }));

      setStudents(all);
      setSelectedStudent(all[0] || null);
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classes = await invoke<{ id: number, class_name: string }[]>('get_all_classes');
        setClassOptions(classes);
      } catch (error) {
        console.error("Failed to fetch classes", error);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    if (infoRef.current) {
      setCardHeight(infoRef.current.clientHeight + 240);
    }
  }, [selectedStudent, infoTab]);

  return (
    <DashboardContent>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={700}>Student Management</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={() => navigate('/dashboard/student/add')}>
              Add Student
            </Button>
            <Button
              variant="outlined"
              disabled={!selectedStudent}
              onClick={() => navigate(`/dashboard/student/add/${selectedStudent?.id}`)}
            >
              Edit
            </Button>
            <Button variant="outlined" color="error" disabled={!selectedStudent} onClick={handleDelete}>
              Delete
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Card sx={{ width: '30%', p: 2, bgcolor: '#f7f9fb', height: cardHeight }}>
            <TextField fullWidth size="small" label="Search Students" sx={{ mb: 2 }} />
            <Box sx={{ overflowY: 'auto', maxHeight: cardHeight ? cardHeight - 80 : 420 }}>
              <List>
                {students.map((s) => (
                  <ListItem disablePadding key={s.id}>
                    <ListItemButton selected={selectedStudent?.id === s.id} onClick={() => setSelectedStudent(s)}>
                      <ListItemAvatar>
                        <Avatar src="/assets/avatars/avatar_1.jpg" />
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography fontWeight={600}>{s.step1.full_name}</Typography>}
                        secondary={`Class: ${getClassName(s.step3?.class_id)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Card>

          {selectedStudent && (
            <Card sx={{ width: '70%', overflow: 'hidden', borderRadius: 3, height: cardHeight || 420 }}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    height: 160,
                    backgroundImage: 'url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=80")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backdropFilter: 'blur(4px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 1,
                    p: 0.5,
                  }}
                >
                  <ToggleButtonGroup
                    value={infoTab}
                    exclusive
                    onChange={(e, v) => v && setInfoTab(v)}
                    size="medium"
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: '#fff',
                        borderColor: 'rgba(255,255,255,0.4)',
                        fontWeight: 600,
                      },
                      '& .Mui-selected': {
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        color: '#fff',
                        borderColor: 'rgba(255,255,255,0.8)',
                      },
                      '& .MuiToggleButton-root:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    <ToggleButton value="personal">Personal</ToggleButton>
                    <ToggleButton value="guardian">Guardian</ToggleButton>
                    <ToggleButton value="background">Background</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

              <Box sx={{ px: 3, position: 'relative', minHeight: 90 }}>
                <Avatar
                  src="/assets/avatars/avatar_1.jpg"
                  sx={{
                    width: 90,
                    height: 90,
                    border: '4px solid white',
                    position: 'absolute',
                    top: -45,
                    left: 24,
                  }}
                />
                <Box sx={{ pl: 12 }}>
                  {students.length === 0 ? (
                    <Typography variant="subtitle1" fontWeight={600}>
                      No student found
                    </Typography>
                  ) : selectedStudent ? (
                    <Typography variant="subtitle1" fontWeight={600}>
                      Name: {selectedStudent.step1.full_name || '-'}, Class: {getClassName(selectedStudent.step3?.class_id)}
                    </Typography>
                  ) : (
                    <Typography variant="subtitle1" fontWeight={600}>
                      No student selected
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box maxWidth={560} mx="auto" px={3} pb={3} ref={infoRef}>
                {students.length === 0 ? (
                  <Box sx={{ pt: 4 }}>
                    <Typography variant="h6" fontWeight={600} color="text.secondary">
                      No student records found.
                    </Typography>
                    <Typography variant="body2" mt={1}>
                      Please add a new student to begin.
                    </Typography>
                  </Box>
                ) : selectedStudent && infoTab === 'personal' ? (
                  <Stack spacing={1.25} pt={1}>
                    <Typography fontWeight={600} mb={1} fontSize={16}>Personal Info</Typography>
                    <InfoRow label="Gender" value={selectedStudent.step1.gender} />
                    <InfoRow label="Date of Birth" value={selectedStudent.step1.dob} />
                    <InfoRow label="Aadhar" value={selectedStudent.step1.aadhaar_no} />
                    <InfoRow label="Religion" value={selectedStudent.step1.religion} />
                    <InfoRow label="Caste" value={selectedStudent.step1.caste} />
                    <InfoRow label="Nationality" value={selectedStudent.step1.nationality} />
                    <InfoRow label="Mobile" value={selectedStudent.step1.mobile_number} />
                    <InfoRow label="Email" value={selectedStudent.step1.email} />
                    <InfoRow label="Address" value={selectedStudent.step1.address} />
                  </Stack>
                ) : selectedStudent && infoTab === 'guardian' ? (
                  <Stack spacing={1.25} pt={1}>
                    <Typography fontWeight={600} mb={1} fontSize={16}>Guardian Info</Typography>
                    <InfoRow label="Father's Name" value={selectedStudent.step2?.father_name} />
                    <InfoRow label="Mother's Name" value={selectedStudent.step2?.mother_name} />
                    <InfoRow label="Father's Occupation" value={selectedStudent.step2?.father_occupation} />
                    <InfoRow label="Mother's Occupation" value={selectedStudent.step2?.mother_occupation} />
                    <InfoRow label="Father's Education" value={selectedStudent.step2?.father_education} />
                    <InfoRow label="Mother's Education" value={selectedStudent.step2?.mother_education} />
                    <InfoRow label="Emergency Contact" value={selectedStudent.step2?.emergency_contact} />
                  </Stack>
                ) : selectedStudent && infoTab === 'background' ? (
                  <Stack spacing={1.25} pt={1}>
                    <Typography fontWeight={600} mb={1} fontSize={16}>Background Info</Typography>
                    <InfoRow label="Previous School" value={selectedStudent.step3?.prev_school} />
                    <InfoRow label="Last Class" value={selectedStudent.step3?.last_class} />
                    <InfoRow label="Admission Date" value={selectedStudent.step3?.admission_date} />
                    <InfoRow label="Class" value={getClassName(selectedStudent.step3?.class_id)} />
                    <InfoRow label="Status" value={selectedStudent.step3?.status} />
                  </Stack>
                ) : null}
              </Box>
            </Card>
          )}
        </Stack>
      </Stack>
    </DashboardContent>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" fontWeight={500}>{label}</Typography>
      <Typography variant="body2">{value || '-'}</Typography>
    </Stack>
  );
}
