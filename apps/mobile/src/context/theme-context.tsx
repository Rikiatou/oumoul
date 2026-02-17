import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { lightPalette, darkPalette, applyPalette, palette } from '../theme';
import type { Palette } from '../theme';

interface ThemeContextType {
  palette: Palette;
  isDark: boolean;
  toggleTheme: () => void;
}

const THEME_KEY = 'oumoul_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((val) => {
      if (val === 'dark') {
        setIsDark(true);
        applyPalette(darkPalette);
      }
    }).catch(() => {});
  }, []);

  // Keep the mutable palette in sync with the current theme
  applyPalette(isDark ? darkPalette : lightPalette);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    applyPalette(next ? darkPalette : lightPalette);
    SecureStore.setItemAsync(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ palette: isDark ? darkPalette : lightPalette, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
