import { formatDistance } from 'date-fns';
import { useEffect, useState, type ReactNode } from 'react';
import { StatusPill } from './StatusPill';
import type { Container } from '../types';
import {
  COLUMNS,
  getRegistryLabel,
  getTagLabel,
  getTrackedTagLabel,
  type ContainerColumn,
  type ColumnKey,
  type DateFormat,
} from '../utils/containerUtils';

interface ContainersTableRowProps {
  container: Container;
  visibleColumns: ColumnKey[];
  dateFormat: DateFormat;
}

interface BaseCellProps {
  isVisible: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}

interface DateCellProps {
  isVisible: boolean;
  value: number | null;
  format: DateFormat;
}

interface DigestCellProps {
  isVisible: boolean;
  value: string | null;
}

interface StatusCellProps {
  isVisible: boolean;
  status: Container['status'];
  error: string | null;
}

interface ColumnCellProps {
  column: ContainerColumn;
  container: Container;
  isVisible: boolean;
  dateFormat: DateFormat;
}

const cellClassName = 'max-w-0 truncate px-4 py-4 text-sm text-foreground';

function formatContainerDate(
  dateValue: number | null,
  format: DateFormat,
  now = Date.now(),
): string {
  if (!dateValue) return '-';

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '-';

  if (format === 'relative') {
    return formatDistance(parsed, now, { addSuffix: true });
  }

  if (format === 'iso') {
    return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  return parsed.toLocaleString();
}

function BaseCell({ isVisible, title, className, children }: BaseCellProps) {
  if (!isVisible) return null;

  return (
    <td title={title} className={className ?? cellClassName}>
      {children}
    </td>
  );
}

function DateCell({ isVisible, value, format }: DateCellProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isVisible || format !== 'relative') return;

    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, [format, isVisible]);

  return (
    <BaseCell isVisible={isVisible} title={formatContainerDate(value, 'iso')}>
      {formatContainerDate(value, format, now)}
    </BaseCell>
  );
}

function DigestCell({ isVisible, value }: DigestCellProps) {
  return (
    <BaseCell
      isVisible={isVisible}
      title={value ?? '-'}
      className={`${cellClassName} font-mono text-xs text-foreground-muted`}
    >
      {value?.replace('sha256:', '') || '-'}
    </BaseCell>
  );
}

function StatusCell({ isVisible, status, error }: StatusCellProps) {
  if (!isVisible) return null;

  return (
    <td className="px-4 py-4 text-sm text-foreground">
      <StatusPill status={status} error={error} />
    </td>
  );
}

function ColumnCell({ column, container, isVisible, dateFormat }: ColumnCellProps) {
  if (column.kind === 'status') {
    return (
      <StatusCell
        key={column.key}
        isVisible={isVisible}
        status={container.status}
        error={container.error}
      />
    );
  }

  if (column.kind === 'date') {
    const value = container[column.key];

    return (
      <DateCell
        key={column.key}
        isVisible={isVisible}
        value={typeof value === 'number' || value === null ? value : null}
        format={dateFormat}
      />
    );
  }

  if (column.kind === 'digest') {
    const value = container[column.key];

    return (
      <DigestCell
        key={column.key}
        isVisible={isVisible}
        value={typeof value === 'string' || value === null ? value : null}
      />
    );
  }

  const value =
    column.key === 'registry'
      ? getRegistryLabel(container)
      : column.key === 'tag'
        ? getTagLabel(container)
        : column.key === 'trackedTag'
          ? getTrackedTagLabel(container)
          : String(container[column.key] ?? '');

  return (
    <BaseCell key={column.key} isVisible={isVisible} title={value}>
      {value}
    </BaseCell>
  );
}

export function ContainersTableRow({
  container,
  visibleColumns,
  dateFormat,
}: ContainersTableRowProps) {
  return (
    <tr className="border-b border-outline transition hover:bg-surface-1/50 last:border-b-0">
      {COLUMNS.map((column) => (
        <ColumnCell
          key={column.key}
          column={column}
          container={container}
          isVisible={visibleColumns.includes(column.key)}
          dateFormat={dateFormat}
        />
      ))}
    </tr>
  );
}
