import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiRequest, parseApiResponse } from '../utils/request';
import { ContainersResponse, ScanStartResponse, type Container, type ScanState } from '../types';

interface UseContainersReturn {
  containers: Container[];
  scan: ScanState | null;
  isLoading: boolean;
  isScanStarting: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  scanNow: () => Promise<void>;
}

export function useContainers(): UseContainersReturn {
  const { isAuthenticated } = useAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanStarting, setIsScanStarting] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setContainers([]);
      setScan(null);
      setError(null);
      setIsLoading(false);
      setIsScanStarting(false);
      setHasLoadedOnce(false);
    }
  }, [isAuthenticated]);

  const fetchContainers = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/status', { method: 'GET' });
      const result = await parseApiResponse(response, ContainersResponse);
      if (!result.ok) {
        throw new Error(result.error.error);
      }

      setContainers(result.data.containers);
      setScan(result.data.scan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [isAuthenticated]);

  const scanNow = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    setIsScanStarting(true);

    try {
      const response = await apiRequest('/api/scan', { method: 'POST' });
      const result = await parseApiResponse(response, ScanStartResponse);
      if (!result.ok) {
        throw new Error(result.error.error);
      }

      setScan(result.data.scan);
    } finally {
      setIsScanStarting(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchContainers();
    const interval = setInterval(() => {
      void fetchContainers();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchContainers]);

  return {
    containers,
    scan,
    isLoading,
    isScanStarting,
    hasLoadedOnce,
    error,
    refetch: fetchContainers,
    scanNow,
  };
}
