// Route glue: every page of the app. Private pages are wrapped in RequireAuth and the app shell; sign-in pages in GuestOnly.
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Heading, Stack, Text } from '@chakra-ui/react';
import { RequireAuth, GuestOnly } from '../components/RouteGuards';
import { AppLayout, PublicLayout } from '../components/Layout';
import { PrimaryButton } from '../components/ui';
import Landing from '../pages/Landing';
import { LoginPage, RegisterPage } from '../pages/Auth';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/Recovery';
import Dashboard from '../pages/Dashboard';
import ResumePage from '../pages/Resume';
import RolesPage from '../pages/Roles';
import InterviewSetup from '../pages/InterviewSetup';
import InterviewRoom from '../pages/InterviewRoom';
import { InterviewComplete, ReportPage, HistoryPage } from '../pages/InterviewResults';
import { ProfilePage, SettingsPage, ChangePasswordPage } from '../pages/Account';

const priv = (el: React.ReactNode) => <RequireAuth><AppLayout>{el}</AppLayout></RequireAuth>;
const pub = (el: React.ReactNode) => <PublicLayout>{el}</PublicLayout>;
const guest = (el: React.ReactNode) => <GuestOnly>{pub(el)}</GuestOnly>;

function NotFound() {
  return (
    <Container maxW="560px" py={24} textAlign="center">
      <Stack spacing={4} align="center">
        <Text fontSize="sm" color="brand.300" fontWeight="semibold">404</Text>
        <Heading as="h1" size="xl" fontWeight="semibold">This page does not exist</Heading>
        <Text color="var(--pp-muted)">The link may be old, or the page may have moved.</Text>
        <PrimaryButton as={RouterLink} to="/dashboard">Go to dashboard</PrimaryButton>
      </Stack>
    </Container>
  );
}

export const router = [
  { id: 'landing', path: '/', element: pub(<Landing />) },
  { id: 'login', path: '/login', element: guest(<LoginPage />) },
  { id: 'forgot-password', path: '/forgot-password', element: guest(<ForgotPasswordPage />) },
  { id: 'reset-password', path: '/reset-password', element: guest(<ResetPasswordPage />) },
  { id: 'register', path: '/register', element: guest(<RegisterPage />) },
  { id: 'dashboard', path: '/dashboard', element: priv(<Dashboard />) },
  { id: 'resume', path: '/resume', element: priv(<ResumePage />) },
  { id: 'roles', path: '/roles', element: priv(<RolesPage />) },
  { id: 'interview-setup', path: '/interview', element: priv(<InterviewSetup />) },
  { id: 'interview-room', path: '/interview/room/:sessionId', element: priv(<InterviewRoom />) },
  { id: 'interview-complete', path: '/interview/complete/:sessionId', element: priv(<InterviewComplete />) },
  { id: 'interview-report', path: '/interview/report/:sessionId', element: priv(<ReportPage />) },
  { id: 'interview-history', path: '/interview/history', element: priv(<HistoryPage />) },
  { id: 'profile', path: '/profile', element: priv(<ProfilePage />) },
  { id: 'settings', path: '/settings', element: priv(<SettingsPage />) },
  { id: 'settings-password', path: '/settings/password', element: priv(<ChangePasswordPage />) },
  { id: 'not-found', path: '*', element: pub(<NotFound />) },
];
