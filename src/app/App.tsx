import React from 'react';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { NewLandingPage } from '../components/NewLandingPage';
import { AdminDashboard } from '../components/AdminDashboard';
import { UserDashboard } from '../components/UserDashboard';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NewLandingPage />;
  }

  const isAdmin = user?.role === 'ADMIN';

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
