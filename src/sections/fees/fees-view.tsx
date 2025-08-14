import { invoke } from '@tauri-apps/api/core';
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
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [feeSections, setFeeSections] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(allColumns.map(c => c.id)));
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  // Load fee structures from database
  const loadFeeStructures = async () => {
  try {
    const data: any[] = await invoke('get_fee_structures');
    const transformedData = data.map(item => ({
      id: item.id.toString(),
      category: item.student_category,
      fee_items: [{
        fee_type: item.fee_type,
        amount: item.monthly > 0 ? item.monthly : item.yearly,
        start_date: item.start_date || '', // Use actual start_date from database if available
        end_date: item.end_date || '',    // Use actual end_date from database if available
        late_payment_penalty: `${item.late_payment_penalty_pct}%`
      }]
    }));
    setFees(transformedData);

    const categories = [...new Set(transformedData.map(item => item.category))];
    setFeeSections(categories);
  } catch (error) {
    console.error('Failed to load fee structures:', error);
    setSnackbar({
      open: true,
      message: 'Failed to load fee structures',
      severity: 'error'
    });
  }
};

  const handleEdit = async (feeId: string) => {
  try {
    const feeData: any = await invoke('get_fee_structure', { id: Number(feeId) });
    const feeToEdit = {
      id: feeData.id.toString(),
      category: feeData.student_category,
      fee_items: [{
        fee_type: feeData.fee_type,
        amount: feeData.monthly > 0 ? feeData.monthly : feeData.yearly,
        start_date: feeData.start_date || '', // Use actual start_date from database
        end_date: feeData.end_date || '',    // Use actual end_date from database
        late_payment_penalty: `${feeData.late_payment_penalty_pct}%`
      }]
    };
    setEditingFee(feeToEdit);
    setShowSettings(true);
  } catch (error) {
    console.error('Failed to load fee for editing:', error);
    setSnackbar({
      open: true,
      message: 'Failed to load fee for editing',
      severity: 'error'
    });
  }
};

  useEffect(() => {
    loadFeeStructures();
  }, []);


  const handleDelete = async (feeId: string) => {  // Changed parameter type to string
    if (!confirm('Are you sure you want to delete this fee structure? This action cannot be undone.')) {
      return;
    }

    try {
      await invoke('delete_fee_structure', { id: Number(feeId) });  // Convert to number for the command
      await loadFeeStructures();

      setSnackbar({
        open: true,
        message: 'Fee structure deleted successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to delete fee structure:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete fee structure',
        severity: 'error'
      });
    }
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
            setShowSettings(true);
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
                            onClick={() => handleEdit(row.id.split('-')[0])}  // Already returns string
                            color="primary"
                          >
                            <Iconify icon="solar:pen-bold" width={20} />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(row.id.split('-')[0])}  // Already returns string
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
      loadFeeStructures();
    }}
    initialActiveTab="feesStructure"
    editingFee={
      editingFee
        ? {
            id: editingFee.id,
            category: editingFee.category,
            fee_items: editingFee.fee_items.map(item => ({
              fee_type: item.fee_type,
              amount: item.amount,
              start_date: item.start_date, // Now contains the actual date
              end_date: item.end_date,     // Now contains the actual date
              late_payment_penalty: item.late_payment_penalty,
            }))
          }
        : null
    }
  />
)}
    </DashboardContent>
  );
}