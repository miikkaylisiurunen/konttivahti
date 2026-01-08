import { useState, useEffect, useCallback } from 'react';
import { apiRequest, parseApiResponse } from '../utils/request';
import { ContainersResponse } from '../types';
import type { Container } from '../types';

interface UseContainersReturn {
  containers: Container[];
  isLoading: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
}

export function useContainers(): UseContainersReturn {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/status', { method: 'GET' });
      const result = await parseApiResponse(response, ContainersResponse);
      if (!result.ok) {
        throw new Error(result.error.error);
      }

      setContainers(result.data.containers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    void fetchContainers();
    const interval = setInterval(() => {
      void fetchContainers();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchContainers]);

  return {
    containers,
    isLoading,
    hasLoadedOnce,
    error,
  };
}
