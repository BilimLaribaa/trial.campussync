import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useMemo } from 'react';

import { 
  Box, Card, Menu, Chip, Stack, Alert, Table, Dialog, Button, 
  Tooltip, TableRow, MenuItem, Snackbar, Checkbox, TableBody, 
  TableCell, TableHead, TextField, Typography, IconButton, 
  DialogTitle, ListItemIcon, ListItemText, DialogActions, 
  DialogContent, TableContainer, TableSortLabel, TablePagination 
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

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
  created_at?: string;
  updated_at?: string;
  academic_year_details?: AcademicYear;
};

type DisplayClass = Class & {
  academic_year?: string;
};

type Column = {
  id: keyof DisplayClass;
  label: string;
};

const columns: Column[] = [
  { id: 'class_name', label: 'Class Name' },
  { id: 'academic_year', label: 'Academic Year' },
  { id: 'status', label: 'Status' },
  { id: 'created_at', label: 'Created At' },
];

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
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof DisplayClass>>(
    new Set(['class_name', 'academic_year', 'status'])
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const transformClassForDisplay = (cls: Class): DisplayClass => ({
    ...cls,
    academic_year: cls.academic_year_details?.academic_year || 'N/A'
  });

  const fetchClasses = async () => {
    try {
      const data = await invoke<Class[]>('get_all_classes');
      setClasses(data);
      setDisplayClasses(data.map(transformClassForDisplay));
    } catch (error) {
      console.error('Error fetching classes:', error);
      setSuccessMessage('Failed to fetch classes');
      setShowToast(true);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const years = await invoke<AcademicYear[]>('get_all_academic_years');
      setAcademicYears(years);
    } catch (error) {
      console.error('Error fetching academic years:', error);
      setSuccessMessage('Failed to fetch academic years');
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
          class_name: formData.class_name,
          academic_years: formData.academic_years,
          status: formData.status
        });
        setSuccessMessage('Class updated successfully!');
      } else {
        await invoke('create_class', {
          className: formData.class_name,
          academicYears: formData.academic_years,
          status: formData.status
        });
        console.log("success");
        
        // setSuccessMessage('Class added successfully!');
      }
      setShowToast(true);
      fetchClasses();
      handleClose();
    } catch (error: any) {
      setSuccessMessage(error.message || 'Failed to save class');
      setShowToast(true);
    }
  };

  const handleDelete = async () => {
    if (selectedClass?.id && window.confirm('Are you sure you want to delete this class?')) {
      try {
        await invoke('delete_class', { id: selectedClass.id });
        setSuccessMessage('Class deleted successfully!');
        setShowToast(true);
        fetchClasses();
      } catch (error) {
        console.error('Error deleting class:', error);
        setSuccessMessage('Failed to delete class');
        setShowToast(true);
      }
    }
    handleActionMenuClose();
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

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, classItem: DisplayClass) => {
    setActionMenuAnchor(event.currentTarget);
    const originalClass = classes.find(c => c.id === classItem.id) || null;
    setSelectedClass(originalClass);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedClass(null);
  };

  const handleColumnMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
  };

  const toggleColumn = (columnId: keyof DisplayClass) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnId)) {
      newVisibleColumns.delete(columnId);
    } else {
      newVisibleColumns.add(columnId);
    }
    setVisibleColumns(newVisibleColumns);
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

      <Card>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              size="small"
              onClick={handleColumnMenuOpen}
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Columns
            </Button>
            <Menu
              anchorEl={columnMenuAnchor}
              open={Boolean(columnMenuAnchor)}
              onClose={handleColumnMenuClose}
            >
              {columns.map((column) => (
                <MenuItem key={column.id} onClick={() => toggleColumn(column.id)}>
                  <Checkbox checked={visibleColumns.has(column.id)} />
                  <ListItemText primary={column.label} />
                </MenuItem>
              ))}
            </Menu>
          </Stack>
        </Box>

        <Scrollbar>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    visibleColumns.has(column.id) && (
                      <TableCell key={column.id}>
                        <TableSortLabel
                          active={orderBy === column.id}
                          direction={orderBy === column.id ? order : 'asc'}
                          onClick={() => handleSort(column.id)}
                        >
                          {column.label}
                        </TableSortLabel>
                      </TableCell>
                    )
                  ))}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.length > 0 ? (
                  filtered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((classItem) => (
                      <TableRow key={classItem.id} hover>
                        {columns.map((column) => (
                          visibleColumns.has(column.id) && (
                            <TableCell key={column.id}>
                              {column.id === 'status' ? (
                                <StatusBadge status={classItem.status} />
                              ) : column.id === 'academic_year' ? (
                                classItem.academic_year || 'N/A'
                              ) : column.id === 'created_at' ? (
                                classItem.created_at
                              ) : (
                                String(classItem[column.id])
                              )}
                            </TableCell>
                          )
                        ))}
                        <TableCell align="right">
                          <IconButton
                            size="large"
                            onClick={(e) => handleActionMenuOpen(e, classItem)}
                            color="inherit"
                          >
                            <Iconify icon="eva:more-vertical-fill" width={24} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center">
                      <Box sx={{ py: 3 }}>
                        <Typography variant="h6" paragraph>
                          No Data
                        </Typography>
                        <Typography variant="body2">
                          No records found
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      <ClassForm
        open={openDialog}
        onClose={handleClose}
        onSubmit={handleSubmit}
        currentClass={editingClass}
        academicYears={academicYears}
      />

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedClass) {
            setEditingClass(selectedClass);
            setOpenDialog(true);
            handleActionMenuClose();
          }
        }}>
          <ListItemIcon>
            <Iconify icon="solar:pen-bold" width={20} />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Iconify icon="solar:trash-bin-trash-bold" width={20} sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowToast(false)}
          severity={successMessage.includes('Failed') ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}