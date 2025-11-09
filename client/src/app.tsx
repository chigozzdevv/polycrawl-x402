import { useState, useEffect } from 'react';
import { LandingPage } from '@/pages/landing';
import { AuthPage } from '@/pages/auth';
import { Dashboard } from '@/pages/dashboard';
import { AuthProvider, useAuth } from '@/context/auth-context';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;

    const handleHashChange = () => {
      if (window.location.hash === '#auth') {
        setShowAuth(true);
      } else if (window.location.hash === '#home') {
        setShowAuth(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="text-parchment">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (window.location.hash === '#auth') {
      window.location.hash = '';
    }
    return <Dashboard />;
  }

  if (showAuth) {
    return <AuthPage />;
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
