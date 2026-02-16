/**
 * DashboardGrid - Drag and drop grid layout for dashboard widgets
 * Uses react-grid-layout for resizable, draggable widget management
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { Button, Tooltip, message } from "antd";
import { ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Cast default export to any to bypass type definition issues with props
const GridLayoutAny = GridLayout as any;

// Storage key prefix for layout persistence (user ID appended at runtime)
const LAYOUT_STORAGE_KEY_PREFIX = "dashboard_layout_v1_user_";

// Layout item type (matches react-grid-layout's internal type)
interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

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

// Generate default layout from widget configs
const generateDefaultLayout = (widgets: WidgetConfig[]): LayoutItem[] => {
  return widgets.map((w) => ({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // User-specific storage key
  const storageKey = useMemo(
    () => `${LAYOUT_STORAGE_KEY_PREFIX}${userId || 'guest'}`,
    [userId]
  );

  // Measure container width for responsive grid
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 40); // Account for padding
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const defaultLayout = useMemo(
    () => generateDefaultLayout(widgets),
    [widgets]
  );

  // Load saved layout from localStorage (user-specific)
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as LayoutItem[];
        // Validate that all current widgets exist in saved layout
        const savedIds = new Set(parsed.map((l) => l.i));
        const allExist = widgets.every((w) => savedIds.has(w.i));
        if (allExist) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load saved layout:", e);
    }
    return defaultLayout;
  });

  // Save layout on change
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout(newLayout as LayoutItem[]);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    } catch (e) {
      console.warn("Failed to save layout:", e);
    }
  }, [storageKey]);

  // Reset to default layout
  const handleResetLayout = useCallback(() => {
    setLayout(defaultLayout);
    localStorage.removeItem(storageKey);
    message.success(t('grid.layoutReset'));
  }, [defaultLayout, storageKey]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border-light)",
          backgroundColor: "var(--color-bg-surface)",
        }}
      >
        <h1 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0 }}>{t('grid.dashboard')}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Tooltip title={t('grid.resetLayout')}>
            <Button
              icon={<UndoOutlined />}
              onClick={handleResetLayout}
              size="small"
            />
          </Tooltip>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={onRefresh}
            loading={loading}
            size="small"
          >
            {tCommon('btn.refresh')}
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 20px",
          backgroundColor: "var(--color-bg-inset)",
        }}
      >
        <GridLayoutAny
          className="dashboard-grid"
          layout={layout}
          cols={12}
          rowHeight={80}
          width={containerWidth}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          useCSSTransforms={true}
          isResizable={true}
          isDraggable={true}
          compactType="vertical"
        >
          {widgets.map((widget) => (
            <div key={widget.i} className="dashboard-grid-item">
              {widget.component}
            </div>
          ))}
        </GridLayoutAny>
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
