/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Container } from '../types';
import { getRegistryLabel, getTagLabel } from '../utils/containerUtils';

export interface ContainerTableContextType {
  currentPage: number;
  searchQuery: string;
  filteredCount: number;
  paginatedContainers: Container[];
  totalPages: number;
  handleSearch: (value: string) => void;
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

const ITEMS_PER_PAGE = 10;

export function ContainerTableProvider({ containers, children }: ContainerTableProviderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContainers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return containers.filter((container) => {
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
  }, [containers, searchQuery]);

  const totalPages = Math.ceil(filteredContainers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedContainers = filteredContainers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const value: ContainerTableContextType = {
    currentPage,
    searchQuery,
    filteredCount: filteredContainers.length,
    paginatedContainers,
    totalPages,
    handleSearch,
    handlePrevious,
    handleNext,
  };

  return <ContainerTableContext.Provider value={value}>{children}</ContainerTableContext.Provider>;
}
