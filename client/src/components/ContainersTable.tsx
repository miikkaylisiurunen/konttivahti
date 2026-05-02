import { Package, RefreshCw } from 'lucide-react';
import type { Container } from '../types';
import { STATUS_FILTERS } from '../utils/containerUtils';
import { useContainerTable } from '../hooks/useContainerTable';
import { Card } from './Card';
import { Input } from './Input';
import { CompactButton } from './Button';
import { ContainerTableProvider } from '../contexts/ContainerTableContext';
import { ContainersTableHeader } from './ContainersTableHeader';
import { ContainersTablePagination } from './ContainersTablePagination';
import { ContainersTableRow } from './ContainersTableRow';
import { ContainersTableSettingsMenu } from './ContainersTableSettingsMenu';

interface ContainersTableProps {
  containers: Container[];
  isScanning: boolean;
  isScanStarting: boolean;
  onScanNow: () => void;
}

function ContainersTableContent({
  isScanning,
  isScanStarting,
  onScanNow,
}: Omit<ContainersTableProps, 'containers'>) {
  const { searchQuery, filteredCount, paginatedContainers, settings, handleSearch } =
    useContainerTable();
  const isEmptyState = filteredCount === 0;
  const hasStatusFilter = settings.statusFilters.length !== STATUS_FILTERS.length;
  const isFilteredEmpty = isEmptyState && (searchQuery.trim() !== '' || hasStatusFilter);
  const scanButtonDisabled = isScanning || isScanStarting;

  return (
    <>
      <div className="mb-4 flex flex-col space-y-2 xs:flex-row xs:items-end xs:justify-between xs:space-x-2 xs:space-y-0">
        <div className="flex-1">
          <Input
            name="container-search"
            type="text"
            placeholder="Search containers..."
            value={searchQuery}
            onChange={(event) => handleSearch(event.target.value)}
          />
        </div>
        <div className="flex w-full items-center space-x-2 xs:w-auto">
          <CompactButton
            onClick={onScanNow}
            disabled={scanButtonDisabled}
            icon={
              <RefreshCw
                className={`${isScanning ? 'animate-spin ' : ''}size-4`}
                aria-hidden="true"
              />
            }
            label={isScanning ? 'Scanning...' : 'Scan now'}
            title={isScanning ? 'Scan in progress' : 'Start a new scan'}
          />
          <div className="min-w-0 flex-1 xs:flex-none">
            <ContainersTableSettingsMenu />
          </div>
        </div>
      </div>
      {isEmptyState ? (
        <Card className="flex w-full flex-col items-center justify-center space-y-2 sm:py-16 py-16 text-center">
          <Package className="h-10 w-10 text-foreground-subtle" aria-hidden="true" />
          <div className="text-base font-semibold text-foreground">
            {isFilteredEmpty ? 'No containers match your filters' : 'No containers found'}
          </div>
          <div className="text-sm text-foreground-subtle">
            {isFilteredEmpty ? 'Adjust your filters' : 'Add a container to get started'}
          </div>
        </Card>
      ) : (
        <>
          <Card className="w-full overflow-x-auto p-0!">
            <table className="w-max min-w-full border-collapse">
              <ContainersTableHeader />
              <tbody>
                {paginatedContainers.map((container) => (
                  <ContainersTableRow
                    key={container.name}
                    container={container}
                    visibleColumns={settings.visibleColumns}
                    dateFormat={settings.dateFormat}
                  />
                ))}
              </tbody>
            </table>
          </Card>
          <ContainersTablePagination />
        </>
      )}
    </>
  );
}

export function ContainersTable({
  containers,
  isScanning,
  isScanStarting,
  onScanNow,
}: ContainersTableProps) {
  return (
    <ContainerTableProvider containers={containers}>
      <ContainersTableContent
        isScanning={isScanning}
        isScanStarting={isScanStarting}
        onScanNow={onScanNow}
      />
    </ContainerTableProvider>
  );
}
