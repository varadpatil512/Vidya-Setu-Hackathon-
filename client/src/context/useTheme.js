import { useState, useEffect } from 'react';

const STORAGE_KEY = 'vs-theme';

/**
 * useTheme — manages light/dark mode by toggling `class="dark"` on <html>.
 * Choice is persisted in localStorage under "vs-theme".
 * Default: dark mode (matches the existing design intent).
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
}
