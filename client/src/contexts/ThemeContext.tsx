/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (themeMode: ThemeMode) => void;
}

const themeStorageKey = 'konttivahti-theme';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const storedThemeMode = window.localStorage.getItem(themeStorageKey);
  return isThemeMode(storedThemeMode) ? storedThemeMode : 'system';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function disableThemeTransitions() {
  document.documentElement.classList.add('theme-transition-disabled');
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.remove('theme-transition-disabled');
    });
  });
}

function applyResolvedTheme(resolvedTheme: ResolvedTheme) {
  disableThemeTransitions();
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  useLayoutEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== themeStorageKey) {
        return;
      }

      setThemeModeState(isThemeMode(event.newValue) ? event.newValue : 'system');
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setThemeMode = (nextThemeMode: ThemeMode) => {
    window.localStorage.setItem(themeStorageKey, nextThemeMode);
    setThemeModeState(nextThemeMode);
  };

  const value = useMemo(
    () => ({ themeMode, resolvedTheme, setThemeMode }),
    [themeMode, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
