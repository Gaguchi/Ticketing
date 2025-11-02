/**
 * Ant Design Theme Configuration
 * Based on Design Bible v1.0
 * 
 * Philosophy: Professional, minimalist, data-first
 */

import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    // ===== COLOR SYSTEM =====
    
    // Primary Brand Color (Slate Blue-Gray)
    colorPrimary: '#2C3E50',
    
    // Accent Color (Burnt Orange) - Used sparingly
    colorLink: '#E67E22',
    colorLinkHover: '#D35400',
    colorLinkActive: '#BA4A00',
    
    // Success (Muted Green)
    colorSuccess: '#27AE60',
    colorSuccessBg: '#E8F5E9',
    colorSuccessBorder: '#81C784',
    
    // Warning (Amber)
    colorWarning: '#F39C12',
    colorWarningBg: '#FFF3E0',
    colorWarningBorder: '#FFB74D',
    
    // Error (Muted Red)
    colorError: '#E74C3C',
    colorErrorBg: '#FFEBEE',
    colorErrorBorder: '#EF5350',
    
    // Info (Steel Blue) - Minimal use
    colorInfo: '#3498DB',
    colorInfoBg: '#E3F2FD',
    colorInfoBorder: '#64B5F6',
    
    // Neutral Colors
    colorText: '#1A1A1A',           // Gray 900 - Primary text
    colorTextSecondary: '#4A4A4A',  // Gray 700 - Secondary text
    colorTextTertiary: '#9E9E9E',   // Gray 500 - Tertiary text
    colorTextQuaternary: '#9E9E9E', // Gray 500 - Icons
    
    colorBorder: '#E0E0E0',         // Gray 300 - Borders
    colorBorderSecondary: '#E0E0E0',
    
    colorBgContainer: '#FFFFFF',    // White - Cards
    colorBgElevated: '#FFFFFF',     // White - Modals, dropdowns
    colorBgLayout: '#F5F5F5',       // Gray 100 - Page background
    colorBgSpotlight: '#FAFAFA',    // Subtle hover states
    
    // ===== TYPOGRAPHY =====
    
    fontFamily: "'Inter', 'BPG Arial', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    
    fontSize: 14,           // Body text
    fontSizeHeading1: 24,   // H1
    fontSizeHeading2: 18,   // H2  
    fontSizeHeading3: 16,   // H3
    fontSizeHeading4: 14,   // H4
    fontSizeHeading5: 14,   // H5
    
    fontWeightStrong: 600,  // Semibold for headers
    
    lineHeight: 1.57,       // 22px for 14px text
    lineHeightHeading1: 1.33,
    lineHeightHeading2: 1.56,
    lineHeightHeading3: 1.5,
    
    // ===== SPACING (Compact Density) =====
    
    padding: 12,            // Card padding (compact)
    paddingLG: 16,          // Section padding
    paddingXL: 24,          // Page padding
    paddingXS: 8,           // Small gaps
    paddingXXS: 4,          // Micro spacing
    
    margin: 12,
    marginLG: 16,
    marginXL: 24,
    marginXS: 8,
    marginXXS: 4,
    
    // ===== BORDERS & SHADOWS =====
    
    borderRadius: 6,        // Default corner radius
    borderRadiusLG: 8,      // Large elements
    borderRadiusSM: 4,      // Small elements
    
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',           // Subtle elevation
    boxShadowSecondary: '0 4px 8px rgba(0, 0, 0, 0.08)',  // Material elevation
    
    // ===== LAYOUT =====
    
    screenXL: 1400,         // Max content width
    screenXLMin: 1400,
    
    // ===== MOTION (Subtle) =====
    
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.25s',
    motionEaseOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
  
  components: {
    // ===== BUTTON =====
    Button: {
      primaryColor: '#FFFFFF',
      colorPrimary: '#E67E22',        // Burnt Orange
      colorPrimaryHover: '#D35400',
      colorPrimaryActive: '#BA4A00',
      
      defaultBorderColor: '#9E9E9E',  // Gray 500
      defaultColor: '#4A4A4A',        // Gray 700
      
      controlHeight: 36,              // Default button height
      controlHeightLG: 44,            // Large buttons
      controlHeightSM: 28,            // Small buttons
      
      paddingContentHorizontal: 16,
      paddingContentHorizontalLG: 24,
      paddingContentHorizontalSM: 12,
      
      fontWeight: 500,                // Medium weight
    },
    
    // ===== CARD =====
    Card: {
      boxShadowTertiary: '0 2px 4px rgba(0, 0, 0, 0.06)',
      paddingLG: 12,                  // Compact card padding
      borderRadiusLG: 6,
    },
    
    // ===== TABLE =====
    Table: {
      headerBg: '#F5F5F5',            // Gray 100
      headerColor: '#1A1A1A',
      headerFontWeight: 600,          // Semibold
      
      rowHoverBg: '#FAFAFA',
      
      cellPaddingBlock: 8,            // Compact rows
      cellPaddingInline: 12,
      
      fontSize: 14,
      lineHeight: 1.57,
    },
    
    // ===== MODAL =====
    Modal: {
      headerBg: '#F5F5F5',
      headerPadding: '16px 24px',
      bodyPadding: 24,
      footerBg: '#FAFAFA',
      footerPadding: '16px 24px',
      
      titleFontSize: 18,
      titleLineHeight: 1.56,
      titleFontWeight: 600,
    },
    
    // ===== FORM =====
    Form: {
      labelFontSize: 14,
      labelHeight: 22,
      labelColor: '#4A4A4A',          // Gray 700
      verticalLabelPadding: '0 0 4px',
    },
    
    // ===== INPUT =====
    Input: {
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      
      paddingBlock: 8,
      paddingInline: 12,
      
      borderRadius: 6,
      
      activeBg: '#FFFFFF',
      activeBorderColor: '#2C3E50',   // Primary on focus
    },
    
    // ===== SELECT =====
    Select: {
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
    },
    
    // ===== TAG =====
    Tag: {
      defaultBg: '#F5F5F5',           // Gray 100
      defaultColor: '#4A4A4A',        // Gray 700
      borderRadiusSM: 4,
    },
    
    // ===== TYPOGRAPHY =====
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
    
    // ===== EMPTY STATE =====
    Empty: {
      fontSize: 14,
      colorText: '#9E9E9E',          // Gray 500
    },
    
    // ===== PAGINATION =====
    Pagination: {
      itemActiveBg: '#2C3E50',       // Primary
      itemLinkBg: '#FFFFFF',
    },
    
    // ===== SKELETON (Loading) =====
    Skeleton: {
      color: '#F5F5F5',              // Gray 100
      colorGradientEnd: '#E0E0E0',   // Gray 300
    },
  },
};

export default theme;
