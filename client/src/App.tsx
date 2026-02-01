import { Login } from './pages/Login';
import { LoadingScreen } from './components/LoadingScreen';
import { useAuth } from './hooks/useAuth';
import { Navigate, Outlet, Route, Routes } from 'react-router';
import { AppHeader } from './components/AppHeader';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Setup } from './pages/Setup';
import { RetryErrorState } from './components/RetryErrorState';

interface AppLayoutProps {
  onLogout: () => void;
}

function AppLayout({ onLogout }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-0 text-foreground">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <AppHeader onLogout={onLogout} />
        <Outlet />
      </div>
    </div>
  );
}

export function App() {
  const { isInitialized, isAuthenticated, logout, isCheckingAuth, authCheckError, checkAuth } =
    useAuth();

  if (isCheckingAuth) {
    return <LoadingScreen text="Loading..." />;
  }

  if (authCheckError) {
    return (
      <div className="bg-surface-0 px-4 py-10 text-foreground">
        <RetryErrorState message={authCheckError} onRetry={checkAuth} />
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/setup" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AppLayout onLogout={logout} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
