import { COLUMNS } from '../utils/containerUtils';

export function ContainersTableHeader() {
  return (
    <thead className="border-b-2 border-outline bg-surface-0">
      <tr>
        {COLUMNS.map((column) => (
          <th key={column.label} className={`${column.widthClassName} p-0 text-left`}>
            <div className="flex w-full items-center space-x-1.5 px-4 py-4 text-left text-xs font-semibold uppercase text-foreground-faint whitespace-nowrap hover:text-foreground-strong">
              <span>{column.label}</span>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}
