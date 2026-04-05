/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Container } from '../types';
import {
  COLUMNS,
  STATUS_FILTERS,
  getRegistryLabel,
  getTagLabel,
  type DateFormat,
  type ColumnKey,
  type StatusVariant,
} from '../utils/containerUtils';

type SortDirection = 'asc' | 'desc';

interface TableSettings {
  statusFilters: StatusVariant[];
  dateFormat: DateFormat;
  itemsPerPage: number;
  visibleColumns: ColumnKey[];
}

export interface ContainerTableContextType {
  sortKey: ColumnKey;
  sortDirection: SortDirection;
  currentPage: number;
  searchQuery: string;
  settings: TableSettings;
  filteredCount: number;
  paginatedContainers: Container[];
  totalPages: number;
  handleSort: (key: ColumnKey) => void;
  handleSearch: (value: string) => void;
  handleSettingsChange: (nextSettings: TableSettings) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export const ContainerTableContext = createContext<ContainerTableContextType | undefined>(
  undefined,
);

interface ContainerTableProviderProps {
  containers: Container[];
  children: ReactNode;
}

function getSortableValue(container: Container, key: ColumnKey): number | string {
  if (key === 'status') {
    if (container.status === 'up_to_date') return 3;
    if (container.status === 'outdated') return 2;
    if (container.status === 'local') return 1;
    if (container.status === 'error' || container.error) return 0;

    return -1;
  }

  if (key === 'registry') {
    return getRegistryLabel(container).toLowerCase();
  }

  if (key === 'tag') {
    return getTagLabel(container).toLowerCase();
  }

  const value = container[key];
  if (typeof value === 'number') return value;

  return String(value ?? '').toLowerCase();
}

export function ContainerTableProvider({ containers, children }: ContainerTableProviderProps) {
  const [sortKey, setSortKey] = useState<ColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<TableSettings>({
    statusFilters: STATUS_FILTERS.map((status) => status.value),
    dateFormat: 'relative',
    itemsPerPage: 10,
    visibleColumns: COLUMNS.map((column) => column.key),
  });

  const filteredContainers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return containers.filter((container) => {
      const statusKey: StatusVariant = container.error ? 'error' : (container.status ?? 'unknown');
      if (!settings.statusFilters.includes(statusKey)) return false;

      if (!query) return true;

      const latestDigest = container.latestDigest ?? '';
      const localDigest = container.localDigest ?? '';
      const requestedDigest = container.requestedDigest ?? '';
      const tag = getTagLabel(container);
      const registry = getRegistryLabel(container);

      return (
        container.name.toLowerCase().includes(query) ||
        container.image.toLowerCase().includes(query) ||
        tag.toLowerCase().includes(query) ||
        registry.toLowerCase().includes(query) ||
        requestedDigest.toLowerCase().includes(query) ||
        localDigest.toLowerCase().includes(query) ||
        latestDigest.toLowerCase().includes(query)
      );
    });
  }, [containers, searchQuery, settings.statusFilters]);

  const sortedContainers = useMemo(() => {
    return [...filteredContainers].sort((a, b) => {
      const aVal = getSortableValue(a, sortKey);
      const bVal = getSortableValue(b, sortKey);
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

      if (comparison === 0 && sortKey !== 'name') {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const nameComparison = aName < bName ? -1 : aName > bName ? 1 : 0;

        return sortDirection === 'asc' ? nameComparison : -nameComparison;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredContainers, sortDirection, sortKey]);

  const totalPages = Math.ceil(sortedContainers.length / settings.itemsPerPage);
  const startIndex = (currentPage - 1) * settings.itemsPerPage;
  const paginatedContainers = sortedContainers.slice(
    startIndex,
    startIndex + settings.itemsPerPage,
  );

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSettingsChange = (nextSettings: TableSettings) => {
    setSettings(nextSettings);
    setCurrentPage(1);
  };

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const value: ContainerTableContextType = {
    sortKey,
    sortDirection,
    currentPage,
    searchQuery,
    settings,
    filteredCount: filteredContainers.length,
    paginatedContainers,
    totalPages,
    handleSort,
    handleSearch,
    handleSettingsChange,
    handlePrevious,
    handleNext,
  };

  return <ContainerTableContext.Provider value={value}>{children}</ContainerTableContext.Provider>;
}
