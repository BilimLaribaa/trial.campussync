import type { CSSObject, Breakpoint } from '@mui/material/styles';

import { merge } from 'es-toolkit';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { Settings } from 'src/components/settings';

import { AuthContent } from './content';
import { MainSection } from '../core/main-section';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';

import type { AuthContentProps } from './content';
import type { MainSectionProps } from '../core/main-section';
import type { HeaderSectionProps } from '../core/header-section';
import type { LayoutSectionProps } from '../core/layout-section';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type AuthLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    main?: MainSectionProps;
    content?: AuthContentProps;
  };
};

export function AuthLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'md',
}: AuthLayoutProps) {
  const theme = useTheme();

  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: { maxWidth: false },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: <></>,
      rightArea: <></>,
    };

    const headerSx = slotProps?.header?.sx;

    return (
      <HeaderSection
        disableElevation
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={[
          { position: { [layoutQuery]: 'fixed' } },
          ...(Array.isArray(headerSx) ? headerSx : headerSx ? [headerSx] : []),
        ]}
      />
    );
  };

  const renderFooter = () => null;

  const renderMain = () => {
    const mainSx = slotProps?.main?.sx;
    const contentSx = slotProps?.content?.sx;

    return (
      <MainSection
        {...slotProps?.main}
        sx={[
          (muiTheme) => ({ // Renamed to avoid shadowing the outer theme variable
            display: 'flex',
            flexDirection: 'row',
            height: '100vh',
            overflow: 'hidden',
            [muiTheme.breakpoints.down(layoutQuery)]: {
              flexDirection: 'column',
            },
          }),
          ...(Array.isArray(mainSx) ? mainSx : mainSx ? [mainSx] : []),
        ]}
      >
        {/* Left Column without background image */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            backgroundColor: 'transparent',
            height: '100%',
          }}
        >
          {/* CampusSync Logo */}
          <Box
            component="img"
            src="https://campussync.in/img/logo.png"
            alt="CampusSync Logo"
            sx={{
              position: 'absolute',
              top: 24,
              left: 24,
              height: 120,
              width: 'auto',
              zIndex: 2,
            }}
          />
        </Box>

        {/* Right Form Column */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            px: 3,
          }}
        >
          <AuthContent
            {...slotProps?.content}
            sx={[
              {
                width: '100%',
                maxWidth: 480,
                height: 'auto',
                boxShadow: 3,
              },
              ...(Array.isArray(contentSx)
                ? contentSx
                : contentSx
                  ? [contentSx]
                  : []),
            ]}
          >
            {children}
          </AuthContent>
        </Box>
      </MainSection>
    );
  };

  return (
    <>
      <LayoutSection
        headerSection={renderHeader()}
        footerSection={renderFooter()}
        cssVars={{ '--layout-auth-content-width': '420px', ...cssVars }}
        sx={[
          {
            position: 'relative',
            minHeight: '100vh',
            backgroundImage: 'url(/assets/background_img.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        {renderMain()}
      </LayoutSection>
      <Box
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: theme.zIndex.speedDial,
        }}
      >
        <Settings />
      </Box>
    </>
  );
}