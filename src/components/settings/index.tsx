import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

interface VersionInfo {
    version: string;
    installDate: string;
    hasUpdate: boolean;
}

export function Settings() {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const appVersion = await getVersion();
                const installDate = localStorage.getItem('app_install_date') || new Date().toISOString();
                if (!localStorage.getItem('app_install_date')) {
                    localStorage.setItem('app_install_date', installDate);
                }

                setVersionInfo({
                    version: appVersion,
                    installDate: installDate,
                    hasUpdate: false
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
                    <Iconify icon="solar:settings-bold-duotone" width={24} />
                </IconButton>
            </Box>

            <Popover
                id="settings-popover"
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
                            width: 240,
                            p: 2,
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
                        Settings
                    </Typography>

                    {/* Add your settings options here */}
                    <Stack spacing={1.5}>
                        <Box
                            sx={{
                                cursor: 'pointer',
                                '&:hover': { color: 'primary.main' },
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <Iconify icon="solar:pen-bold" width={20} />
                            <Typography variant="body2">General Settings</Typography>
                        </Box>

                        <Box
                            sx={{
                                cursor: 'pointer',
                                '&:hover': { color: 'primary.main' },
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <Iconify icon="solar:shield-keyhole-bold-duotone" width={20} />
                            <Typography variant="body2">Security</Typography>
                        </Box>
                    </Stack>

                    <Divider />

                    {/* Version Information */}
                    {versionInfo && (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Version Information
                            </Typography>
                            <Stack spacing={1} sx={{ pl: 1 }}>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Iconify icon="solar:eye-bold" width={14} />
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
                                                fontSize: '0.65rem',
                                            }}
                                        >
                                            Update
                                        </Box>
                                    )}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Installed: {new Date(versionInfo.installDate).toLocaleDateString()}
                                </Typography>
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </Popover>
        </>
    );
} 