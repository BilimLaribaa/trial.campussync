import { format } from 'date-fns';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import React, { useState, useEffect } from 'react';
import interactionPlugin from '@fullcalendar/interaction'; // for dateClick

import { Box, Modal, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Stack } from '@mui/material';

// Basic styling for the modal (can be expanded)
const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

// Dummy status options - replace with your actual status options if different
const STATUS_OPTIONS = [
    { value: 'new', label: 'New' },
    { value: 'in progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'scheduled', label: 'Scheduled' },
];

// Define the type for the follow-up data
interface FollowUpData {
    title?: string; // FullCalendar event title (optional, could be derived from notes)
    date: string; // Date string in 'yyyy-MM-dd' format
    status: string;
    notes: string;
}

export function FullCalendarView() {
    const [events, setEvents] = useState<FollowUpData[]>([]); // To store follow-ups as calendar events
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [newFollowUp, setNewFollowUp] = useState({
        status: STATUS_OPTIONS[0]?.value || '', // Default to first status
        notes: '',
    });

    // Function to fetch existing follow-ups (placeholder)
    // You'll need to implement this to load follow-ups from your backend
    // and map them to the FullCalendar event structure.
    const fetchFollowUps = async () => {
        // Example:
        // const dataFromApi = await invoke('get_all_follow_ups');
        // const mappedEvents = dataFromApi.map(fu => ({
        //   title: fu.notes.substring(0, 20) + '...', // Or some other title logic
        //   date: fu.follow_up_date, // Assuming follow_up_date is in 'yyyy-MM-dd'
        //   // You can add other properties here to store original follow-up data
        //   extendedProps: {
        //     id: fu.id,
        //     fullNotes: fu.notes,
        //     status: fu.status,
        //   }
        // }));
        // setEvents(mappedEvents);
      
    };

    useEffect(() => {
        fetchFollowUps();
    }, []);

    const handleDateClick = (arg: { date: Date; dateStr: string }) => {
        setSelectedDate(arg.date);
        setNewFollowUp({ status: STATUS_OPTIONS[0]?.value || '', notes: '' }); // Reset form
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedDate(null);
    };

    const handleFollowUpChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
        const { name, value } = e.target;
        if (name === 'status-select') { // Special handling for MUI Select
            setNewFollowUp((prev) => ({ ...prev, status: value as string }));
        } else {
            setNewFollowUp((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveFollowUp = async () => {
        if (!selectedDate || !newFollowUp.status || !newFollowUp.notes) {
            alert('Please fill in all fields.'); // Simple validation
            return;
        }

        const followUpToSave: FollowUpData = {
            date: format(selectedDate, 'yyyy-MM-dd'),
            status: newFollowUp.status,
            notes: newFollowUp.notes,
            title: newFollowUp.notes.substring(0, 30) + '...' // Simple title for the event
        };

        // TODO: Implement actual saving logic here (e.g., call invoke to your backend)
        // For example:
        // try {
        //   await invoke('add_general_follow_up', { ...followUpToSave });
        //   setEvents(prevEvents => [...prevEvents, followUpToSave]); // Add to local events for immediate display
        //   alert('Follow-up saved!');
        // } catch (error) {
        //   console.error("Failed to save follow-up:", error);
        //   alert('Failed to save follow-up.');
        // }

        // Optimistically update UI or refetch after save
        setEvents(prevEvents => [...prevEvents, followUpToSave]);

        handleModalClose();
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Monthly Follow-up Calendar
            </Typography>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                weekends
                dateClick={handleDateClick} // Triggered when a date is clicked
                events={events} // Display saved follow-ups
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek,dayGridDay' // Optional: add more views
                }}
                height="auto" // Adjusts height to content; or set a fixed vh
                contentHeight="auto"
                aspectRatio={1.5} // Adjust for better proportions
                selectable // Allows users to select dates/times (optional for now)
            // eventContent={renderEventContent} // Custom event rendering (for dots/badges)
            />

            <Modal
                open={modalOpen}
                onClose={handleModalClose}
                aria-labelledby="add-follow-up-modal-title"
                aria-describedby="add-follow-up-modal-description"
            >
                <Box sx={modalStyle}>
                    <Typography id="add-follow-up-modal-title" variant="h6" component="h2">
                        Add Follow-up
                    </Typography>
                    {selectedDate && (
                        <Typography sx={{ mt: 1, mb: 2, color: 'text.secondary' }}>
                            Date: {format(selectedDate, 'MMMM dd, yyyy')}
                        </Typography>
                    )}
                    <Stack spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel id="status-select-label">Status</InputLabel>
                            <Select
                                labelId="status-select-label"
                                id="status-select"
                                name="status-select" // Name for MUI Select
                                value={newFollowUp.status}
                                label="Status"
                                onChange={handleFollowUpChange}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Follow-up Notes"
                            name="notes"
                            multiline
                            rows={4}
                            value={newFollowUp.notes}
                            onChange={handleFollowUpChange}
                            fullWidth
                        />
                        <Button variant="contained" onClick={handleSaveFollowUp}>
                            Save Follow-up
                        </Button>
                        <Button variant="outlined" onClick={handleModalClose}>
                            Cancel
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </Box>
    );
}

// Optional: Custom event rendering function (for badges/dots)
// function renderEventContent(eventInfo: any) {
//   return (
//     <>
//       <b>{eventInfo.timeText}</b>
//       <i>{eventInfo.event.title}</i>
//       {/* Add a dot or badge here based on event.extendedProps or similar */}
//       <span style={{
//         display: 'inline-block',
//         width: '8px',
//         height: '8px',
//         backgroundColor: 'red', // Example color
//         borderRadius: '50%',
//         marginLeft: '5px'
//       }}></span>
//     </>
//   )
// }

export default FullCalendarView; 