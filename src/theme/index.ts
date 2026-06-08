/**
 * Theme Context & Provider for BlitzRoom
 * Manages the active color theme with persistence via AsyncStorage.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, DEFAULT_THEME, type ThemeId, type ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, radius, shadows, animation, hitSlop } from './spacing';

const THEME_STORAGE_KEY = '@blitzroom/theme';

interface ThemeContextType {
  colors: ThemeColors;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  animation: typeof animation;
  hitSlop: typeof hitSlop;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function BlitzThemeProvider({ children }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved && saved in themes) {
        setThemeId(saved as ThemeId);
      }
    });
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  const value: ThemeContextType = {
    colors: themes[themeId],
    themeId,
    setTheme,
    typography,
    spacing,
    radius,
    shadows,
    animation,
    hitSlop,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme.
 * Must be used within a BlitzThemeProvider.
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a BlitzThemeProvider');
  }
  return context;
}

// Re-export everything theme-related
export { themes, DEFAULT_THEME, typography, spacing, radius, shadows, animation, hitSlop };
export type { ThemeId, ThemeColors };
