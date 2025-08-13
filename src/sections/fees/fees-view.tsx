import { useState, useEffect, useMemo } from 'react';

import {
  Box, Card, Table, Stack, Button, Alert,
  TableBody, TableCell, TableHead, TableRow, TableContainer,
  TablePagination, IconButton, Typography, TextField, Menu, 
  MenuItem, Checkbox, ListItemText, Snackbar
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Settings } from 'src/components/settings';
import { Scrollbar } from 'src/components/scrollbar';

export type FeeItem = {
  fee_type: string;
  amount: number;
  start_date: string;
  end_date: string;
  late_payment_penalty: string;
};

export type FeeStructure = {
  id: string;
  category: string;
  fee_items: FeeItem[];
};

const feeTypes = [
  { value: 'registration_fees', label: 'Registration Fee' },
  { value: 'tuition_annual_fees', label: 'Annual Tuition Fee' },
  { value: 'tuition_monthly_fees', label: 'Monthly Tuition Fee' },
  { value: 'examination_annual_fees', label: 'Annual Examination Fee' },
  { value: 'library_annual_fees', label: 'Annual Library Fee' },
  { value: 'transport_monthly_fees', label: 'Monthly Transport Fee' },
  { value: 'development_annual_fees', label: 'Annual Development Fee' },
  { value: 'miscellaneous_monthly_fees', label: 'Monthly Miscellaneous Fee' },
];

const allColumns = [
  { id: 'category', label: 'Category' },
  { id: 'fee_type', label: 'Fee Type' },
  { id: 'amount', label: 'Amount' },
  { id: 'start_date', label: 'Start Date' },
  { id: 'end_date', label: 'End Date' },
  { id: 'late_payment_penalty', label: 'Late Penalty' },
];

export function FeesView() {
  const [fees, setFees] = useState<FeeStructure[]>(() => {
    const saved = localStorage.getItem('feeStructures');
    return saved ? JSON.parse(saved) : [];
  });

  const [feeSections, setFeeSections] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(allColumns.map(c => c.id)));
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showSettings, setShowSettings] = useState(false); // Initialize as false
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  // Load fee sections from localStorage
  useEffect(() => {
    const loadFeeSections = () => {
      const savedSections = localStorage.getItem('feeSections');
      if (savedSections) {
        const sections = JSON.parse(savedSections);
        setFeeSections(sections.map((section: { name: string }) => section.name));
      } else {
        setFeeSections(['Pre-Primary', 'Primary', 'Secondary']);
      }
    };

    loadFeeSections();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feeSections') {
        loadFeeSections();
      }
      if (e.key === 'feeStructures') {
        setFees(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleFeeUpdate = (event: CustomEvent) => {
      const saved = localStorage.getItem('feeStructures');
      setFees(saved ? JSON.parse(saved) : []);
      
      setSnackbar({
        open: true,
        message: event.detail.message,
        severity: event.detail.severity
      });
    };

    window.addEventListener('feeStructureUpdated', handleFeeUpdate as EventListener);
    
    return () => {
      window.removeEventListener('feeStructureUpdated', handleFeeUpdate as EventListener);
    };
  }, []);

  const handleEdit = (feeId: string) => {
    const feeToEdit = fees.find(f => f.id === feeId);
    if (feeToEdit) {
      setEditingFee(feeToEdit);
      setShowSettings(true); // Explicitly open settings
    }
  };

  const handleDelete = (feeId: string) => {
    if (!confirm('Are you sure you want to delete this fee structure? This action cannot be undone.')) {
      return;
    }
    
    const updatedFees = fees.filter(f => f.id !== feeId);
    setFees(updatedFees);
    localStorage.setItem('feeStructures', JSON.stringify(updatedFees));
    
    setSnackbar({
      open: true,
      message: 'Fee structure deleted successfully!',
      severity: 'success'
    });
  };

  const toggleColumn = (id: string) => {
    const updated = new Set(visibleColumns);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setVisibleColumns(updated);
  };

  const flattenedFees = useMemo(() => (
    fees.flatMap(fee =>
      fee.fee_items.map(item => ({
        id: `${fee.id}-${item.fee_type}`,
        fee_type: item.fee_type,
        amount: item.amount,
        start_date: item.start_date,
        end_date: item.end_date,
        late_payment_penalty: item.late_payment_penalty,
        category: fee.category
      }))
    )
    .filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = search === '' || 
        (item.category && item.category.toString().toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
  ), [fees, selectedCategory, search]);

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4">Fee Structure</Typography>
        <Button
          variant="contained"
          onClick={() => {
            setEditingFee(null);
            setShowSettings(true); // Explicitly open settings
          }}
          sx={{ ml: 'auto' }}
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          Add Fee Structure
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              label="Search by Category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              size="small"
              select
              label="Filter by Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 200 }}
            >
              <option value="All">All</option>
              {feeSections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </TextField>
            <Button
              size="small"
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Columns
            </Button>
            <Menu
              anchorEl={columnMenuAnchor}
              open={Boolean(columnMenuAnchor)}
              onClose={() => setColumnMenuAnchor(null)}
            >
              {allColumns.map((col) => (
                <MenuItem key={col.id} onClick={() => toggleColumn(col.id)}>
                  <Checkbox checked={visibleColumns.has(col.id)} />
                  <ListItemText primary={col.label} />
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
                  {allColumns.map((col) =>
                    visibleColumns.has(col.id) && (
                      <TableCell key={col.id}>{col.label}</TableCell>
                    )
                  )}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {flattenedFees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.size + 1} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No fee structures found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  flattenedFees
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <TableRow key={row.id} hover>
                        {visibleColumns.has('category') && <TableCell>{row.category}</TableCell>}
                        {visibleColumns.has('fee_type') && (
                          <TableCell>
                            {feeTypes.find(ft => ft.value === row.fee_type)?.label || row.fee_type}
                          </TableCell>
                        )}
                        {visibleColumns.has('amount') && <TableCell>₹{row.amount}</TableCell>}
                        {visibleColumns.has('start_date') && <TableCell>{row.start_date}</TableCell>}
                        {visibleColumns.has('end_date') && <TableCell>{row.end_date}</TableCell>}
                        {visibleColumns.has('late_payment_penalty') && <TableCell>{row.late_payment_penalty}</TableCell>}
                        <TableCell align="right">
                          <IconButton 
                            onClick={() => handleEdit(row.id.split('-')[0])}
                            color="primary"
                          >
                            <Iconify icon="solar:pen-bold" width={20} />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(row.id.split('-')[0])}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={flattenedFees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      {showSettings && (
        <Settings 
          onUpdateEmailSettings={() => {}} 
          onClose={() => {
            setShowSettings(false);
            setEditingFee(null);
          }}
          initialActiveTab="feesStructure"
          editingFee={editingFee}
        />
      )}
    </DashboardContent>
  );
}