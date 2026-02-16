/**
 * CSS Custom Properties Layer
 * Bridges Ant Design theme tokens with custom CSS and inline styles.
 * Light mode + 3 dark variants: Midnight, Slate, Warm.
 */

export type ThemeMode = 'light' | 'dark';
export type DarkVariant = 'midnight' | 'slate' | 'warm';

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

  // Gradients
  '--gradient-primary': string;

  // Chat
  '--color-chat-mine': string;
  '--color-chat-mine-text': string;
  '--color-chat-other-bg': string;
  '--color-chat-other-border': string;

  // Status tints (used for unassigned, due dates, feedback, etc.)
  '--color-tint-warning-bg': string;
  '--color-tint-warning-border': string;
  '--color-tint-danger-bg': string;
  '--color-tint-danger-border': string;
  '--color-tint-success-bg': string;
  '--color-tint-success-border': string;
  '--color-tint-info-bg': string;
  '--color-tint-info-border': string;

  // Overlay (for drag, drop zones, shadows on cards)
  '--color-overlay-light': string;
  '--color-overlay-medium': string;
  '--color-overlay-heavy': string;
}

// ── Light ──

const lightVars: ThemeVars = {
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

  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  '--shadow-md': '0 4px 12px rgba(0,0,0,0.08)',
  '--shadow-lg': '0 8px 24px rgba(0,0,0,0.10)',

  '--gradient-primary': 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',

  '--color-chat-mine': '#1565C0',
  '--color-chat-mine-text': '#FFFFFF',
  '--color-chat-other-bg': '#FFFFFF',
  '--color-chat-other-border': '#E0E0E0',

  '--color-tint-warning-bg': '#FFFBE6',
  '--color-tint-warning-border': '#FAAD14',
  '--color-tint-danger-bg': '#FFF1F0',
  '--color-tint-danger-border': '#FFCCC7',
  '--color-tint-success-bg': '#F6FFED',
  '--color-tint-success-border': '#B7EB8F',
  '--color-tint-info-bg': '#E3F2FD',
  '--color-tint-info-border': '#64B5F6',

  '--color-overlay-light': 'rgba(9,30,66,0.04)',
  '--color-overlay-medium': 'rgba(9,30,66,0.08)',
  '--color-overlay-heavy': 'rgba(9,30,66,0.25)',
};

// ── Midnight — near-black, high contrast (GitHub Dark style) ──

const midnightVars: ThemeVars = {
  '--color-primary': '#58A6FF',
  '--color-primary-hover': '#79B8FF',
  '--color-primary-active': '#3B8EED',
  '--color-primary-light': 'rgba(88,166,255,0.15)',
  '--color-primary-bg': 'rgba(88,166,255,0.10)',

  '--color-bg-sidebar': '#0D1117',
  '--color-bg-content': '#010409',
  '--color-bg-surface': '#161B22',
  '--color-bg-elevated': '#1C2128',
  '--color-bg-inset': '#0D1117',
  '--color-bg-hover': '#1C2128',

  '--color-border': '#30363D',
  '--color-border-light': '#21262D',

  '--color-text-primary': '#E6EDF3',
  '--color-text-secondary': '#8B949E',
  '--color-text-muted': '#484F58',
  '--color-text-heading': '#F0F6FC',

  '--color-nav-active-bg': 'rgba(88,166,255,0.15)',
  '--color-nav-active-text': '#58A6FF',
  '--color-nav-active-border': '#58A6FF',

  '--color-scrollbar': '#30363D',
  '--color-scrollbar-hover': '#484F58',

  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.4)',
  '--shadow-md': '0 4px 12px rgba(0,0,0,0.4)',
  '--shadow-lg': '0 8px 24px rgba(0,0,0,0.5)',

  '--gradient-primary': 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',

  '--color-chat-mine': '#58A6FF',
  '--color-chat-mine-text': '#FFFFFF',
  '--color-chat-other-bg': '#1C2128',
  '--color-chat-other-border': '#30363D',

  '--color-tint-warning-bg': 'rgba(250,173,20,0.12)',
  '--color-tint-warning-border': 'rgba(250,173,20,0.40)',
  '--color-tint-danger-bg': 'rgba(248,81,73,0.12)',
  '--color-tint-danger-border': 'rgba(248,81,73,0.40)',
  '--color-tint-success-bg': 'rgba(63,185,80,0.12)',
  '--color-tint-success-border': 'rgba(63,185,80,0.40)',
  '--color-tint-info-bg': 'rgba(88,166,255,0.12)',
  '--color-tint-info-border': 'rgba(88,166,255,0.40)',

  '--color-overlay-light': 'rgba(255,255,255,0.04)',
  '--color-overlay-medium': 'rgba(255,255,255,0.08)',
  '--color-overlay-heavy': 'rgba(0,0,0,0.40)',
};

// ── Slate — blue-gray tinted, softer contrast (Linear style) ──

const slateVars: ThemeVars = {
  '--color-primary': '#6E9FFF',
  '--color-primary-hover': '#8DB4FF',
  '--color-primary-active': '#5088EE',
  '--color-primary-light': 'rgba(110,159,255,0.15)',
  '--color-primary-bg': 'rgba(110,159,255,0.10)',

  '--color-bg-sidebar': '#1A1D2E',
  '--color-bg-content': '#131620',
  '--color-bg-surface': '#1E2235',
  '--color-bg-elevated': '#252A40',
  '--color-bg-inset': '#161929',
  '--color-bg-hover': '#252A40',

  '--color-border': '#2E3348',
  '--color-border-light': '#262B3E',

  '--color-text-primary': '#E2E4EA',
  '--color-text-secondary': '#9499AD',
  '--color-text-muted': '#5C6178',
  '--color-text-heading': '#F0F1F5',

  '--color-nav-active-bg': 'rgba(110,159,255,0.15)',
  '--color-nav-active-text': '#6E9FFF',
  '--color-nav-active-border': '#6E9FFF',

  '--color-scrollbar': '#2E3348',
  '--color-scrollbar-hover': '#3D4460',

  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.3)',
  '--shadow-md': '0 4px 12px rgba(0,0,0,0.3)',
  '--shadow-lg': '0 8px 24px rgba(0,0,0,0.4)',

  '--gradient-primary': 'linear-gradient(135deg, #4A7DDB 0%, #2E5BAA 100%)',

  '--color-chat-mine': '#6E9FFF',
  '--color-chat-mine-text': '#FFFFFF',
  '--color-chat-other-bg': '#252A40',
  '--color-chat-other-border': '#2E3348',

  '--color-tint-warning-bg': 'rgba(250,173,20,0.12)',
  '--color-tint-warning-border': 'rgba(250,173,20,0.35)',
  '--color-tint-danger-bg': 'rgba(239,83,80,0.12)',
  '--color-tint-danger-border': 'rgba(239,83,80,0.35)',
  '--color-tint-success-bg': 'rgba(76,175,80,0.12)',
  '--color-tint-success-border': 'rgba(76,175,80,0.35)',
  '--color-tint-info-bg': 'rgba(110,159,255,0.12)',
  '--color-tint-info-border': 'rgba(110,159,255,0.35)',

  '--color-overlay-light': 'rgba(255,255,255,0.04)',
  '--color-overlay-medium': 'rgba(255,255,255,0.07)',
  '--color-overlay-heavy': 'rgba(0,0,0,0.35)',
};

// ── Warm — warm-tinted, cozy feel (Discord style) ──

const warmVars: ThemeVars = {
  '--color-primary': '#7289DA',
  '--color-primary-hover': '#8EA1E1',
  '--color-primary-active': '#5B6EAE',
  '--color-primary-light': 'rgba(114,137,218,0.15)',
  '--color-primary-bg': 'rgba(114,137,218,0.10)',

  '--color-bg-sidebar': '#2B2D31',
  '--color-bg-content': '#1E1F22',
  '--color-bg-surface': '#313338',
  '--color-bg-elevated': '#383A40',
  '--color-bg-inset': '#2B2D31',
  '--color-bg-hover': '#3A3C42',

  '--color-border': '#3F4147',
  '--color-border-light': '#393B40',

  '--color-text-primary': '#F2F3F5',
  '--color-text-secondary': '#B5BAC1',
  '--color-text-muted': '#6D6F78',
  '--color-text-heading': '#FFFFFF',

  '--color-nav-active-bg': 'rgba(114,137,218,0.15)',
  '--color-nav-active-text': '#7289DA',
  '--color-nav-active-border': '#7289DA',

  '--color-scrollbar': '#3F4147',
  '--color-scrollbar-hover': '#4E5058',

  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.25)',
  '--shadow-md': '0 4px 12px rgba(0,0,0,0.25)',
  '--shadow-lg': '0 8px 24px rgba(0,0,0,0.35)',

  '--gradient-primary': 'linear-gradient(135deg, #7289DA 0%, #5B6EAE 100%)',

  '--color-chat-mine': '#7289DA',
  '--color-chat-mine-text': '#FFFFFF',
  '--color-chat-other-bg': '#383A40',
  '--color-chat-other-border': '#3F4147',

  '--color-tint-warning-bg': 'rgba(250,173,20,0.14)',
  '--color-tint-warning-border': 'rgba(250,173,20,0.40)',
  '--color-tint-danger-bg': 'rgba(237,66,69,0.14)',
  '--color-tint-danger-border': 'rgba(237,66,69,0.40)',
  '--color-tint-success-bg': 'rgba(87,202,120,0.14)',
  '--color-tint-success-border': 'rgba(87,202,120,0.40)',
  '--color-tint-info-bg': 'rgba(114,137,218,0.14)',
  '--color-tint-info-border': 'rgba(114,137,218,0.40)',

  '--color-overlay-light': 'rgba(255,255,255,0.04)',
  '--color-overlay-medium': 'rgba(255,255,255,0.08)',
  '--color-overlay-heavy': 'rgba(0,0,0,0.30)',
};

// ── Font Size Scales ──

export type FontSize = 'small' | 'medium' | 'large';

interface FontSizeVars {
  '--fs-2xs': string;     // 10px @ medium — tiny metadata, badges
  '--fs-xs': string;      // 11px @ medium — small labels
  '--fs-sm': string;      // 12px @ medium — secondary text, captions
  '--fs-caption': string; // 13px @ medium — descriptions
  '--fs-base': string;    // 14px @ medium — body text
  '--fs-md': string;      // 15px @ medium — slightly larger body
  '--fs-lg': string;      // 16px @ medium — subheadings
  '--fs-xl': string;      // 18px @ medium — section headers
  '--fs-2xl': string;     // 20px @ medium — large headers
  '--fs-3xl': string;     // 24px @ medium — page titles
}

const fontSizeScales: Record<FontSize, FontSizeVars> = {
  small: {
    '--fs-2xs': '9px',
    '--fs-xs': '10px',
    '--fs-sm': '11px',
    '--fs-caption': '12px',
    '--fs-base': '12px',
    '--fs-md': '13px',
    '--fs-lg': '14px',
    '--fs-xl': '16px',
    '--fs-2xl': '18px',
    '--fs-3xl': '22px',
  },
  medium: {
    '--fs-2xs': '10px',
    '--fs-xs': '11px',
    '--fs-sm': '12px',
    '--fs-caption': '13px',
    '--fs-base': '14px',
    '--fs-md': '15px',
    '--fs-lg': '16px',
    '--fs-xl': '18px',
    '--fs-2xl': '20px',
    '--fs-3xl': '24px',
  },
  large: {
    '--fs-2xs': '11px',
    '--fs-xs': '12px',
    '--fs-sm': '13px',
    '--fs-caption': '14px',
    '--fs-base': '16px',
    '--fs-md': '17px',
    '--fs-lg': '18px',
    '--fs-xl': '20px',
    '--fs-2xl': '22px',
    '--fs-3xl': '28px',
  },
};

// ── Exports ──

const darkVariantMap: Record<DarkVariant, ThemeVars> = {
  midnight: midnightVars,
  slate: slateVars,
  warm: warmVars,
};

export function injectThemeVars(mode: ThemeMode, darkVariant: DarkVariant = 'midnight'): void {
  const vars = mode === 'light' ? lightVars : darkVariantMap[darkVariant];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function injectFontSizeVars(size: FontSize): void {
  const vars = fontSizeScales[size];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function getThemeVars(mode: ThemeMode, darkVariant: DarkVariant = 'midnight'): ThemeVars {
  return mode === 'light' ? lightVars : darkVariantMap[darkVariant];
}
