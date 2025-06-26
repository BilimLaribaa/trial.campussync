import type { CardProps } from '@mui/material/Card';
import type { PaletteColorKey } from 'src/theme/core';
import type { ChartOptions } from 'src/components/chart';

import { useEffect, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { appDataDir, join, resolveResource } from '@tauri-apps/api/path';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Typography } from '@mui/material';
import { useTheme, SxProps, Theme } from '@mui/material/styles';

import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

import Config from "../../../config";



// ----------------------------------------------------------------------

// Frontend type matching the Rust School struct
interface School {
  id?: number;
  school_name: string;
  school_email: string;
  school_address: string;
  school_number: string;
  school_category: string;
  school_medium: string;
  school_board: string;
  address: string;
  created_at?: string;
  school_image?: string;
}

type Props = CardProps & {
  title: string;
  total: number;
  percent: number;
  color?: PaletteColorKey;
  icon: React.ReactNode;
  chart: {
    series: number[];
    categories: string[];
    options?: ChartOptions;
  };
};

type SchoolBannerProps = {
  sx?: SxProps<Theme>;
  title: string;
  sub_title?: string;
  color?: PaletteColorKey; // like 'primary', 'secondary', etc.
  logo?: string;
};

export function AnalyticsWidgetSummary({
  sx,
  icon,
  title,
  total,
  chart,
  percent,
  color = 'primary',
  ...other
}: Props) {
  const theme = useTheme();

  const chartColors = [theme.palette[color].dark];



  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    xaxis: { categories: chart.categories },
    grid: {
      padding: {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
      },
    },
    tooltip: {
      y: { formatter: (value: number) => fNumber(value), title: { formatter: () => '' } },
    },
    markers: {
      strokeWidth: 0,
    },
    ...chart.options,
  });

  const renderTrending = () => (
    <Box
      sx={{
        top: 16,
        gap: 0.5,
        right: 16,
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
      }}
    >
      <Iconify width={20} icon={percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'} />
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {percent > 0 && '+'}
        {fPercent(percent)}
      </Box>
    </Box>
  );

  return (
    <Card
      sx={[
        () => ({
          p: 3,
          boxShadow: 'none',
          position: 'relative',
          color: `${color}.darker`,
          backgroundColor: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ width: 48, height: 48 }}>{icon}</Box>

      {renderTrending()}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          flexGrow: 1,
          pt: 2,
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, width: '100%' }}>
          <Typography variant="h3" sx={{ fontSize: '3.5rem', fontWeight: 600 }}>
            {fShortenNumber(total)}
          </Typography>
        </Box>
      </Box>

      <SvgColor
        src="/assets/background/shape-square.svg"
        sx={{
          top: 0,
          left: -20,
          width: 240,
          zIndex: -1,
          height: 240,
          opacity: 0.24,
          position: 'absolute',
          color: `${color}.main`,
        }}
      />
    </Card>
  );
}


export function SchoolBanner({
  sx,
  color = 'primary',
  logo = 'https://placehold.co/200x200',
  school,
  ...other
}: Omit<SchoolBannerProps, 'title' | 'sub_title'> & { logo?: string; school: School | null }) {
  const theme = useTheme();
  const [imageUrl, setImageUrl] = useState('/assets/LOGO_SCHOOL.jpg'); // default fallback image

  useEffect(() => {
    if (school?.school_image) {
      const imagePath = `${Config.backend}/public/schools/${school.school_image}`;
      setImageUrl(imagePath);
    } else {
      setImageUrl('/assets/LOGO_SCHOOL.jpg');
    }
  }, [school]);

  const handleImageError = () => {
    setImageUrl('/assets/LOGO_SCHOOL.jpg');
  };

  if (!school) return null;

  return (
    <Card
      sx={[
        () => ({
          p: 3,
          boxShadow: 'none',
          position: 'relative',
          color: `${color}.darker`,
          backgroundColor: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 2,
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={school.school_name}
          onError={handleImageError}
          sx={{
            width: 128,
            height: 128,
            objectFit: 'contain',
          }}
        />
        <Box sx={{ flexGrow: 1, minWidth: 112 }}>
          <Box sx={{ typography: 'h1' }}>{school.school_name}</Box>
          <Box sx={{ typography: 'h4' }}>
            {school.school_medium} {school.school_board}, {school.address}
          </Box>
        </Box>
      </Box>

      <SvgColor
  src="/assets/background/shape-circle.svg"
  sx={{
    top: 0,
    left: -20,
    width: 240,
    height: 240,
    zIndex: -1,
    opacity: 0.24,
    position: 'absolute',
    color: `${color}.main`,
    borderRadius: '50%', // ensure round shape applies
  }}
/>
    </Card>
  );
}
