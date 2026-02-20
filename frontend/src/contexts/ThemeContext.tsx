import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ThemeConfig, MappingAlgorithm } from 'antd';
import { theme as antdTheme } from 'antd';
import { themeLight, darkThemes } from '../theme/antd-theme-v2';
import { injectThemeVars, injectFontSizeVars, type ThemeMode, type DarkVariant } from '../theme/theme-vars';
import { storage } from '../utils/storage';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type FontSize = 'small' | 'medium' | 'large';
export type { DarkVariant };

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  resolvedMode: ThemeMode;        // actual light | dark after resolving "auto"
  darkVariant: DarkVariant;
  setDarkVariant: (variant: DarkVariant) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  activeTheme: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const FONT_SIZE_TOKENS: Record<FontSize, Partial<ThemeConfig['token']>> = {
  small: {
    fontSize: 12,
    fontSizeHeading1: 22,
    fontSizeHeading2: 16,
    fontSizeHeading3: 14,
    fontSizeHeading4: 12,
  },
  medium: {},
  large: {
    fontSize: 16,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 16,
  },
};

function getSystemPreference(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePrefState] = useState<ThemePreference>(
    () => storage.getThemePreference()
  );
  const [darkVariant, setDarkVariantState] = useState<DarkVariant>(
    () => storage.getDarkVariant()
  );
  const [systemMode, setSystemMode] = useState<ThemeMode>(getSystemPreference);
  const [fontSize, setFontSizeState] = useState<FontSize>(() => storage.getFontSize());
  const [compactMode, setCompactModeState] = useState(() => storage.getCompactMode());

  const setThemePreference = useCallback((pref: ThemePreference) => {
    storage.setThemePreference(pref);
    setThemePrefState(pref);
  }, []);

  const setDarkVariant = useCallback((variant: DarkVariant) => {
    storage.setDarkVariant(variant);
    setDarkVariantState(variant);
  }, []);

  const setFontSize = useCallback((size: FontSize) => {
    storage.setFontSize(size);
    setFontSizeState(size);
  }, []);

  const setCompactMode = useCallback((compact: boolean) => {
    storage.setCompactMode(compact);
    setCompactModeState(compact);
  }, []);

  // Listen for OS dark mode changes when preference is "auto"
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedMode: ThemeMode = themePreference === 'auto' ? systemMode : themePreference;

  // Inject CSS variables when resolved mode or dark variant changes
  useEffect(() => {
    injectThemeVars(resolvedMode, darkVariant);
  }, [resolvedMode, darkVariant]);

  // Inject font-size CSS variables when fontSize changes
  useEffect(() => {
    injectFontSizeVars(fontSize);
  }, [fontSize]);

  const activeTheme = useMemo((): ThemeConfig => {
    const base = resolvedMode === 'light' ? themeLight : darkThemes[darkVariant];
    const fontTokens = FONT_SIZE_TOKENS[fontSize];
    const algorithms: MappingAlgorithm[] = [];

    if (resolvedMode === 'dark') {
      algorithms.push(antdTheme.darkAlgorithm);
    }
    if (compactMode) {
      algorithms.push(antdTheme.compactAlgorithm);
    }

    return {
      ...base,
      algorithm: algorithms.length > 0 ? algorithms : undefined,
      token: {
        ...base.token,
        ...fontTokens,
      },
    };
  }, [resolvedMode, darkVariant, fontSize, compactMode]);

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        setThemePreference,
        resolvedMode,
        darkVariant,
        setDarkVariant,
        fontSize,
        setFontSize,
        compactMode,
        setCompactMode,
        activeTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useThemeVersion() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeVersion must be used within ThemeProvider');
  }
  return context;
}
