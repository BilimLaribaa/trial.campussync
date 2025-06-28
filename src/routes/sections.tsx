import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

import { RequireAuth } from 'src/components/auth/RequireAuth'; // adjust path as needed

// ----------------------------------------------------------------------

export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const StudentPage = lazy(() => import('src/pages/students'));
export const AddStudentView = lazy(() => import('src/sections/student/add-student-container'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const EnquiryPage = lazy(() => import('src/pages/enquiry'));
export const EnquiryReviewPage = lazy(() => import('src/pages/enquiry-review'));
export const BlogPage = lazy(() => import('src/pages/blog'));
// export const UserPage = lazy(() => import('src/pages/user'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const ClassPage = lazy(() => import('src/pages/class'));
export const StaffPage = lazy(() => import('src/pages/staff'));
export const AddStaffView = lazy(() => import('src/sections/staff/add-staff-container'));
export const FullCalendarViewPage = lazy(() => import('src/pages/full-calendar-view'));

// This is a small edit to trigger re-evaluation
const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export const routesSection: RouteObject[] = [
  {
    index: true,
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: 'dashboard',
    element: (
      // <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={renderFallback()}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      // </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'students', element: <StudentPage /> },
      { path: 'student/add', element: <AddStudentView /> },
      { path: 'student/add/:id', element: <AddStudentView /> },
      // { path: 'user', element: <UserPage /> },
      { path: 'enquiry', element: <EnquiryPage /> },
      { path: 'enquiry/:id', element: <EnquiryReviewPage /> },
      { path: 'class', element: <ClassPage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'staff/add', element: <AddStaffView /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'calendar', element: <FullCalendarViewPage /> },
    ],
  },
  {
    path: '404',
    element: <Page404 />,
  },
  {
    path: '*',
    element: <Page404 />,
  },
];

