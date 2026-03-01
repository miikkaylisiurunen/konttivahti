import { ContainersTable } from '../components/ContainersTable';
import { LoadingScreen } from '../components/LoadingScreen';
import { SummaryCards } from '../components/SummaryCards';
import { useContainers } from '../hooks/useContainers';
import { RetryErrorState } from '../components/RetryErrorState';

export function HomePage() {
  const {
    containers,
    isLoading: containersLoading,
    hasLoadedOnce,
    error: containersError,
    refetch,
  } = useContainers();

  if (containersLoading && !hasLoadedOnce) {
    return <LoadingScreen text="Loading containers..." />;
  }

  if (containersError) {
    return <RetryErrorState message={containersError} onRetry={refetch} />;
  }

  return (
    <>
      <SummaryCards containers={containers} />
      <ContainersTable containers={containers} />
    </>
  );
}
