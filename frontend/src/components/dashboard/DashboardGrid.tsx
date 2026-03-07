/**
 * DashboardGrid - Drag and drop grid layout for dashboard widgets
 * Uses react-grid-layout for resizable, draggable widget management
 * Responsive: single-column on mobile, multi-column on desktop
 */

import React, { useState, useCallback, useMemo } from "react";
import { ResponsiveGridLayout, verticalCompactor, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import { Button, Tooltip, message } from "antd";
import { ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "../../hooks/useIsMobile";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Storage key prefix for layout persistence (user ID appended at runtime)
const LAYOUT_STORAGE_KEY_PREFIX = "dashboard_layout_v2_user_";

// Widget definitions with default positions
export interface WidgetConfig {
  i: string;
  title: string;
  component: React.ReactNode;
  defaultLayout: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
  };
}

// Generate responsive layouts from widget configs
const generateResponsiveLayouts = (widgets: WidgetConfig[]): ResponsiveLayouts => {
  const lg: LayoutItem[] = widgets.map((w) => ({
    i: w.i,
    x: w.defaultLayout.x,
    y: w.defaultLayout.y,
    w: w.defaultLayout.w,
    h: w.defaultLayout.h,
    minW: w.defaultLayout.minW || 2,
    minH: w.defaultLayout.minH || 2,
    maxW: w.defaultLayout.maxW,
    maxH: w.defaultLayout.maxH,
    static: w.defaultLayout.static,
  }));

  // Single column stacked layout for small screens
  const sm: LayoutItem[] = widgets.map((w, idx) => ({
    i: w.i,
    x: 0,
    y: idx * 3,
    w: 1,
    h: w.defaultLayout.h,
    minH: w.defaultLayout.minH || 2,
  }));

  return { lg, md: lg, sm, xs: sm };
};

interface DashboardGridProps {
  widgets: WidgetConfig[];
  userId?: number | string;
  loading?: boolean;
  onRefresh?: () => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  userId,
  loading,
  onRefresh,
}) => {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const isMobile = useIsMobile();
  const { width, containerRef } = useContainerWidth();

  // User-specific storage key
  const storageKey = useMemo(
    () => `${LAYOUT_STORAGE_KEY_PREFIX}${userId || 'guest'}`,
    [userId]
  );

  const defaultLayouts = useMemo(
    () => generateResponsiveLayouts(widgets),
    [widgets]
  );

  // Load saved layouts from localStorage (user-specific)
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate that all current widgets exist in saved layout
        const lgLayout = parsed.lg || parsed;
        const savedIds = new Set((Array.isArray(lgLayout) ? lgLayout : []).map((l: LayoutItem) => l.i));
        const allExist = widgets.every((w) => savedIds.has(w.i));
        if (allExist && parsed.lg) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load saved layout:", e);
    }
    return defaultLayouts;
  });

  // Save layouts on change
  const handleLayoutChange = useCallback((_currentLayout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem(storageKey, JSON.stringify(allLayouts));
    } catch (e) {
      console.warn("Failed to save layout:", e);
    }
  }, [storageKey]);

  // Reset to default layout
  const handleResetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(storageKey);
    message.success(t('grid.layoutReset'));
  }, [defaultLayouts, storageKey]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "12px 16px" : "16px 20px",
          borderBottom: "1px solid var(--color-border-light)",
          backgroundColor: "var(--color-bg-surface)",
        }}
      >
        <h1 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0 }}>{t('grid.dashboard')}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {!isMobile && (
            <Tooltip title={t('grid.resetLayout')}>
              <Button
                icon={<UndoOutlined />}
                onClick={handleResetLayout}
                size="small"
              />
            </Tooltip>
          )}
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={onRefresh}
            loading={loading}
            size="small"
          >
            {!isMobile && tCommon('btn.refresh')}
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      <div
        ref={containerRef}
        className="dashboard-grid-container"
        style={{
          flex: 1,
          overflow: "auto",
          padding: isMobile ? "12px" : "16px 20px",
          backgroundColor: "var(--color-bg-inset)",
        }}
      >
        {width > 0 && <ResponsiveGridLayout
          className="dashboard-grid"
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 992, md: 768, sm: 480, xs: 0 }}
          cols={{ lg: 12, md: 12, sm: 1, xs: 1 }}
          rowHeight={80}
          margin={isMobile ? [0, 12] as const : [16, 16] as const}
          containerPadding={[0, 0] as const}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ enabled: !isMobile, handle: ".drag-handle", bounded: false, threshold: 3 }}
          resizeConfig={{ enabled: !isMobile, handles: ["se"] }}
          compactor={verticalCompactor}
        >
          {widgets.map((widget) => (
            <div key={widget.i} className="dashboard-grid-item">
              {widget.component}
            </div>
          ))}
        </ResponsiveGridLayout>}
      </div>

      {/* Custom styles for grid */}
      <style>{`
        .dashboard-grid-item {
          background: transparent;
        }
        .dashboard-grid-item > * {
          height: 100%;
        }
        .react-grid-item.react-grid-placeholder {
          background: var(--color-primary) !important;
          opacity: 0.2;
          border-radius: 4px;
        }
        .react-grid-item > .react-resizable-handle {
          background-image: none;
          width: 16px;
          height: 16px;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: '';
          position: absolute;
          right: 4px;
          bottom: 4px;
          width: 8px;
          height: 8px;
          border-right: 2px solid var(--color-text-muted);
          border-bottom: 2px solid var(--color-text-muted);
        }
        .react-grid-item:hover > .react-resizable-handle::after {
          border-color: var(--color-text-secondary);
        }
        .drag-handle {
          cursor: grab !important;
        }
        .drag-handle:active {
          cursor: grabbing !important;
        }
        .react-grid-item.react-draggable-dragging {
          z-index: 100;
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
};

export default DashboardGrid;
