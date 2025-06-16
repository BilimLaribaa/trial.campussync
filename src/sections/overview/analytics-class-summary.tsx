import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';

import { fNumber } from 'src/utils/format-number';

type Class = {
    id?: number;
    class_name: string;
    academic_year: string;
    status?: string;
    created_at?: string;
};

type ClassSummary = {
    total: number;
    active: number;
    inactive: number;
};

export function AnalyticsClassSummary() {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<ClassSummary>({
        total: 0,
        active: 0,
        inactive: 0,
    });

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const classes = await invoke<Class[]>('get_all_classes');

                const summaryData = classes.reduce(
                    (acc, cls) => ({
                        total: acc.total + 1,
                        active: acc.active + (cls.status === 'active' ? 1 : 0),
                        inactive: acc.inactive + (cls.status !== 'active' ? 1 : 0),
                    }),
                    { total: 0, active: 0, inactive: 0 }
                );

                setSummary(summaryData);
            } catch (error) {
                console.error('Error fetching classes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    if (loading) {
        return (
            <Card sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader title="Class Status" />
            <Stack
                direction="row"
                divider={<Box sx={{ borderRight: 1, borderColor: 'divider' }} />}
                sx={{ py: 2 }}
            >
                <Stack
                    spacing={1}
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ width: 1, p: 2 }}
                >
                    <Box sx={{ position: 'relative' }}>
                        <CircularProgress
                            variant="determinate"
                            value={100}
                            size={56}
                            thickness={4}
                            sx={{ color: theme.palette.divider }}
                        />
                        <CircularProgress
                            variant="determinate"
                            value={(summary.active / summary.total) * 100}
                            size={56}
                            thickness={4}
                            sx={{
                                top: 0,
                                left: 0,
                                opacity: 0.98,
                                position: 'absolute',
                                color: theme.palette.primary.main,
                            }}
                        />
                    </Box>
                    <Stack spacing={0.5}>
                        <Typography variant="h6">{fNumber(summary.active)}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            Active Classes
                        </Typography>
                    </Stack>
                </Stack>

                <Stack
                    spacing={1}
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ width: 1, p: 2 }}
                >
                    <Box sx={{ position: 'relative' }}>
                        <CircularProgress
                            variant="determinate"
                            value={100}
                            size={56}
                            thickness={4}
                            sx={{ color: theme.palette.divider }}
                        />
                        <CircularProgress
                            variant="determinate"
                            value={(summary.inactive / summary.total) * 100}
                            size={56}
                            thickness={4}
                            sx={{
                                top: 0,
                                left: 0,
                                opacity: 0.98,
                                position: 'absolute',
                                color: theme.palette.error.main,
                            }}
                        />
                    </Box>
                    <Stack spacing={0.5}>
                        <Typography variant="h6">{fNumber(summary.inactive)}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            Inactive Classes
                        </Typography>
                    </Stack>
                </Stack>
            </Stack>
        </Card>
    );
} 