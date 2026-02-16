/**
 * DashboardWidget - Container component for dashboard widgets
 * Provides consistent styling, title bar, and resize handles
 */

import React from "react";
import { Card, Typography } from "antd";
import { DragOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  style?: React.CSSProperties;
  className?: string;
  headerExtra?: React.ReactNode;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  children,
  loading,
  style,
  className,
  headerExtra,
}) => {
  return (
    <Card
      className={`dashboard-widget ${className || ""}`}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
      styles={{
        body: {
          flex: 1,
          overflow: "auto",
          padding: "12px",
        },
        header: {
          padding: "8px 12px",
          minHeight: "auto",
        },
      }}
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <DragOutlined
            className="drag-handle"
            style={{ cursor: "grab", color: "#bfbfbf", fontSize: 'var(--fs-sm)' }}
          />
          <Text strong style={{ fontSize: 'var(--fs-caption)' }}>
            {title}
          </Text>
        </div>
      }
      extra={headerExtra}
      loading={loading}
    >
      {children}
    </Card>
  );
};

export default DashboardWidget;
