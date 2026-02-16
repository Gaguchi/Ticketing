/**
 * KanbanPipeline Component (Widget 2D)
 * Funnel-style visualization showing ticket flow through workflow stages
 * Width of each stage is based on its percentage of total tickets
 */

import React from "react";
import { Card, Tooltip, Spin, Empty } from "antd";
import { useTranslation } from "react-i18next";
import type { KanbanSummary } from "../../types/dashboard";

interface Props {
  data: KanbanSummary | null;
  loading?: boolean;
  onColumnClick?: (columnId: number) => void;
}

const KanbanPipeline: React.FC<Props> = ({
  data,
  loading = false,
  onColumnClick,
}) => {
  const { t } = useTranslation('dashboard');
  if (loading) {
    return (
      <Card
        size="small"
        style={{ borderRadius: 8, height: "100%" }}
        styles={{
          body: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
            height: "100%",
          },
        }}
      >
        <Spin />
      </Card>
    );
  }

  if (!data || data.columns.length === 0) {
    return (
      <Card
        size="small"
        style={{ borderRadius: 8, height: "100%" }}
        styles={{
          body: { padding: 24, height: "100%" },
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('kanban.noWorkflowData')}
        />
      </Card>
    );
  }

  // Calculate percentages for funnel visualization
  const totalTickets = data.columns.reduce((sum, c) => sum + c.ticket_count, 0);

  return (
    <Card
      size="small"
      style={{ borderRadius: 8, height: "100%" }}
      styles={{
        body: {
          padding: 16,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-caption)' }}>{t('pipeline.pipeline')}</span>
        <span style={{ fontSize: 'var(--fs-xs)', color: "var(--color-text-muted)" }}>
          {t('pipeline.tickets', { count: data.total_tickets })}
        </span>
      </div>

      {/* Funnel Visualization - width based on percentage */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          flex: 1,
        }}
      >
        {data.columns.map((column, index) => {
          const percentage =
            totalTickets > 0 ? (column.ticket_count / totalTickets) * 100 : 0;

          // Width is directly based on percentage
          // Minimum width 25% so small values are still visible
          // Maximum width 100%
          const minWidth = 25;
          const maxWidth = 100;
          const finalWidth = Math.max(
            minWidth,
            Math.min(maxWidth, percentage + minWidth)
          );

          const isFirst = index === 0;
          const isLast = index === data.columns.length - 1;

          return (
            <Tooltip
              key={column.id}
              title={`${t('kanban.ticketTooltip', { name: column.name, count: column.ticket_count })} (${Math.round(percentage)}%)`}
            >
              <div
                onClick={() => onColumnClick?.(column.id)}
                style={{
                  width: `${finalWidth}%`,
                  cursor: onColumnClick ? "pointer" : "default",
                  transition: "all 0.3s ease",
                }}
                className="funnel-stage"
              >
                {/* Funnel stage bar */}
                <div
                  style={{
                    backgroundColor: column.color || "var(--color-primary)",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderRadius: isFirst
                      ? "6px 6px 0 0"
                      : isLast
                      ? "0 0 6px 6px"
                      : 0,
                    minHeight: 36,
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: 500,
                      fontSize: 'var(--fs-sm)',
                      textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {column.name}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 'var(--fs-base)',
                        textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}
                    >
                      {column.ticket_count}
                    </span>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 'var(--fs-2xs)',
                      }}
                    >
                      ({Math.round(percentage)}%)
                    </span>
                  </div>
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          marginTop: 12,
          paddingTop: 8,
          borderTop: "1px solid var(--color-border-light)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: "var(--color-primary)" }}>
            {data.columns
              .filter((c) => c.name.toLowerCase() !== "done")
              .reduce((sum, c) => sum + c.ticket_count, 0)}
          </div>
          <div style={{ fontSize: 'var(--fs-2xs)', color: "var(--color-text-muted)" }}>{t('pipeline.active')}</div>
        </div>
        <div
          style={{
            width: 1,
            backgroundColor: "var(--color-border-light)",
          }}
        />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: "var(--color-tint-success-border)" }}>
            {data.columns.find((c) => c.name.toLowerCase() === "done")
              ?.ticket_count || 0}
          </div>
          <div style={{ fontSize: 'var(--fs-2xs)', color: "var(--color-text-muted)" }}>{t('pipeline.done')}</div>
        </div>
      </div>

      <style>
        {`
          .funnel-stage:hover {
            filter: brightness(1.1);
          }
        `}
      </style>
    </Card>
  );
};

export default KanbanPipeline;
