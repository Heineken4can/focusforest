export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'focus-forest.theme-mode';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveThemeMode(themeMode: ThemeMode): ResolvedTheme {
  return themeMode === 'system' ? getSystemTheme() : themeMode;
}

export function readStoredThemeMode(): ThemeMode {
  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedValue === 'light' || storedValue === 'dark' || storedValue === 'system') {
    return storedValue;
  }

  return 'system';
}

export function applyThemeMode(themeMode: ThemeMode): ResolvedTheme {
  const resolvedTheme = resolveThemeMode(themeMode);
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
  window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);

  return resolvedTheme;
}
