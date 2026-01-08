import type { ReactNode } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { useContainers } from './hooks/useContainers';
import { Card } from './components/Card';

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-0 text-foreground">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <Card>{children}</Card>
      </div>
    </div>
  );
}

export function App() {
  const { containers, isLoading, hasLoadedOnce, error } = useContainers();

  if (isLoading && !hasLoadedOnce) {
    return (
      <AppLayout>
        <LoadingScreen text="Loading containers..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="text-red-500">Error: {error}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-2">
        {containers.map((container) => (
          <div key={container.name} className="p-4">
            <div className="font-medium">{container.name}</div>
            <span className="text-sm">{container.status}</span>
            <div className="text-sm text-gray-500">{container.image}</div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
