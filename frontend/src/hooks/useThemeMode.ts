import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  applyThemeMode,
  resolveThemeMode,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme/theme';
import { appStore } from '@/stores/app-store';

type UseThemeModeResult = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (nextMode: ThemeMode) => void;
};

export function useThemeMode(): UseThemeModeResult {
  const themeMode = useSyncExternalStore(
    appStore.subscribe,
    () => appStore.getSnapshot().themeMode,
    () => appStore.getSnapshot().themeMode,
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemeMode(themeMode),
  );

  useEffect(() => {
    const nextResolvedTheme = applyThemeMode(themeMode);
    setResolvedTheme(nextResolvedTheme);
  }, [themeMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        setResolvedTheme(applyThemeMode('system'));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  return {
    themeMode,
    resolvedTheme,
    setThemeMode: (nextMode: ThemeMode) => {
      appStore.setSnapshot({ themeMode: nextMode });
    },
  };
}