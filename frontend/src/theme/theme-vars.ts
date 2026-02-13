/**
 * CSS Custom Properties Layer
 * Bridges Ant Design theme tokens with custom CSS files and inline styles.
 * Both v1 and v2 inject the same variable names with different values.
 */

export type ThemeVersion = 'v1' | 'v2';

interface ThemeVars {
  // Primary
  '--color-primary': string;
  '--color-primary-hover': string;
  '--color-primary-active': string;
  '--color-primary-light': string;
  '--color-primary-bg': string;

  // Backgrounds
  '--color-bg-sidebar': string;
  '--color-bg-content': string;
  '--color-bg-surface': string;
  '--color-bg-elevated': string;
  '--color-bg-inset': string;
  '--color-bg-hover': string;

  // Borders
  '--color-border': string;
  '--color-border-light': string;

  // Text
  '--color-text-primary': string;
  '--color-text-secondary': string;
  '--color-text-muted': string;
  '--color-text-heading': string;

  // Navigation
  '--color-nav-active-bg': string;
  '--color-nav-active-text': string;
  '--color-nav-active-border': string;

  // Scrollbar
  '--color-scrollbar': string;
  '--color-scrollbar-hover': string;

  // Shadows
  '--shadow-sm': string;
  '--shadow-md': string;
  '--shadow-lg': string;

  // Gradients (login/setup)
  '--gradient-primary': string;

  // Chat
  '--color-chat-mine': string;
  '--color-chat-mine-text': string;
  '--color-chat-other-bg': string;
  '--color-chat-other-border': string;
}

const v1Vars: ThemeVars = {
  '--color-primary': '#1890ff',
  '--color-primary-hover': '#40a9ff',
  '--color-primary-active': '#096dd9',
  '--color-primary-light': '#e6f7ff',
  '--color-primary-bg': '#e6f7ff',

  '--color-bg-sidebar': '#fafafa',
  '--color-bg-content': '#f0f0f0',
  '--color-bg-surface': '#ffffff',
  '--color-bg-elevated': '#ffffff',
  '--color-bg-inset': '#f4f5f7',
  '--color-bg-hover': '#f4f5f7',

  '--color-border': '#e8e8e8',
  '--color-border-light': '#f0f0f0',

  '--color-text-primary': '#1A1A1A',
  '--color-text-secondary': '#595959',
  '--color-text-muted': '#8c8c8c',
  '--color-text-heading': '#172b4d',

  '--color-nav-active-bg': '#e6f7ff',
  '--color-nav-active-text': '#1890ff',
  '--color-nav-active-border': '#1890ff',

  '--color-scrollbar': '#c1c7d0',
  '--color-scrollbar-hover': '#a5adba',

  '--shadow-sm': '0 2px 4px rgba(0, 0, 0, 0.06)',
  '--shadow-md': '0 4px 8px rgba(0, 0, 0, 0.08)',
  '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',

  '--gradient-primary': 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',

  '--color-chat-mine': '#1890ff',
  '--color-chat-mine-text': '#ffffff',
  '--color-chat-other-bg': '#ffffff',
  '--color-chat-other-border': '#e8e8e8',
};

const v2Vars: ThemeVars = {
  '--color-primary': '#1565C0',
  '--color-primary-hover': '#0D47A1',
  '--color-primary-active': '#0A3A7F',
  '--color-primary-light': '#E3F2FD',
  '--color-primary-bg': '#E3F2FD',

  '--color-bg-sidebar': '#FAFBFC',
  '--color-bg-content': '#F7F8FA',
  '--color-bg-surface': '#FFFFFF',
  '--color-bg-elevated': '#FFFFFF',
  '--color-bg-inset': '#F3F4F6',
  '--color-bg-hover': '#F3F4F6',

  '--color-border': '#E0E0E0',
  '--color-border-light': '#EEEEEE',

  '--color-text-primary': '#1A1A1A',
  '--color-text-secondary': '#4A4A4A',
  '--color-text-muted': '#9E9E9E',
  '--color-text-heading': '#1A1A1A',

  '--color-nav-active-bg': '#E3F2FD',
  '--color-nav-active-text': '#1565C0',
  '--color-nav-active-border': '#1565C0',

  '--color-scrollbar': '#C1C7D0',
  '--color-scrollbar-hover': '#A5ADBA',

  '--shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
  '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
  '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.10)',

  '--gradient-primary': 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',

  '--color-chat-mine': '#1565C0',
  '--color-chat-mine-text': '#FFFFFF',
  '--color-chat-other-bg': '#FFFFFF',
  '--color-chat-other-border': '#E0E0E0',
};

const themeVarSets: Record<ThemeVersion, ThemeVars> = { v1: v1Vars, v2: v2Vars };

export function injectThemeVars(version: ThemeVersion): void {
  const vars = themeVarSets[version];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function getThemeVars(version: ThemeVersion): ThemeVars {
  return themeVarSets[version];
}
