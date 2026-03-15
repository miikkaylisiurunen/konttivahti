import type { ReactNode } from 'react';
import { StatusPill } from './StatusPill';
import type { Container } from '../types';
import {
  COLUMNS,
  getRegistryLabel,
  getTagLabel,
  type ContainerColumn,
} from '../utils/containerUtils';

interface ContainersTableRowProps {
  container: Container;
}

interface BaseCellProps {
  title?: string;
  className?: string;
  children: ReactNode;
}

interface DateCellProps {
  value: number | null;
}

interface DigestCellProps {
  value: string | null;
}

interface StatusCellProps {
  status: Container['status'];
  error: string | null;
}

interface ColumnCellProps {
  column: ContainerColumn;
  container: Container;
}

const cellClassName = 'max-w-0 truncate px-4 py-4 text-sm text-foreground';

function formatContainerDate(dateValue: number | null): string {
  if (!dateValue) return '-';

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleString();
}

function BaseCell({ title, className, children }: BaseCellProps) {
  return (
    <td title={title} className={className ?? cellClassName}>
      {children}
    </td>
  );
}

function DateCell({ value }: DateCellProps) {
  return <BaseCell title={formatContainerDate(value)}>{formatContainerDate(value)}</BaseCell>;
}

function DigestCell({ value }: DigestCellProps) {
  return (
    <BaseCell
      title={value ?? '-'}
      className={`${cellClassName} font-mono text-xs text-foreground-muted`}
    >
      {value?.replace('sha256:', '') || '-'}
    </BaseCell>
  );
}

function StatusCell({ status, error }: StatusCellProps) {
  return (
    <td className="px-4 py-4 text-sm text-foreground">
      <StatusPill status={status} error={error} />
    </td>
  );
}

function ColumnCell({ column, container }: ColumnCellProps) {
  if (column.kind === 'status') {
    return <StatusCell key={column.key} status={container.status} error={container.error} />;
  }

  if (column.kind === 'date') {
    const value = container[column.key];

    return (
      <DateCell
        key={column.key}
        value={typeof value === 'number' || value === null ? value : null}
      />
    );
  }

  if (column.kind === 'digest') {
    const value = container[column.key];

    return (
      <DigestCell
        key={column.key}
        value={typeof value === 'string' || value === null ? value : null}
      />
    );
  }

  const value =
    column.key === 'registry'
      ? getRegistryLabel(container)
      : column.key === 'tag'
        ? getTagLabel(container)
        : String(container[column.key] ?? '');

  return (
    <BaseCell key={column.key} title={value}>
      {value}
    </BaseCell>
  );
}

export function ContainersTableRow({ container }: ContainersTableRowProps) {
  return (
    <tr className="border-b border-outline hover:bg-surface-1/50 last:border-b-0">
      {COLUMNS.map((column) => (
        <ColumnCell key={column.key} column={column} container={container} />
      ))}
    </tr>
  );
}
