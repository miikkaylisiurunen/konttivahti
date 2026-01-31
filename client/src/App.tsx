import { Login } from './pages/Login';
import { LoadingScreen } from './components/LoadingScreen';
import { useAuth } from './hooks/useAuth';
import { Navigate, Outlet, Route, Routes } from 'react-router';
import { HomePage } from './pages/HomePage';
import { Setup } from './pages/Setup';
import { RetryErrorState } from './components/RetryErrorState';

function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-0 text-foreground">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <Outlet />
      </div>
    </div>
  );
}

export function App() {
  const { isInitialized, isAuthenticated, isCheckingAuth, authCheckError, checkAuth } = useAuth();

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
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
