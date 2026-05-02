import { toast } from 'sonner';
import { ContainersTable } from '../components/ContainersTable';
import { LoadingScreen } from '../components/LoadingScreen';
import { SummaryCards } from '../components/SummaryCards';
import { useContainers } from '../hooks/useContainers';
import { RetryErrorState } from '../components/RetryErrorState';

export function HomePage() {
  const {
    containers,
    scan,
    isLoading: containersLoading,
    isScanStarting,
    hasLoadedOnce,
    error: containersError,
    refetch,
    scanNow,
  } = useContainers();
  const isScanning = scan?.isScanning ?? false;

  const handleScanNow = () => {
    if (isScanning || isScanStarting) return;

    toast.promise(scanNow(), {
      loading: 'Starting scan...',
      success: 'Scan started.',
      error: (err) => (err instanceof Error ? err.message : 'Could not start scan.'),
    });
  };

  if (containersLoading && !hasLoadedOnce) {
    return <LoadingScreen text="Loading containers..." />;
  }

  if (containersError) {
    return <RetryErrorState message={containersError} onRetry={refetch} />;
  }

  return (
    <>
      <SummaryCards containers={containers} />
      <ContainersTable
        containers={containers}
        isScanning={isScanning}
        isScanStarting={isScanStarting}
        onScanNow={handleScanNow}
      />
    </>
  );
}
