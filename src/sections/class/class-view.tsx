import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useMemo } from 'react';

import {
  Box, Card, Menu, Chip, Stack, Alert, Dialog, Button,
  Tooltip, TextField, Typography, IconButton,
  DialogTitle, ListItemIcon, ListItemText, DialogActions,
  DialogContent, Switch, CardContent, FormControlLabel,
  MenuItem, Snackbar
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { ClassForm } from './class-form';

type AcademicYear = {
  id: number;
  academic_year: string;
  status?: string;
};

type Class = {
  id?: number;
  class_name: string;
  academic_years: number;
  status?: string;
  academic_year_details?: AcademicYear;
};

type DisplayClass = Class & {
  academic_year?: string;
};

const StatusBadge = ({ status }: { status?: string }) => {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  return (
    <Chip
      label={status || 'N/A'}
      color={getStatusColor()}
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  );
};

const ClassCard = ({ 
  classItem, 
  onToggleStatus,
  onEdit
}: {
  classItem: DisplayClass;
  onToggleStatus: (id?: number) => void;
  onEdit: () => void;
}) => (
  <Card sx={{ width: '100%', maxWidth: 300, m: 1 }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{classItem.class_name}</Typography>
        <StatusBadge status={classItem.status} />
      </Stack>

      <Stack spacing={1} mb={2}>
        <Typography variant="body2">
          <strong>Academic Year:</strong> {classItem.academic_year || 'N/A'}
        </Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <FormControlLabel
          control={
            <Switch
              checked={classItem.status === 'active'}
              onChange={() => onToggleStatus(classItem.id)}
              color="success"
            />
          }
          label={classItem.status === 'active' ? 'Active' : 'Inactive'}
        />
        
        <Button
          size="small"
          onClick={onEdit}
          color="primary"
          startIcon={<Iconify icon="solar:pen-bold" width={16} />}
        >
          Edit
        </Button>
      </Stack>
    </CardContent>
  </Card>
);

export function ClassView() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [displayClasses, setDisplayClasses] = useState<DisplayClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof DisplayClass>('class_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [errorStatus, setErrorStatus] = useState(false);

  const transformClassForDisplay = (cls: Class): DisplayClass => ({
    ...cls,
    academic_year: cls.academic_year_details?.academic_year || 'N/A'
  });

  const fetchClasses = async () => {
    try {
      const data = await invoke<Class[]>('get_all_classes');
      console.log('Fetched classes:', data);
      setClasses(data);
      setDisplayClasses(data.map(transformClassForDisplay));
    } catch (error) {
      console.error('Error fetching classes:', error);
      setSuccessMessage('Failed to fetch classes');
      setErrorStatus(true);
      setShowToast(true);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const years = await invoke<AcademicYear[]>('get_all_academic_years');
      setAcademicYears(years);

      if (years.length > 0) {
        const currentYear = years.find(y => y.status === 'active') || years[0];
        await invoke('check_and_initialize_default_classes_once', {
          academicYearId: currentYear.id
        });
        fetchClasses();
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      setSuccessMessage('Failed to fetch academic years');
      setErrorStatus(true);
      setShowToast(true);
    }
  };

  const handleToggleStatus = async (classId?: number) => {
    if (!classId) return;

    try {
      await invoke('toggle_class_status', { id: classId });
      setSuccessMessage('Class status updated successfully!');
      setErrorStatus(false);
      setShowToast(true);
      fetchClasses();
    } catch (error) {
      setSuccessMessage('Failed to update class status');
      setErrorStatus(true);
      setShowToast(true);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchAcademicYears();
  }, []);

  const handleOpenAdd = () => {
    setEditingClass(null);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setEditingClass(null);
  };

  const handleSubmit = async (formData: Class) => {
    try {
      if (editingClass?.id) {
        await invoke('update_class', {
          id: editingClass.id,
          className: formData.class_name,
          academicYears: formData.academic_years,
          status: formData.status || 'active'
        });
        setSuccessMessage('Class updated successfully!');
      } else {
        await invoke('create_class', {
          className: formData.class_name,
          academicYears: formData.academic_years,
          status: formData.status || 'active'
        });
        setSuccessMessage('Class added successfully!');
        setErrorStatus(false);
      }
      setShowToast(true);
      fetchClasses();
      handleClose();
    } catch (error: any) {
      setSuccessMessage(error.toString());
      setErrorStatus(true);
      setShowToast(true);
    }
  };

  const handleSort = (field: keyof DisplayClass) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const sorted = [...displayClasses].sort((a, b) => {
      const valA = a[orderBy];
      const valB = b[orderBy];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return order === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return sorted.filter((c) =>
      c.class_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.academic_year?.toLowerCase().includes(search.toLowerCase()) || false)
    );
  }, [displayClasses, search, order, orderBy]);

  // Group classes into rows of 4
  const groupedClasses = useMemo(() => {
    const slicedClasses = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const rows = [];
    for (let i = 0; i < slicedClasses.length; i += 4) {
      rows.push(slicedClasses.slice(i, i + 4));
    }
    return rows;
  }, [filtered, page, rowsPerPage]);

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Class Management
        </Typography>
        <Button
          variant="outlined"
          onClick={handleOpenAdd}
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          New Class
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
          />
        </Stack>
      </Box>

      {filtered.length > 0 ? (
        <Stack spacing={2}>
          {groupedClasses.map((row, rowIndex) => (
            <Stack key={rowIndex} direction="row" spacing={2} justifyContent="flex-start">
              {row.map((classItem) => (
                <Box key={classItem.id} sx={{ width: '25%' }}>
                  <ClassCard
                    classItem={classItem}
                    onToggleStatus={handleToggleStatus}
                    onEdit={() => {
                      const originalClass = classes.find(c => c.id === classItem.id) || null;
                      setEditingClass(originalClass);
                      setOpenDialog(true);
                    }}
                  />
                </Box>
              ))}
            </Stack>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="h6" paragraph>
            No Data
          </Typography>
          <Typography variant="body2">
            No records found
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          sx={{ mr: 1 }}
        >
          Previous
        </Button>
        <Button
          variant="outlined"
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * rowsPerPage >= filtered.length}
        >
          Next
        </Button>
      </Box>

      <ClassForm
        open={openDialog}
        onClose={handleClose}
        onSubmit={handleSubmit}
        currentClass={editingClass}
        academicYears={academicYears}
      />

      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowToast(false)}
          severity={errorStatus ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}