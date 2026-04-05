import { Package } from 'lucide-react';
import type { Container } from '../types';
import { STATUS_FILTERS } from '../utils/containerUtils';
import { useContainerTable } from '../hooks/useContainerTable';
import { Card } from './Card';
import { Input } from './Input';
import { ContainerTableProvider } from '../contexts/ContainerTableContext';
import { ContainersTableHeader } from './ContainersTableHeader';
import { ContainersTablePagination } from './ContainersTablePagination';
import { ContainersTableRow } from './ContainersTableRow';
import { ContainersTableSettingsMenu } from './ContainersTableSettingsMenu';

interface ContainersTableProps {
  containers: Container[];
}

function ContainersTableContent() {
  const { searchQuery, filteredCount, paginatedContainers, settings, handleSearch } =
    useContainerTable();
  const isEmptyState = filteredCount === 0;
  const hasStatusFilter = settings.statusFilters.length !== STATUS_FILTERS.length;
  const isFilteredEmpty = isEmptyState && (searchQuery.trim() !== '' || hasStatusFilter);

  return (
    <>
      <div className="mb-4 flex flex-col space-y-4 xs:flex-row xs:items-end xs:justify-between xs:space-x-4 xs:space-y-0">
        <div className="flex-1">
          <Input
            name="container-search"
            type="text"
            placeholder="Search containers..."
            value={searchQuery}
            onChange={(event) => handleSearch(event.target.value)}
          />
        </div>
        <div className="w-full xs:w-auto">
          <ContainersTableSettingsMenu />
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

export function ContainersTable({ containers }: ContainersTableProps) {
  return (
    <ContainerTableProvider containers={containers}>
      <ContainersTableContent />
    </ContainerTableProvider>
  );
}
