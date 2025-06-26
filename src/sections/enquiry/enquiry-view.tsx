import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';

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
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import Config from '../../../config';
import { EnquiryForm } from './enquiry-form';


type Enquiry = {
  id?: number;
  student_name: string;
  parent_name: string;
  phone: string;
  email?: string;
  source: string;
  status?: string;
  created_at?: string;
};

type Column = {
  id: keyof Enquiry;
  label: string;
};

const columns: Column[] = [
  { id: 'parent_name', label: 'Parent Name' },
  { id: 'student_name', label: 'Student Name' },
  { id: 'phone', label: 'Phone' },
  { id: 'email', label: 'Email' },
  { id: 'source', label: 'Source' },
  { id: 'status', label: 'Status' },
  { id: 'created_at', label: 'Created At' },
];

const StatusBadge = ({ status: currentStatus }: { status?: string }) => {
  if (!currentStatus) return null;

  const getStatusColor = (statusText: string) => {
    switch (statusText.toLowerCase()) {
      case 'new':
        return 'info';
      case 'in progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={currentStatus}
      color={getStatusColor(currentStatus)}
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  );
};

export function EnquiryView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Enquiry>('parent_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [open, setOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof Enquiry>>(
    new Set([ 'parent_name', 'phone', 'email','status'])
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const navigate = useNavigate();

  const handleClickOpen = () => {
    setEditingEnquiry(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEnquiry(null);
  };

  const handleEdit = () => {
  if (selectedEnquiry) {
    setEditingEnquiry(selectedEnquiry);
    setOpen(true);
    
  }
  handleActionMenuClose();
};

  
  const handleDelete = async () => {
    if (selectedEnquiry?.id) {
      if (window.confirm('Are you sure you want to delete this enquiry?')) {
        try {
          await invoke('delete_enquiry', { id: selectedEnquiry.id });
          setSuccessMessage('Enquiry deleted successfully!');
          setShowToast(true);
          fetchEnquiries();
        } catch (error) {
          console.error('Error deleting enquiry:', error);
          setSuccessMessage('Failed to delete enquiry');
          setShowToast(true);
        }
      }
    }
    handleActionMenuClose();
  };

  const handleColumnMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
  };

  const toggleColumn = (columnId: keyof Enquiry) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnId)) {
      newVisibleColumns.delete(columnId);
    } else {
      newVisibleColumns.add(columnId);
    }
    setVisibleColumns(newVisibleColumns);
  };

  const fetchEnquiries = async () => {
    try {
      const data = await invoke<Enquiry[]>('get_all_enquiries');
      setEnquiries(data);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleSort = (field: keyof Enquiry) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const handleSuccess = () => {
  setSuccessMessage(editingEnquiry ? 'Enquiry updated successfully!' : 'Enquiry submitted successfully!');
  setShowToast(true);
  fetchEnquiries();
  setOpen(false); // Optional: close dialog after save
  setEditingEnquiry(null); // Optional: reset form state
};

  const filtered = useMemo(() => {
    const sorted = [...enquiries].sort((a, b) => {
      const valA = a[orderBy];
      const valB = b[orderBy];
      if (valA === undefined || valB === undefined) return 0;
      return order === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });

    return sorted.filter((s) => s.student_name.toLowerCase().includes(search.toLowerCase()));
  }, [enquiries, search, order, orderBy]);

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, enquiry: Enquiry) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedEnquiry(enquiry);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedEnquiry(null);
  };

  const handleReview = () => {
    if (selectedEnquiry?.id) {
      navigate(`/dashboard/enquiry/${selectedEnquiry.id}`);
    }
    handleActionMenuClose();
  };

  const [mailOpen, setMailOpen] = useState(false);
const [mailData, setMailData] = useState<{
  recipients: string[];
  subject: string;
  html: string;
}>({
  recipients: [],
  subject: '',
  html: '',
});

const handleMailClick = () => {
  const recipients = selectedEnquiry?.email
    ? [selectedEnquiry.email] 
    : [];

  setMailData({
    recipients,
    subject: '',
    html: '',
  });

  setMailOpen(true);
  handleActionMenuClose();
};

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Enquiries
        </Typography>
        <Button
          variant="outlined"
          onClick={handleClickOpen}
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          New Enquiry
        </Button>
        <EnquiryForm
          open={open}
          onClose={handleClose}
          onSuccess={handleSuccess}
          editingEnquiry={editingEnquiry}
        />
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
                {filtered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((enquiry) => (
                    <TableRow key={enquiry.id}>
                      {columns.map((column) => (
                        visibleColumns.has(column.id) && (
                          <TableCell key={column.id}>
                            {column.id === 'status' ? (
                              <StatusBadge status={enquiry[column.id]} />
                            ) : (
                              enquiry[column.id]
                            )}
                          </TableCell>
                        )
                      ))}
                      <TableCell align="right">
                        <Tooltip title="Review">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/dashboard/enquiry/${enquiry.id}`)}
                            color="inherit"
                          >
                            <Iconify icon="solar:eye-bold" width={20} />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="large"
                          onClick={(e) => handleActionMenuOpen(e, enquiry)}
                          color="inherit"
                        >
                          <Iconify icon="eva:more-vertical-fill" width={24} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
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
      </Card>

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={handleEdit}>
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
        <MenuItem onClick={handleEdit}>
  <ListItemIcon>
    <Iconify icon="solar:pen-bold" width={20} />
  </ListItemIcon>
  <ListItemText>Edit</ListItemText>
</MenuItem>
      </Menu>

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

      <Dialog open={mailOpen} onClose={() => setMailOpen(false)} fullWidth maxWidth="sm">
  <DialogTitle>Send Mail</DialogTitle>
  <DialogContent>
    <Stack spacing={2} mt={1}>
      <TextField
  label="To (comma separated emails)"
  fullWidth
  value={mailData.recipients.join(', ')}
  onChange={(e) =>
    setMailData({
      ...mailData,
      recipients: e.target.value.split(',').map(email => email.trim()),
    })
  }
/>
      <TextField
        label="Subject"
        fullWidth
        value={mailData.subject}
        onChange={(e) => setMailData({ ...mailData, subject: e.target.value })}
      />
      <TextField
        label="Message"
        fullWidth
        multiline
        minRows={4}
        value={mailData.html}
        onChange={(e) => setMailData({ ...mailData, html: e.target.value })}
      />
    </Stack>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setMailOpen(false)}>Cancel</Button>
    <Button
      variant="contained"
      onClick={async () => {
        try {
          const sender_email = "khan123personal@gmail.com";
          const sender_password = "vebk uali wcep smqj";

          const payload = {
            sender_email,
            sender_password,
            recipients: mailData.recipients,
            subject: mailData.subject,
            html: mailData.html,
          };

          await fetch( Config.backend+'/mail/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          alert("Email sent successfully!");
        } catch (error) {
          console.error("Failed to send mail:", error);
          alert("Failed to send email.");
        } finally {
          setMailOpen(false);
        }
      }}
    >
      Send
    </Button>
  </DialogActions>
</Dialog>
<EnquiryForm
  open={open}
  onClose={() => setOpen(false)}
  onSuccess={handleSuccess}
  editingEnquiry={editingEnquiry}
/>
    </DashboardContent>
    
  );
}
