import React from 'react';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { NewLandingPage } from '../components/NewLandingPage';
import { AdminDashboard } from '../components/AdminDashboard';
import { UserDashboard } from '../components/UserDashboard';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <NewLandingPage />;
  }

  const isAdmin = user?.role === 'admin';

  return (
    <>
      {isAdmin ? <AdminDashboard /> : <UserDashboard />}
      <Toaster position="top-right" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
