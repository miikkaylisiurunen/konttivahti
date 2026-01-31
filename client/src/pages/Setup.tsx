import { useAuth } from '../hooks/useAuth';
import { AuthFormPage } from '../components/AuthFormPage';

export function Setup() {
  const { setup, isSettingUp } = useAuth();

  return (
    <AuthFormPage
      description="Create admin account"
      passwordAutoComplete="new-password"
      label="Create account"
      isSubmitting={isSettingUp}
      errorMessage="Setup failed"
      onSubmit={setup}
    />
  );
}
