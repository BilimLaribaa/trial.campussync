import React from 'react';
import { merge } from 'es-toolkit';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import FullCalendar from '@fullcalendar/react';
import { useBoolean } from 'minimal-shared/hooks';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate, useParams } from 'react-router-dom';
import { format as formatDateFn, parseISO, isSameDay } from 'date-fns';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme, Theme, PaletteColor } from '@mui/material/styles';
import { Modal, FormControl, InputLabel, Select, Badge, RadioGroup, FormControlLabel, Radio, FormLabel } from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';


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

type FollowUp = {
  id?: number;
  enquiry_id: number;
  notes: string;
  status: string;
  created_at: string;
  follow_up_date?: string;
};

type Note = {
  id?: number;
  enquiry_id: number;
  notes: string;
  created_at?: string;
};

type StatusOption = {
  value: string;
  label: string;
  color: 'info' | 'warning' | 'success' | 'error';
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'new', label: 'New', color: 'info' },
  { value: 'in progress', label: 'In Progress', color: 'warning' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
];

const NOTE_COLORS = [
  {
    bg: '#E8F5E9',
    border: '#C8E6C9',
  },
  {
    bg: '#F3E5F5',
    border: '#E1BEE7',
  },
  {
    bg: '#E3F2FD',
    border: '#BBDEFB',
  },
  {
    bg: '#FFF3E0',
    border: '#FFE0B2',
  },
  {
    bg: '#F3E5F5',
    border: '#E1BEE7',
  },
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

export function EnquiryReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newFollowUp, setNewFollowUp] = useState({
    notes: '',
    status: STATUS_OPTIONS[0]?.value || '',
    follow_up_date: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [calendarFollowUpEvents, setCalendarFollowUpEvents] = useState<any[]>([]);

  const fetchEnquiry = async () => {
    try {
      const data = await invoke<Enquiry>('get_enquiry', { id: Number(id) });
      setEnquiry(data);
    } catch (error) {
      console.error('Error fetching enquiry:', error);
    }
  };

  const fetchFollowUps = async () => {
    try {
      const data = await invoke<FollowUp[]>('get_enquiry_follow_ups', { enquiryId: Number(id) });
      setFollowUps(data);

      const mappedEvents = data.map(fu => ({
        id: fu.id?.toString(),
        title: fu.notes.substring(0, 20) + (fu.notes.length > 20 ? '...' : ''),
        date: fu.follow_up_date,
        extendedProps: {
          fullNotes: fu.notes,
          status: fu.status,
        }
      }));
      setCalendarFollowUpEvents(mappedEvents);

    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      setFollowUps([]);
      setCalendarFollowUpEvents([]);
    }
  };

  const fetchNotes = async () => {
    try {
      const data = await invoke<Note[]>('get_enquiry_notes', { enquiryId: Number(id) });
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  useEffect(() => {
    fetchEnquiry();
    fetchFollowUps();
    fetchNotes();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await invoke('update_enquiry_status', {
        id: Number(id),
        status: newStatus,
      });
      setSuccessMessage('Status updated successfully!');
      setShowToast(true);
      setNewFollowUp({ notes: '', status: '', follow_up_date: '' });
      fetchEnquiry();
    } catch (error) {
      console.error('Error updating status:', error);
      setSuccessMessage('Failed to update status');
      setShowToast(true);
    }
  };

  const handleNoteStatusChange = async (noteId: number, isCompleted: boolean) => {
    try {
      await invoke('update_note_status', {
        noteId,
        isCompleted,
      });
      setSuccessMessage('Note status updated successfully!');
      setShowToast(true);
      fetchNotes();
    } catch (error) {
      console.error('Error updating note status:', error);
      setSuccessMessage('Failed to update note status');
      setShowToast(true);
    }
  };

  const handleAddFollowUp = async () => {
    if (!selectedCalendarDate || !newFollowUp.status || !newFollowUp.notes) {
      setSuccessMessage('Please select a date, status, and enter notes.');
      setShowToast(true);
      return;
    }

    const followUpDateString = formatDateFn(selectedCalendarDate, 'yyyy-MM-dd');
    const currentDate = new Date();
    const createdAtString = formatDateFn(currentDate, 'yyyy-MM-dd HH:mm:ss');

    try {
      await invoke('add_enquiry_follow_up', {
        followUp: {
          enquiry_id: Number(id),
          notes: newFollowUp.notes,
          status: newFollowUp.status,
          follow_up_date: followUpDateString,
          created_at: createdAtString
        }
      });
      setSuccessMessage('Follow-up added successfully!');
      setShowToast(true);
      setNewFollowUp({ notes: '', status: STATUS_OPTIONS[0]?.value || '', follow_up_date: '' });
      fetchFollowUps();
      fetchEnquiry();
      setCalendarModalOpen(false);
      setSelectedCalendarDate(null);
    } catch (error) {
      console.error('Error adding follow-up:', error);
      setSuccessMessage('Failed to add follow-up');
      setShowToast(true);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await invoke('add_enquiry_note', {
        enquiryId: Number(id),
        notes: newNote,
      });
      setSuccessMessage('Note added successfully!');
      setShowToast(true);
      setNewNote('');
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      setSuccessMessage('Failed to add note');
      setShowToast(true);
    }
  };

  const renderDayCellWithBadge = (dayCellInfo: any) => {
    const cellDate = dayCellInfo.date;
    const eventsOnThisDay = calendarFollowUpEvents.filter(event =>
      event.date && isSameDay(parseISO(event.date), cellDate)
    );

    let badgeColor: "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default" = "default";
    let showBadge = false;

    if (eventsOnThisDay.length > 0) {
      showBadge = true;
      // Determine badge color based on event stati
      if (eventsOnThisDay.some(e => e.extendedProps?.status?.toLowerCase() === 'in progress')) {
        badgeColor = 'warning';
      } else if (eventsOnThisDay.some(e => e.extendedProps?.status?.toLowerCase() === 'new' || e.extendedProps?.status?.toLowerCase() === 'scheduled')) {
        badgeColor = 'info';
      } else if (eventsOnThisDay.every(e => e.extendedProps?.status?.toLowerCase() === 'completed')) {
        badgeColor = 'success';
      } else if (eventsOnThisDay.some(e => e.extendedProps?.status?.toLowerCase() === 'cancelled')) {
        badgeColor = 'error';
      } else {
        badgeColor = 'primary';
      }
    }

    // Create tooltip content with enhanced styling
    const tooltipContent = eventsOnThisDay.length > 0 ? (
      <Box sx={{ p: 2, minWidth: 200 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary' }}>
          Follow-ups ({eventsOnThisDay.length})
        </Typography>
        <Stack spacing={1.5}>
          {eventsOnThisDay.map((event, index) => (
            <Box
              key={event.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.100' : 'grey.800',
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'light' ? 'grey.300' : 'grey.700',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: (theme) => theme.palette[event.extendedProps.status.toLowerCase() === 'in progress' ? 'warning' :
                      event.extendedProps.status.toLowerCase() === 'completed' ? 'success' :
                        event.extendedProps.status.toLowerCase() === 'cancelled' ? 'error' : 'info'].main,
                    mr: 1,
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary', textTransform: 'capitalize' }}>
                  {event.extendedProps.status}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                }}
              >
                {event.extendedProps.fullNotes}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    ) : null;

    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {showBadge ? (
          <Tooltip
            title={tooltipContent}
            arrow
            placement="top"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'background.paper',
                  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
                  borderRadius: 1,
                  p: 0,
                  maxWidth: 320,
                  '& .MuiTooltip-arrow': {
                    color: 'background.paper',
                  },
                },
              },
            }}
          >
            <Badge
              color={badgeColor}
              variant="dot"
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{
                '& .MuiBadge-badge': {
                  width: 8,
                  height: 8,
                  minWidth: 8,
                  right: -2,
                  top: 2,
                },
                cursor: 'pointer',
                '&:hover': {
                  '& .MuiBadge-badge': {
                    transform: 'scale(1.2)',
                  },
                },
              }}
            >
              <Typography
                sx={{
                  fontWeight: showBadge ? 500 : 400,
                  color: showBadge ? 'text.primary' : 'inherit',
                }}
              >
                {dayCellInfo.dayNumberText}
              </Typography>
            </Badge>
          </Tooltip>
        ) : (
          dayCellInfo.dayNumberText
        )}
      </Box>
    );
  };

  if (!enquiry) {
    return (
      <DashboardContent>
        <Typography>Loading...</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
            color="primary"
          >
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
          <Typography variant="h4">Enquiry Review</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Enquiry Details</Typography>
                  <StatusBadge status={enquiry.status} />
                </Box>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Student Name
                    </Typography>
                    <Typography variant="body1">
                      {enquiry.student_name}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Parent Name
                    </Typography>
                    <Typography variant="body1">
                      {enquiry.parent_name}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {enquiry.phone}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {enquiry.email || '-'}
                    </Typography>
                  </Box>
                </Stack>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Source
                  </Typography>
                  <Typography variant="body1">
                    {enquiry.source}
                  </Typography>
                </Box>
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Add Follow-up</Typography>
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                weekends
                dateClick={(arg) => {
                  setSelectedCalendarDate(arg.date);
                  setNewFollowUp({
                    notes: '',
                    status: STATUS_OPTIONS[0]?.value || '',
                    follow_up_date: arg.dateStr
                  });
                  setCalendarModalOpen(true);
                }}
                events={calendarFollowUpEvents}
                dayCellContent={renderDayCellWithBadge}
                headerToolbar={{
                  left: 'prev,next',
                  center: 'title',
                  right: 'today'
                }}
                height="auto"
                contentHeight="auto"
                aspectRatio={1.2}
              />
            </Card>
          </Box>

          <Card sx={{ p: 3, flex: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Notes</Typography>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Add New Note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                Add Note
              </Button>
            </Box>

            {notes.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No notes available
              </Typography>
            ) : (
              <Stack spacing={2}>
                {notes.map((note, index) => (
                  <Box
                    key={note.id}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: NOTE_COLORS[index % NOTE_COLORS.length].bg,
                      borderLeft: `4px solid ${NOTE_COLORS[index % NOTE_COLORS.length].border}`,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {note.notes}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        display: 'block',
                        mt: 1,
                        fontSize: '0.8rem',
                      }}
                    >
                      {new Date(note.created_at!).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        </Box>

        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Follow-up History</Typography>
          <Stack spacing={2}>
            {followUps.map((followUp) => (
              <Paper
                key={followUp.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.neutral',
                  '&:hover': {
                    bgcolor: 'background.paper',
                    boxShadow: (theme) => theme.shadows[4],
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Iconify icon="solar:pen-bold" width={18} />
                        <Typography variant="body2" color="text.secondary">
                          Created: {new Date(followUp.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {followUp.follow_up_date && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Iconify icon="solar:eye-bold" width={18} />
                          <Typography variant="body2" color="text.primary" fontWeight="medium">
                            Follow-up: {new Date(followUp.follow_up_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                    <StatusBadge status={followUp.status} />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{followUp.notes}</Typography>
                </Stack>
              </Paper>
            ))}
            {followUps.length === 0 && (
              <Box
                sx={{
                  py: 5,
                  textAlign: 'center',
                  bgcolor: 'background.neutral',
                  borderRadius: 2
                }}
              >
                <Typography color="text.secondary">
                  No follow-ups yet
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>
      </Stack>

      <Modal
        open={calendarModalOpen}
        onClose={() => {
          setCalendarModalOpen(false);
          setSelectedCalendarDate(null);
        }}
        aria-labelledby="add-follow-up-calendar-modal-title"
      >
        <Box sx={theme => ({
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[24],
          p: { xs: 2, sm: 3, md: 4 },
        })}>
          <Typography id="add-follow-up-calendar-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
            Add Follow-up Details
          </Typography>
          {selectedCalendarDate && (
            <Typography sx={{ mt: 1, mb: 2, color: 'text.secondary' }}>
              Date: {formatDateFn(selectedCalendarDate, 'MMMM dd, yyyy')}
            </Typography>
          )}
          <Stack spacing={2}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.8rem' }}>Status</FormLabel>
              <RadioGroup
                row
                aria-label="status"
                name="status-radio-buttons-group"
                value={newFollowUp.status}
                onChange={(e) => setNewFollowUp(prev => ({ ...prev, status: e.target.value }))}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={
                      <Radio
                        size="small"
                        sx={{
                          color: (theme: Theme) => theme.palette[option.color].main,
                          '&.Mui-checked': {
                            color: (theme: Theme) => theme.palette[option.color].main,
                          },
                          '& .MuiSvgIcon-root': {
                            fontSize: '1.2rem',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.9rem',
                          color: (theme: Theme) => newFollowUp.status === option.value ?
                            theme.palette[option.color].main :
                            'text.primary',
                          fontWeight: newFollowUp.status === option.value ? 600 : 400,
                        }}
                      >
                        {option.label}
                      </Typography>
                    }
                    sx={{
                      margin: 0,
                      backgroundColor: (theme: Theme) => newFollowUp.status === option.value ?
                        theme.palette[option.color].lighter :
                        'transparent',
                      padding: '4px 8px',
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: (theme: Theme) => theme.palette[option.color].lighter,
                      },
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            <TextField
              label="Follow-up Notes"
              multiline
              rows={4}
              value={newFollowUp.notes}
              onChange={(e) => setNewFollowUp(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
              placeholder="Enter detailed notes..."
            />
            <Button variant="contained" onClick={handleAddFollowUp}>
              Save Follow-up
            </Button>
            <Button variant="outlined" onClick={() => setCalendarModalOpen(false)}>
              Cancel
            </Button>
          </Stack>
        </Box>
      </Modal>

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
    </DashboardContent>
  );
} 