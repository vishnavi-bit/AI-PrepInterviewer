// Route guards. Private pages send signed-out visitors to /login; the sign-in pages send signed-in users to the dashboard.
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Center, Spinner } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

function Booting() {
  return (
    <Center minH="100vh" bg="transparent">
      <Spinner color="brand.400" thickness="3px" size="lg" aria-label="Loading your account" />
    </Center>
  );
}

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Booting />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children ?? <Outlet />}</>;
}

export function GuestOnly({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Booting />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children ?? <Outlet />}</>;
}
