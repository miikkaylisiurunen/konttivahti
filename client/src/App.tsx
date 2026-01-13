import type { ReactNode } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { useContainers } from './hooks/useContainers';
import { ContainersTable } from './components/ContainersTable';

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-0 text-foreground">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">{children}</div>
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
      <ContainersTable containers={containers} />
    </AppLayout>
  );
}
