import { Package } from 'lucide-react';
import type { Container } from '../types';
import { Card } from './Card';
import { ContainersTableHeader } from './ContainersTableHeader';
import { ContainersTableRow } from './ContainersTableRow';

interface ContainersTableProps {
  containers: Container[];
}

export function ContainersTable({ containers }: ContainersTableProps) {
  const isEmptyState = containers.length === 0;

  return (
    <>
      {isEmptyState ? (
        <Card className="flex w-full flex-col items-center justify-center space-y-2 sm:py-16 py-16 text-center">
          <Package className="h-10 w-10 text-foreground-subtle" aria-hidden="true" />
          <div className="text-base font-semibold text-foreground">No containers found</div>
          <div className="text-sm text-foreground-subtle">Add a container to get started</div>
        </Card>
      ) : (
        <Card className="w-full overflow-x-auto p-0!">
          <table className="w-max min-w-full border-collapse">
            <ContainersTableHeader />
            <tbody>
              {containers.map((container) => (
                <ContainersTableRow key={container.name} container={container} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
