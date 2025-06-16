import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

interface VersionInfo {
    version: string;
    installDate: string;
    hasUpdate: boolean;
}

export function Version() {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const appVersion = await getVersion();
                // In a real app, you would fetch these from your backend
                const installDate = localStorage.getItem('app_install_date') || new Date().toISOString();
                if (!localStorage.getItem('app_install_date')) {
                    localStorage.setItem('app_install_date', installDate);
                }

                setVersionInfo({
                    version: appVersion,
                    installDate: installDate,
                    hasUpdate: false // This would come from your update check logic
                });
            } catch (error) {
                console.error('Error fetching version:', error);
            }
        };

        fetchVersion();
    }, []);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    if (!versionInfo) return null;

    return (
        <>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: 16,
                    zIndex: 9999,
                }}
            >
                <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{
                        bgcolor: 'background.default',
                        boxShadow: (theme) => theme.shadows[2],
                        width: 40,
                        height: 40,
                        '&:hover': {
                            bgcolor: 'background.neutral',
                            boxShadow: (theme) => theme.shadows[8],
                        },
                    }}
                >
                    <Iconify icon="solar:eye-bold" width={24} />
                </IconButton>
            </Box>

            <Popover
                id="version-popover"
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            width: 280,
                            p: 3,
                            mt: -3,
                        },
                    },
                }}
                sx={{
                    zIndex: 9999,
                }}
            >
                <Stack spacing={2}>
                    <Typography variant="h6">
                        Application Info
                    </Typography>

                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Version
                            </Typography>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                v{versionInfo.version}
                                {versionInfo.hasUpdate && (
                                    <Box
                                        component="span"
                                        sx={{
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1,
                                            bgcolor: 'warning.lighter',
                                            color: 'warning.main',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        Update Available
                                    </Box>
                                )}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Installed On
                            </Typography>
                            <Typography variant="body2">
                                {new Date(versionInfo.installDate).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Typography>
                        </Box>

                        {versionInfo.hasUpdate && (
                            <Box
                                sx={{
                                    pt: 1,
                                    borderTop: '1px dashed',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'primary.main',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                    }}
                                >
                                    <Iconify icon="mingcute:add-line" width={16} />
                                    Update Now
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Stack>
            </Popover>
        </>
    );
} 