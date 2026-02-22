import React, { createContext, useContext, useState } from 'react';
import type { Theme } from './theme-types';
import { defaultTheme } from './default-theme';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme | ((prev: Theme) => Theme)) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? defaultTheme);
  function setTheme(next: Theme | ((prev: Theme) => Theme)) {
    setThemeState((prev) => (typeof next === 'function' ? next(prev) : next));
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
