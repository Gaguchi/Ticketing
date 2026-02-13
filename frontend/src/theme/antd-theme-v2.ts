/**
 * Ant Design Theme Configuration — V2
 * Unified visual system: one primary blue, cohesive surfaces
 */

import type { ThemeConfig } from 'antd';

export const themeV2: ThemeConfig = {
  token: {
    // ===== COLOR SYSTEM (unified around #1565C0) =====

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

    // Neutral Colors
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

    // ===== TYPOGRAPHY =====

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

    // ===== SPACING (Compact Density) =====

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

    // ===== BORDERS & SHADOWS =====

    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,

    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.08)',

    // ===== LAYOUT =====

    screenXL: 1400,
    screenXLMin: 1400,

    // ===== MOTION =====

    motionDurationMid: '0.2s',
    motionDurationSlow: '0.25s',
    motionEaseOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },

  components: {
    Button: {
      primaryColor: '#FFFFFF',
      colorPrimary: '#1565C0',
      colorPrimaryHover: '#0D47A1',
      colorPrimaryActive: '#0A3A7F',

      defaultBorderColor: '#D0D5DD',
      defaultColor: '#344054',

      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,

      paddingContentHorizontal: 16,
      paddingContentHorizontalLG: 24,
      paddingContentHorizontalSM: 12,

      fontWeight: 500,
    },

    Card: {
      boxShadowTertiary: '0 1px 3px rgba(0, 0, 0, 0.06)',
      paddingLG: 12,
      borderRadiusLG: 6,
    },

    Table: {
      headerBg: '#F7F8FA',
      headerColor: '#1A1A1A',

      rowHoverBg: '#FAFBFC',

      cellPaddingBlock: 8,
      cellPaddingInline: 12,

      fontSize: 14,
    },

    Modal: {},

    Form: {
      labelFontSize: 14,
      labelHeight: 22,
      labelColor: '#4A4A4A',
      verticalLabelPadding: '0 0 4px',
    },

    Input: {
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,

      paddingBlock: 8,
      paddingInline: 12,

      borderRadius: 6,

      activeBg: '#FFFFFF',
      activeBorderColor: '#1565C0',
    },

    Select: {
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
    },

    Tag: {
      defaultBg: '#F5F5F5',
      defaultColor: '#4A4A4A',
      borderRadiusSM: 4,
    },

    Typography: {
      titleMarginTop: 0,
      titleMarginBottom: 8,

      fontSizeHeading1: 24,
      fontSizeHeading2: 18,
      fontSizeHeading3: 16,
      fontSizeHeading4: 14,
      fontSizeHeading5: 14,

      fontWeightStrong: 600,
    },

    Empty: {
      fontSize: 14,
      colorText: '#9E9E9E',
    },

    Pagination: {
      itemActiveBg: '#1565C0',
      itemLinkBg: '#FFFFFF',
    },

    Skeleton: {
      color: '#F5F5F5',
      colorGradientEnd: '#E0E0E0',
    },

    Tooltip: {
      colorBgSpotlight: '#333333',
      colorTextLightSolid: '#FFFFFF',
    },
  },
};

export default themeV2;
