import { useAuth } from '../hooks/useAuth';
import { AuthFormPage } from '../components/AuthFormPage';

export function Login() {
  const { login, isLoggingIn } = useAuth();

  return (
    <AuthFormPage
      description="Sign in to view container status"
      passwordAutoComplete="current-password"
      label="Sign In"
      isSubmitting={isLoggingIn}
      errorMessage="Login failed"
      onSubmit={login}
    />
  );
}
