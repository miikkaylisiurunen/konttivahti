import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  text?: string;
}

export function LoadingScreen({ text = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-surface-0 text-foreground">
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-foreground-strong" aria-hidden="true" />
          <span className="text-sm text-foreground-muted">{text}</span>
        </div>
      </div>
    </div>
  );
}
