import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ThemeConfig } from 'antd';
import { themeV1 } from '../theme/antd-theme';
import { themeV2 } from '../theme/antd-theme-v2';
import { injectThemeVars, type ThemeVersion } from '../theme/theme-vars';
import { storage } from '../utils/storage';

interface ThemeContextType {
  themeVersion: ThemeVersion;
  setThemeVersion: (version: ThemeVersion) => void;
  activeTheme: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const themes: Record<ThemeVersion, ThemeConfig> = { v1: themeV1, v2: themeV2 };

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeVersion, setThemeVersionState] = useState<ThemeVersion>(() => storage.getThemeVersion());

  const setThemeVersion = (version: ThemeVersion) => {
    storage.setThemeVersion(version);
    setThemeVersionState(version);
  };

  useEffect(() => {
    injectThemeVars(themeVersion);
  }, [themeVersion]);

  // Inject on mount
  useEffect(() => {
    injectThemeVars(themeVersion);
  }, []);

  const activeTheme = useMemo(() => themes[themeVersion], [themeVersion]);

  return (
    <ThemeContext.Provider value={{ themeVersion, setThemeVersion, activeTheme }}>
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
