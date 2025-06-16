import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { AddStaffView } from './add-staff-view';

type Staff = {
    id?: number;
    name: string;
    gender: string;
    dob: string;
    phone: string;
    alt_phone?: string;
    email: string;
    qualification: string;
    designation: string;
    department: string;
    joining_date: string;
    employment_type: string;
    photo_url?: string;
    status?: string;
    created_at?: string;
};

type Column = {
    id: keyof Staff;
    label: string;
};

const columns: Column[] = [
    { id: 'name', label: 'Name' },
    { id: 'gender', label: 'Gender' },
    { id: 'designation', label: 'Designation' },
    { id: 'department', label: 'Department' },
    { id: 'employment_type', label: 'Employment Type' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
];

const StatusBadge = ({ status }: { status?: string }) => {
    const getStatusColor = () => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'error';
            default:
                return 'default';
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

const INITIAL_STAFF: Staff = {
    name: '',
    gender: '',
    dob: '',
    phone: '',
    email: '',
    qualification: '',
    designation: '',
    department: '',
    joining_date: '',
    employment_type: '',
    status: 'active',
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
const DEPARTMENTS = ['Academic', 'Administration', 'Support', 'Management'];

export function StaffView() {
    const navigate = useNavigate();
    const location = useLocation();
    const [staffs, setStaffs] = useState<Staff[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof Staff>('name');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<Set<keyof Staff>>(
        new Set(['name', 'gender', 'designation', 'department', 'employment_type', 'status'])
    );
    const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
    const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

    const fetchStaffs = async () => {
        try {
           
            const data = await invoke<Staff[]>('get_all_staffs');
           
            setStaffs(data);
        } catch (error) {
            console.error('Error fetching staffs:', error);
            setSuccessMessage('Failed to fetch staffs');
            setShowToast(true);
        }
    };

    useEffect(() => {
       
        fetchStaffs();
    }, []);

    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            setShowToast(true);
            // Clear the message from location state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const handleOpenAdd = () => {
        navigate('/dashboard/staff/add');
    };

    const handleSort = (field: keyof Staff) => {
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

    const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, staff: Staff) => {
        setActionMenuAnchor(event.currentTarget);
        setSelectedStaff(staff);
    };

    const handleActionMenuClose = () => {
        setActionMenuAnchor(null);
        setSelectedStaff(null);
    };

    const handleColumnMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setColumnMenuAnchor(event.currentTarget);
    };

    const handleColumnMenuClose = () => {
        setColumnMenuAnchor(null);
    };

    const toggleColumn = (columnId: keyof Staff) => {
        const newVisibleColumns = new Set(visibleColumns);
        if (newVisibleColumns.has(columnId)) {
            newVisibleColumns.delete(columnId);
        } else {
            newVisibleColumns.add(columnId);
        }
        setVisibleColumns(newVisibleColumns);
    };

    const filtered = useMemo(() => {
        const sorted = [...staffs].sort((a, b) => {
            const valA = a[orderBy];
            const valB = b[orderBy];
            if (valA === undefined || valB === undefined) return 0;
            return order === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
        });

        return sorted.filter((s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.designation.toLowerCase().includes(search.toLowerCase()) ||
            s.department.toLowerCase().includes(search.toLowerCase())
        );
    }, [staffs, search, order, orderBy]);

    const handleDelete = async () => {
        if (!selectedStaff?.id) return;

        try {
            if (window.confirm('Are you sure you want to delete this staff member?')) {
                await invoke('delete_staff', { id: selectedStaff.id });
                setSuccessMessage('Staff deleted successfully!');
                setShowToast(true);
                await fetchStaffs(); // Refresh the list after deletion
            }
        } catch (error) {
            console.error('Error deleting staff:', error);
            setSuccessMessage('Failed to delete staff');
            setShowToast(true);
        } finally {
            handleActionMenuClose();
        }
    };

    return (
        <DashboardContent>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Staff Management
                </Typography>
                <Button
                    variant="outlined"
                    onClick={handleOpenAdd}
                    color="inherit"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                >
                    New Staff
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
                                        .map((staff) => (
                                            <TableRow key={staff.id} hover>
                                                {columns.map((column) => (
                                                    visibleColumns.has(column.id) && (
                                                        <TableCell key={column.id}>
                                                            {column.id === 'status' ? (
                                                                <StatusBadge status={staff[column.id]} />
                                                            ) : (
                                                                staff[column.id]
                                                            )}
                                                        </TableCell>
                                                    )
                                                ))}
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="large"
                                                        onClick={(e) => handleActionMenuOpen(e, staff)}
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

            <Menu
                anchorEl={actionMenuAnchor}
                open={Boolean(actionMenuAnchor)}
                onClose={handleActionMenuClose}
            >
                <MenuItem onClick={() => {
                    if (selectedStaff) {
                        navigate('/dashboard/staff/add', { state: { staff: selectedStaff } });
                        handleActionMenuClose();
                    }
                }}>
                    <ListItemIcon>
                        <Iconify icon="solar:pen-bold" width={20} />
                    </ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={handleDelete}
                    sx={{ color: 'error.main' }}
                >
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
                    severity={location.state?.error ? 'error' : 'success'}
                    sx={{ width: '100%' }}
                >
                    {successMessage}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}