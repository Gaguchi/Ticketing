/**
 * Ant Design Theme Configuration — Light + Dark variants
 * Each dark variant has its own Ant Design token overrides matching theme-vars.ts
 */

import type { ThemeConfig } from 'antd';
import type { DarkVariant } from './theme-vars';

// ── Shared tokens (typography, spacing, motion) ──

const sharedTokens = {
  fontFamily: "'Inter', 'Noto Sans Georgian', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 14,
  fontSizeHeading1: 24,
  fontSizeHeading2: 18,
  fontSizeHeading3: 16,
  fontSizeHeading4: 14,
  fontSizeHeading5: 14,
  fontWeightStrong: 600,
  lineHeight: 1.57,
  lineHeightHeading1: 1.33,
  lineHeightHeading2: 1.56,
  lineHeightHeading3: 1.5,
  padding: 12,
  paddingLG: 16,
  paddingXL: 24,
  paddingXS: 8,
  paddingXXS: 4,
  margin: 12,
  marginLG: 16,
  marginXL: 24,
  marginXS: 8,
  marginXXS: 4,
  borderRadius: 6,
  borderRadiusLG: 8,
  borderRadiusSM: 4,
  screenXL: 1400,
  screenXLMin: 1400,
  motionDurationMid: '0.2s',
  motionDurationSlow: '0.25s',
  motionEaseOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
};

const sharedComponents = {
  Button: {
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    paddingContentHorizontal: 16,
    paddingContentHorizontalLG: 24,
    paddingContentHorizontalSM: 12,
    fontWeight: 500,
  },
  Card: { paddingLG: 12, borderRadiusLG: 6 },
  Table: { cellPaddingBlock: 8, cellPaddingInline: 12, fontSize: 14 },
  Modal: {},
  Form: { labelFontSize: 14, labelHeight: 22, verticalLabelPadding: '0 0 4px' },
  Input: { controlHeight: 36, controlHeightLG: 44, controlHeightSM: 28, paddingBlock: 8, paddingInline: 12, borderRadius: 6 },
  Select: { controlHeight: 36, controlHeightLG: 44, controlHeightSM: 28 },
  Tag: { borderRadiusSM: 4 },
  Typography: { titleMarginTop: 0, titleMarginBottom: 8, fontSizeHeading1: 24, fontSizeHeading2: 18, fontSizeHeading3: 16, fontSizeHeading4: 14, fontSizeHeading5: 14, fontWeightStrong: 600 },
  Empty: { fontSize: 14 },
};

// ── Light Theme ──

export const themeLight: ThemeConfig = {
  token: {
    ...sharedTokens,
    colorPrimary: '#1565C0',
    colorLink: '#1565C0',
    colorLinkHover: '#0D47A1',
    colorLinkActive: '#0A3A7F',
    colorSuccess: '#27AE60',
    colorSuccessBg: '#E8F5E9',
    colorSuccessBorder: '#81C784',
    colorWarning: '#F39C12',
    colorWarningBg: '#FFF3E0',
    colorWarningBorder: '#FFB74D',
    colorError: '#E74C3C',
    colorErrorBg: '#FFEBEE',
    colorErrorBorder: '#EF5350',
    colorInfo: '#1565C0',
    colorInfoBg: '#E3F2FD',
    colorInfoBorder: '#64B5F6',
    colorText: '#1A1A1A',
    colorTextSecondary: '#4A4A4A',
    colorTextTertiary: '#9E9E9E',
    colorTextQuaternary: '#9E9E9E',
    colorBorder: '#E0E0E0',
    colorBorderSecondary: '#EEEEEE',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F7F8FA',
    colorBgSpotlight: '#FAFAFA',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.08)',
  },
  components: {
    ...sharedComponents,
    Button: { ...sharedComponents.Button, primaryColor: '#FFFFFF', colorPrimary: '#1565C0', colorPrimaryHover: '#0D47A1', colorPrimaryActive: '#0A3A7F', defaultBorderColor: '#D0D5DD', defaultColor: '#344054' },
    Table: { ...sharedComponents.Table, headerBg: '#F7F8FA', headerColor: '#1A1A1A', rowHoverBg: '#FAFBFC' },
    Form: { ...sharedComponents.Form, labelColor: '#4A4A4A' },
    Input: { ...sharedComponents.Input, activeBg: '#FFFFFF', activeBorderColor: '#1565C0' },
    Tag: { ...sharedComponents.Tag, defaultBg: '#F5F5F5', defaultColor: '#4A4A4A' },
    Empty: { ...sharedComponents.Empty, colorText: '#9E9E9E' },
    Pagination: { itemActiveBg: '#1565C0', itemLinkBg: '#FFFFFF' },
    Skeleton: { color: '#F5F5F5', colorGradientEnd: '#E0E0E0' },
    Tooltip: { colorBgSpotlight: '#333333', colorTextLightSolid: '#FFFFFF' },
  },
};

// ── Dark Theme helper ──

function makeDarkTheme(primary: string, primaryHover: string, primaryActive: string, bg: { container: string; elevated: string; layout: string; spotlight: string }, border: { primary: string; secondary: string }, text: { primary: string; secondary: string; tertiary: string }): ThemeConfig {
  return {
    token: {
      ...sharedTokens,
      colorPrimary: primary,
      colorLink: primary,
      colorLinkHover: primaryHover,
      colorLinkActive: primaryActive,
      colorSuccess: '#4CAF50',
      colorSuccessBg: 'rgba(76,175,80,0.12)',
      colorSuccessBorder: '#388E3C',
      colorWarning: '#FFA726',
      colorWarningBg: 'rgba(255,167,38,0.12)',
      colorWarningBorder: '#F57C00',
      colorError: '#EF5350',
      colorErrorBg: 'rgba(239,83,80,0.12)',
      colorErrorBorder: '#D32F2F',
      colorInfo: primary,
      colorInfoBg: `rgba(${hexToRgb(primary)},0.12)`,
      colorInfoBorder: primaryActive,
      colorText: text.primary,
      colorTextSecondary: text.secondary,
      colorTextTertiary: text.tertiary,
      colorTextQuaternary: text.tertiary,
      colorBorder: border.primary,
      colorBorderSecondary: border.secondary,
      colorBgContainer: bg.container,
      colorBgElevated: bg.elevated,
      colorBgLayout: bg.layout,
      colorBgSpotlight: bg.spotlight,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.3)',
    },
    components: {
      ...sharedComponents,
      Button: { ...sharedComponents.Button, primaryColor: '#FFFFFF', colorPrimary: primary, colorPrimaryHover: primaryHover, colorPrimaryActive: primaryActive, defaultBorderColor: border.primary, defaultColor: text.secondary },
      Table: { ...sharedComponents.Table, headerBg: bg.container, headerColor: text.primary, rowHoverBg: bg.elevated },
      Form: { ...sharedComponents.Form, labelColor: text.secondary },
      Input: { ...sharedComponents.Input, activeBg: bg.container, activeBorderColor: primary },
      Tag: { ...sharedComponents.Tag, defaultBg: bg.spotlight, defaultColor: text.secondary },
      Empty: { ...sharedComponents.Empty, colorText: text.tertiary },
      Pagination: { itemActiveBg: primary, itemLinkBg: bg.container },
      Skeleton: { color: bg.spotlight, colorGradientEnd: border.primary },
      Tooltip: { colorBgSpotlight: bg.elevated, colorTextLightSolid: text.primary },
    },
  };
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Midnight (GitHub Dark) ──
const themeMidnight = makeDarkTheme(
  '#58A6FF', '#79B8FF', '#3B8EED',
  { container: '#161B22', elevated: '#1C2128', layout: '#010409', spotlight: '#1C2128' },
  { primary: '#30363D', secondary: '#21262D' },
  { primary: '#E6EDF3', secondary: '#8B949E', tertiary: '#484F58' },
);

// ── Slate (Linear) ──
const themeSlate = makeDarkTheme(
  '#6E9FFF', '#8DB4FF', '#5088EE',
  { container: '#1E2235', elevated: '#252A40', layout: '#131620', spotlight: '#252A40' },
  { primary: '#2E3348', secondary: '#262B3E' },
  { primary: '#E2E4EA', secondary: '#9499AD', tertiary: '#5C6178' },
);

// ── Warm (Discord) ──
const themeWarm = makeDarkTheme(
  '#7289DA', '#8EA1E1', '#5B6EAE',
  { container: '#313338', elevated: '#383A40', layout: '#1E1F22', spotlight: '#383A40' },
  { primary: '#3F4147', secondary: '#393B40' },
  { primary: '#F2F3F5', secondary: '#B5BAC1', tertiary: '#6D6F78' },
);

export const darkThemes: Record<DarkVariant, ThemeConfig> = {
  midnight: themeMidnight,
  slate: themeSlate,
  warm: themeWarm,
};

// Default dark = midnight
export const themeDark = themeMidnight;

// Backward compat
export const themeV2 = themeLight;
export default themeLight;
