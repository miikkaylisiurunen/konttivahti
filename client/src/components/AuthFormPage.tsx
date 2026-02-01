import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { toast } from 'sonner';
import logo from '../assets/logo.svg';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';

type AuthFormPageProps = {
  description: string;
  passwordAutoComplete: React.HTMLInputAutoCompleteAttribute;
  label: string;
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (credentials: { username: string; password: string }) => Promise<void>;
};

export function AuthFormPage({
  description,
  passwordAutoComplete,
  label,
  isSubmitting,
  errorMessage,
  onSubmit,
}: AuthFormPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    if (isSubmitting || !username || !password) {
      return;
    }

    try {
      await onSubmit({ username, password });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="" className="mx-auto mb-2 h-16 w-auto" />
          <h1 className="text-2xl font-bold">Konttivahti</h1>
          <p className="text-sm text-foreground-muted">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
          <Input
            name="username"
            label="Username"
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            name="password"
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={passwordAutoComplete}
          />

          <Button
            type="submit"
            disabled={isSubmitting || !username || !password}
            className="w-full"
            icon={isSubmitting ? <Loader2 className="size-4 animate-spin" /> : undefined}
            label={label}
          />
        </form>
      </Card>
    </div>
  );
}
