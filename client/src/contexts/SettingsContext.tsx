/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SettingsResponse } from '../types';
import { apiRequest, parseApiResponse } from '../utils/request';

export interface SettingsContextType {
  settings: SettingsResponse | null;
  eventToggles: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  toggleNotificationsEnabled: (checked: boolean) => void;
  addRecipient: () => void;
  changeRecipient: (index: number, value: string) => void;
  removeRecipient: (index: number) => void;
  toggleEvent: (eventId: string, checked: boolean) => void;
  refetch: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

function applyEventToggles(settings: SettingsResponse): Record<string, boolean> {
  const map: Record<string, boolean> = {};

  for (const event of settings.notifications_available_events) {
    map[event.id] = settings.notifications_events.includes(event.id);
  }

  return map;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [eventToggles, setEventToggles] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/settings');
      const result = await parseApiResponse(response, SettingsResponse);
      if (!result.ok) {
        throw new Error(result.error.error);
      }

      const payload = result.data;
      setEventToggles(applyEventToggles(payload));
      setSettings(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const toggleNotificationsEnabled = (checked: boolean) => {
    setSettings((prev) => (prev ? { ...prev, notifications_enabled: checked } : prev));
  };

  const addRecipient = () => {
    setSettings((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        notifications_recipients: [...prev.notifications_recipients, ''],
      };
    });
  };

  const changeRecipient = (index: number, value: string) => {
    setSettings((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        notifications_recipients: prev.notifications_recipients.map((item, i) =>
          i === index ? value : item,
        ),
      };
    });
  };

  const removeRecipient = (index: number) => {
    setSettings((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        notifications_recipients: prev.notifications_recipients.filter((_, i) => i !== index),
      };
    });
  };

  const toggleEvent = (eventId: string, checked: boolean) => {
    setEventToggles((prev) => ({ ...prev, [eventId]: checked }));
  };

  const value: SettingsContextType = {
    settings,
    eventToggles,
    isLoading,
    error,
    toggleNotificationsEnabled,
    addRecipient,
    changeRecipient,
    removeRecipient,
    toggleEvent,
    refetch: loadSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
