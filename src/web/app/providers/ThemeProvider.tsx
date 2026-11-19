'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on client
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    setMounted(true);
  }, []);

  // Update resolved theme whenever theme changes or system preference changes
  useEffect(() => {
    if (!mounted) return;

    const updateTheme = () => {
      let finalTheme: 'light' | 'dark';

      if (theme === 'system') {
        finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        finalTheme = theme;
      }

      setResolvedTheme(finalTheme);

      // Update DOM
      const htmlElement = document.documentElement;
      if (finalTheme === 'dark') {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
    };

    updateTheme();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
