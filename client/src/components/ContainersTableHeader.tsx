import { ChevronDown, type LucideIcon } from 'lucide-react';
import { COLUMNS, type ColumnKey } from '../utils/containerUtils';
import { useContainerTable } from '../hooks/useContainerTable';

interface HeaderCellProps {
  columnKey: ColumnKey;
  label: string;
  widthClassName: string;
  Icon: LucideIcon;
  isSorted: boolean;
  isAscending: boolean;
  onSort: (key: ColumnKey) => void;
}

function HeaderCell({
  columnKey,
  label,
  widthClassName,
  Icon,
  isSorted,
  isAscending,
  onSort,
}: HeaderCellProps) {
  return (
    <th className={`${widthClassName} p-0 text-left`}>
      <button
        onClick={() => onSort(columnKey)}
        className="flex w-full items-center space-x-1.5 px-4 py-4 text-left text-xs font-semibold uppercase text-foreground-faint transition whitespace-nowrap hover:text-foreground-strong"
      >
        <Icon className="size-3 text-foreground-muted" aria-hidden="true" />
        <span>{label}</span>
        <span
          className={`${isSorted ? '' : 'opacity-0'} ${isSorted && isAscending ? ' rotate-180' : ''}`}
        >
          <ChevronDown className="size-3.5" />
        </span>
      </button>
    </th>
  );
}

export function ContainersTableHeader() {
  const { sortKey, sortDirection, handleSort } = useContainerTable();
  const isSorted = (column: ColumnKey) => sortKey === column;
  const isAscending = sortDirection === 'asc';

  return (
    <thead className="border-b-2 border-outline bg-surface-0">
      <tr>
        {COLUMNS.map((column) => (
          <HeaderCell
            key={column.key}
            columnKey={column.key}
            label={column.label}
            widthClassName={column.widthClassName}
            Icon={column.Icon}
            isSorted={isSorted(column.key)}
            isAscending={isAscending}
            onSort={handleSort}
          />
        ))}
      </tr>
    </thead>
  );
}
