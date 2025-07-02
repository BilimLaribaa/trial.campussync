import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { PrintDialog } from 'src/components/PrintDialog';

type Student = {
  id: number;
  gr_number: string;
  roll_number: string;
  full_name: string;
  dob: string;
  gender: string;
  mother_name: string;
  father_name: string;
  father_occupation: string;
  mother_occupation: string;
  annual_income: number;
  nationality: string;
  profile_image: string | null;
  passport_photo: string | null;
  class_id: string;
  section: string;
  academic_year: string;
  email: string;
  mobile_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  blood_group: string;
  status: string;
  admission_date: string;
};

type Class = {
  id: number;
  name: string;
  class_name: string;
};

type DocumentUrls = {
  passport_photo?: string;
};

const columnConfig = [
  { id: 'passport_photo', label: 'Photo', visible: true },
  { id: 'name', label: 'Name', visible: true },
  { id: 'gr_number', label: 'GR No.', visible: true },
  { id: 'class', label: 'Class', visible: false },
  { id: 'section', label: 'Section', visible: false },
  { id: 'gender', label: 'Gender', visible: false },
  { id: 'blood_group', label: 'Blood Group', visible: false },
];

export function IdCardView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [successMessage, setSuccessMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [columns, setColumns] = useState(columnConfig);
  const [selectedDesign, setSelectedDesign] = useState<string>('default');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<number, DocumentUrls>>({});
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const navigate = useNavigate();

  const open = Boolean(anchorEl);
  const [printOpen, setPrintOpen] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => (students || [])
    .filter(student =>
      selectedClass === '' || student.class_id.toString() === selectedClass
    )
    .filter(student =>
      student.full_name.toLowerCase().includes(search.toLowerCase()) ||
      student.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
      student.gr_number.toLowerCase().includes(search.toLowerCase())
    ), [students, selectedClass, search]);

  const getClassNameById = (classId: string) => {
    if (!classId) return 'N/A';
    const foundClass = classes.find(cls => cls.id.toString() === classId.toString());
    return foundClass ? foundClass.class_name : 'N/A';
  };

  const getDocumentPaths = useCallback(async (student: Student): Promise<DocumentUrls> => {
    const paths: DocumentUrls = {};
    if (student?.passport_photo) {
      try {
        paths.passport_photo = await invoke<string>("get_student_document_base64", {
          fileName: student.passport_photo,
        });
      } catch (err) {
        console.error("Failed to load passport photo:", err);
        paths.passport_photo = "";
      }
    }
    return paths;
  }, []);

  const loadDocumentsForCurrentPage = useCallback(async () => {
    const currentStudents = filtered.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    setDocumentsLoading(true);
    try {
      const newDocumentUrls = { ...documentUrls };
      const studentsToLoad = currentStudents.filter(
        student => !newDocumentUrls[student.id]?.passport_photo && student.passport_photo
      );

      await Promise.all(
        studentsToLoad.map(async (student) => {
          newDocumentUrls[student.id] = await getDocumentPaths(student);
        })
      );

      setDocumentUrls(newDocumentUrls);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  }, [page, rowsPerPage, filtered, getDocumentPaths]);

  const fetchClasses = async () => {
    try {
      const data = await invoke<Class[]>('get_all_classes');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setSuccessMessage('Failed to load classes');
      setShowToast(true);
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Student[]>("get_students", { id: null });
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
      setSuccessMessage("Failed to load students");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (filtered.length > 0) {
      loadDocumentsForCurrentPage();
    }
  }, [loadDocumentsForCurrentPage, page, rowsPerPage]);

  const handleClassChange = (event: SelectChangeEvent) => {
    setSelectedClass(event.target.value);
    setPage(0);
    setSelectedStudents([]);
  };

  const handleGenerateIdCard = (student: Student) => {
    if (selectedStudents.some(s => s.id === student.id)) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleSelectAll = () => {
    const targetStudents = selectedClass
      ? students.filter(s => s.class_id.toString() === selectedClass)
      : students;

    setSelectedStudents(targetStudents);
    setSuccessMessage(`Selected ${targetStudents.length} student(s)` +
      (selectedClass ? ` in class ${getClassNameById(selectedClass)}` : ''));
    setShowToast(true);
  };

  const handleClearAll = () => {
    setSelectedStudents([]);
    setSuccessMessage('Cleared all selected students');
    setShowToast(true);
  };

  const handleRemoveIdCard = (studentId: number) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const handleColumnToggle = (columnId: string) => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleDesignChange = (event: SelectChangeEvent) => {
    setSelectedDesign(event.target.value);
  };

  const handleColumnsButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleColumnsMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePrint = () => {
    if (selectedStudents.length > 0) {
      setPrintOpen(true);
      setSuccessMessage(`Preparing to print ${selectedStudents.length} ID card(s)`);
      setShowToast(true);
    }
  };

  const isAllSelected = filtered.length > 0 &&
    filtered
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .every(student => selectedStudents.some(s => s.id === student.id));

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          ID Card Management
        </Typography>
      </Box>

      <Stack direction="row" spacing={3} sx={{ height: 'calc(100vh - 180px)' }}>
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={selectedClass}
                  onChange={handleClassChange}
                  label="Select Class"
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id.toString()}>
                      {cls.class_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Button
                  onClick={handleColumnsButtonClick}
                  color="primary"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:pen-bold" width={20} />}
                  sx={{ borderRadius: 1, textTransform: 'none', padding: '6px 12px' }}
                >
                  Columns
                </Button>
              </Stack>

              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleColumnsMenuClose}
                PaperProps={{
                  style: {
                    width: 200,
                  },
                }}
              >
                <Typography variant="subtitle2" sx={{ p: 2 }}>
                  Visible Columns
                </Typography>
                <Divider />
                {columns.map((column) => (
                  <MenuItem
                    key={column.id}
                    onClick={() => handleColumnToggle(column.id)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    {column.label}
                    <Checkbox
                      checked={column.visible}
                      size="small"
                      sx={{ p: 0 }}
                    />
                  </MenuItem>
                ))}
              </Menu>
            </Stack>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Search Students"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
          </Box>

          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} mb={1}>
            <Scrollbar>
              <TableContainer sx={{ flex: 1 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          indeterminate={
                            selectedStudents.length > 0 &&
                            selectedStudents.length < filtered.length
                          }
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      {columns.find(c => c.id === 'passport_photo')?.visible && (
                        <TableCell>Photo</TableCell>
                      )}
                      {columns.find(c => c.id === 'gr_number')?.visible && (
                        <TableCell>GR No.</TableCell>
                      )}
                      {columns.find(c => c.id === 'name')?.visible && (
                        <TableCell>Name</TableCell>
                      )}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={columns.filter(c => c.visible).length + 2} align="center">
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.filter(c => c.visible).length + 2} align="center">
                          No students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((student) => {
                          const passportPhoto = documentUrls[student.id]?.passport_photo;
                          return (
                            <TableRow key={student.id} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  color="primary"
                                  checked={selectedStudents.some(s => s.id === student.id)}
                                  onChange={() => handleGenerateIdCard(student)}
                                />
                              </TableCell>
                              {columns.find(c => c.id === 'passport_photo')?.visible && (
                                <TableCell>
                                  {documentsLoading ? (
                                    <CircularProgress size={24} />
                                  ) : passportPhoto ? (
                                    <Avatar
                                      src={passportPhoto}
                                      alt={`${student.full_name}'s passport photo`}
                                      sx={{
                                        width: 56,
                                        height: 56,
                                        border: '1px solid #ddd',
                                      }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <Avatar
                                      sx={{
                                        width: 56,
                                        height: 56,
                                        bgcolor: 'grey.200',
                                        border: '1px solid #ddd',
                                      }}
                                    >
                                      <Typography variant="body2" color="text.secondary">
                                        {student.passport_photo ? 'Photo not loaded' : 'No photo'}
                                      </Typography>
                                    </Avatar>
                                  )}
                                </TableCell>
                              )}
                              {columns.find(c => c.id === 'name')?.visible && (
                                <TableCell>{student.full_name}</TableCell>
                              )}
                              {columns.find(c => c.id === 'gr_number')?.visible && (
                                <TableCell>{student.gr_number}</TableCell>
                              )}
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        </Card>

        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                ID Card Preview {selectedStudents.length > 0 && `(${selectedStudents.length})`}
              </Typography>

              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>ID Card Design</InputLabel>
                  <Select
                    value={selectedDesign}
                    onChange={handleDesignChange}
                    label="ID Card Design"
                  >
                    <MenuItem value="default">Default Design</MenuItem>
                    <MenuItem value="design1">Design 1</MenuItem>
                    <MenuItem value="design2">Design 2</MenuItem>
                    <MenuItem value="custom">Custom Design</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleClearAll}
                  disabled={selectedStudents.length === 0}
                  startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={35} sx={{ color: 'error.main' }} />}
                >
                  Clear All
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Scrollbar>
              <Box sx={{
                p: 2,
                minHeight: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 2,
              }}>
                {selectedStudents.length === 0 ? (
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="body1" color="text.secondary">
                      Select students to preview ID cards
                    </Typography>
                  </Box>
                ) : (
                  selectedStudents.map((student) => {
                    const passportPhoto = documentUrls[student.id]?.passport_photo;
                    return (
                      <Box key={student.id} sx={{
                        width: '100%',
                        height: '450px',
                        border: '1px dashed grey',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                        position: 'relative',
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        boxShadow: 1
                      }}>
                        <IconButton
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'error.main',
                            color: 'error.contrastText',
                            '&:hover': {
                              bgcolor: 'error.dark',
                            }
                          }}
                          onClick={() => handleRemoveIdCard(student.id)}
                          size="small"
                        >
                          <Iconify icon="mingcute:close-line" width={16} />
                        </IconButton>

                        <Box sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12
                        }}>
                          {selectedStudents.findIndex(s => s.id === student.id) + 1}
                        </Box>

                        {documentsLoading ? (
                          <Box sx={{
                            width: '120px',
                            height: '150px',
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CircularProgress />
                          </Box>
                        ) : passportPhoto ? (
                          <Box sx={{
                            width: '120px',
                            height: '150px',
                            mb: 2,
                            overflow: 'hidden',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}>
                            <img
                              src={passportPhoto}
                              alt={student.full_name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </Box>
                        ) : (
                          <Box sx={{
                            width: '120px',
                            height: '150px',
                            mb: 2,
                            bgcolor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}>
                            <Typography variant="body2" color="text.secondary">
                              {student.passport_photo ? 'Photo not loaded' : 'No photo available'}
                            </Typography>
                          </Box>
                        )}

                        <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
                          {student.full_name}
                        </Typography>
                        <Typography variant="body2">GR No: {student.gr_number}</Typography>
                        <Typography variant="body2">Roll No: {student.roll_number}</Typography>
                        <Typography variant="body2">
                          Class: {getClassNameById(student.class_id)} - {student.section}
                        </Typography>
                        <Typography variant="body2">DOB: {student.dob}</Typography>
                        <Typography variant="body2">Blood Group: {student.blood_group}</Typography>

                        <Box sx={{
                          position: 'absolute',
                          bottom: 8,
                          left: 0,
                          right: 0,
                          textAlign: 'center',
                          fontSize: 10,
                          color: 'text.secondary'
                        }}>
                          ID Card Design: {selectedDesign}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Scrollbar>
          </Box>

          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={selectedStudents.length === 0}
              onClick={handlePrint}
              startIcon={<Iconify icon="material-symbols:print-outline" width={20} />}
              sx={{ width: '100%', maxWidth: '300px' }}
            >
              Print {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
            </Button>
          </Box>
        </Card>
      </Stack>

      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowToast(false)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <PrintDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="ID Card Print Preview"
        printData={printContentRef.current ?? undefined}
      >
        <Box ref={printContentRef} className="print-content" sx={{ p: 2 }}>
          {selectedStudents.map((student) => {
            const passportPhoto = documentUrls[student.id]?.passport_photo;
            return (
              <Box 
                key={student.id} 
                sx={{
                  width: '100%',
                  height: '450px',
                  border: '1px dashed grey',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  position: 'relative',
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1,
                  mb: 2,
                  breakInside: 'avoid'
                }}
              >
                {documentsLoading ? (
                  <Box sx={{
                    width: '120px',
                    height: '150px',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CircularProgress />
                  </Box>
                ) : passportPhoto ? (
                  <Box sx={{
                    width: '120px',
                    height: '150px',
                    mb: 2,
                    overflow: 'hidden',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}>
                    <img
                      src={passportPhoto}
                      alt={student.full_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{
                    width: '120px',
                    height: '150px',
                    mb: 2,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      {student.passport_photo ? 'Photo not loaded' : 'No photo available'}
                    </Typography>
                  </Box>
                )}

                <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
                  {student.full_name}
                </Typography>
                <Typography variant="body2">GR No: {student.gr_number}</Typography>
                <Typography variant="body2">Roll No: {student.roll_number}</Typography>
                <Typography variant="body2">
                  Class: {getClassNameById(student.class_id)} - {student.section}
                </Typography>
                <Typography variant="body2">DOB: {student.dob}</Typography>
                <Typography variant="body2">Blood Group: {student.blood_group}</Typography>

                <Box sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontSize: 10,
                  color: 'text.secondary'
                }}>
                  ID Card Design: {selectedDesign}
                </Box>
              </Box>
            );
          })}
        </Box>
      </PrintDialog>
    </DashboardContent>
  );
}