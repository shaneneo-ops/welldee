import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'welldee_theme';
const FAMILY_KEY = 'welldee_theme_family';

// Two independent dimensions: `theme` (dark/light, unchanged from before)
// and `themeFamily` (doodle/whimsy — which visual system). Both toggle a
// class on <html> so index.css can swap the --wd-* variables; combining
// .light and .whimsy gives 4 total states.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? 'dark';
    } catch {
      return 'dark';
    }
  });
  const [themeFamily, setThemeFamily] = useState(() => {
    try {
      return localStorage.getItem(FAMILY_KEY) ?? 'doodle';
    } catch {
      return 'doodle';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable — theme just won't persist across reloads
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('whimsy', themeFamily === 'whimsy');
    try {
      localStorage.setItem(FAMILY_KEY, themeFamily);
    } catch {
      // localStorage unavailable — theme family just won't persist across reloads
    }
  }, [themeFamily]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function toggleThemeFamily() {
    setThemeFamily((prev) => (prev === 'doodle' ? 'whimsy' : 'doodle'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, themeFamily, toggleThemeFamily }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
