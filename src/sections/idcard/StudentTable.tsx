import { useState } from 'react';

import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Button,
    Menu,
    Typography,
    Divider,
  } from '@mui/material';
  
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
  
  type StudentTableProps = {
    students: Student[];
    classes: Class[];
    selectedClass: string;
    search: string;
    isLoading: boolean;
    selectedStudents: Student[];
    onClassChange: (classId: string) => void;
    onSearchChange: (value: string) => void;
    onSelectStudent: (studentOrStudents: Student | Student[]) => void;
  };
  
  export function StudentTable({
    students,
    classes,
    selectedClass,
    search,
    isLoading,
    selectedStudents,
    onClassChange,
    onSearchChange,
    onSelectStudent,
  }: StudentTableProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [columns, setColumns] = useState([
      { id: 'photo', label: 'Photo', visible: true },
      { id: 'name', label: 'Name', visible: true },
      { id: 'gr_number', label: 'GR No.', visible: true },
      { id: 'roll_number', label: 'Roll No.', visible: false },
      { id: 'dob', label: 'Date of Birth', visible: false },
      { id: 'gender', label: 'Gender', visible: false },
      { id: 'blood_group', label: 'Blood Group', visible: false },
    ]);
  
    const isAllSelected =
      students.length > 0 &&
      students.every((student) =>
        selectedStudents.some((s) => s.id === student.id)
      );
  
    const handleSelectAll = () => {
      if (isAllSelected) {
        onSelectStudent([]); // Pass an empty array to deselect all
      } else {
        onSelectStudent(students); // Pass the entire array to select all
      }
    };
  
    const handleColumnToggle = (columnId: string) => {
      setColumns((prevColumns) =>
        prevColumns.map((col) =>
          col.id === columnId ? { ...col, visible: !col.visible } : col
        )
      );
    };
  
    const handleColumnsButtonClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };
  
    const handleColumnsMenuClose = () => {
      setAnchorEl(null);
    };
  
    return (
      <Box sx={{ p: 2 }}>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Select Class</InputLabel>
            <Select
              value={selectedClass}
              onChange={(e) => onClassChange(e.target.value)}
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
  
          <TextField
            fullWidth
            size="small"
            label="Search Students"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
  
          <Button
            onClick={handleColumnsButtonClick}
            color="primary"
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                width="24"
                viewBox="0 0 24 24"
                style={{ verticalAlign: 'middle' }}
              >
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </Button>
  
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
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
        </Box>
  
        {/* Student Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                {columns
                  .filter((column) => column.visible)
                  .map((column) => (
                    <TableCell key={column.id}>{column.label}</TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.filter((col) => col.visible).length + 1}
                    align="center"
                  >
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.filter((col) => col.visible).length + 1}
                    align="center"
                  >
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={selectedStudents.some((s) => s.id === student.id)}
                        onChange={() => onSelectStudent(student)} // Pass a single student
                      />
                    </TableCell>
                    {columns.find((col) => col.id === 'photo')?.visible && (
                      <TableCell>
                        {student.passport_photo ? (
                          <img
                            src={`${student.passport_photo}`}
                            alt={student.full_name}
                            style={{ width: 50, height: 50, borderRadius: '50%' }}
                          />
                        ) : (
                          'No Photo'
                        )}
                      </TableCell>
                    )}
                    {columns.find((col) => col.id === 'name')?.visible && (
                      <TableCell>{student.full_name}</TableCell>
                    )}
                    {columns.find((col) => col.id === 'gr_number')?.visible && (
                      <TableCell>{student.gr_number}</TableCell>
                    )}
                    {columns.find((col) => col.id === 'roll_number')?.visible && (
                      <TableCell>{student.roll_number}</TableCell>
                    )}
                    {columns.find((col) => col.id === 'dob')?.visible && (
                      <TableCell>{student.dob}</TableCell>
                    )}
                    {columns.find((col) => col.id === 'gender')?.visible && (
                      <TableCell>{student.gender}</TableCell>
                    )}
                    {columns.find((col) => col.id === 'blood_group')?.visible && (
                      <TableCell>{student.blood_group}</TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }