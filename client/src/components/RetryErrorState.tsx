import { TriangleAlert } from 'lucide-react';
import { Button } from './Button';

interface RetryErrorStateProps {
  message: string;
  onRetry: () => void | Promise<void>;
}

export function RetryErrorState({ message, onRetry }: RetryErrorStateProps) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center space-y-4 text-red-400">
        <TriangleAlert className="size-8" aria-hidden="true" />
        <span>{message}</span>
        <Button label="Retry" onClick={() => void onRetry()} variant="secondary" />
      </div>
    </div>
  );
}
