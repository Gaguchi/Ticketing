/**
 * KanbanFlowOverview Component
 * Visual representation of ticket flow across Kanban columns
 */

import React from "react";
import { Card, Tooltip, Spin } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { KanbanSummary } from "../../types/dashboard";

interface Props {
  data: KanbanSummary | null;
  loading?: boolean;
  onClick?: (columnId: number) => void;
}

const KanbanFlowOverview: React.FC<Props> = ({
  data,
  loading = false,
  onClick,
}) => {
  const { t } = useTranslation('dashboard');
  if (loading) {
    return (
      <Card
        title={t('kanban.workflowOverview')}
        size="small"
        style={{ borderRadius: 8 }}
        styles={{
          body: { display: "flex", justifyContent: "center", padding: 32 },
        }}
      >
        <Spin />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card
        title={t('kanban.workflowOverview')}
        size="small"
        style={{ borderRadius: 8 }}
        styles={{
          body: { color: "var(--color-text-muted)", textAlign: "center", padding: 32 },
        }}
      >
        {t('kanban.selectProject')}
      </Card>
    );
  }

  const maxCount = Math.max(...data.columns.map((c) => c.ticket_count), 1);

  return (
    <Card
      title={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{t('kanban.workflowOverview')}</span>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 400, color: "var(--color-text-muted)" }}>
            {t('kanban.totalTickets', { count: data.total_tickets })}
          </span>
        </div>
      }
      size="small"
      style={{ borderRadius: 8 }}
      styles={{ body: { padding: 16 } }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {data.columns.map((column, index) => {
          // Calculate relative height (min 20%, max 100%)
          const heightPercent = Math.max(
            20,
            (column.ticket_count / maxCount) * 100
          );

          return (
            <React.Fragment key={column.id}>
              <Tooltip
                title={t('kanban.ticketTooltip', { name: column.name, count: column.ticket_count })}
              >
                <div
                  onClick={() => onClick?.(column.id)}
                  style={{
                    flex: 1,
                    minWidth: 60,
                    maxWidth: 120,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: onClick ? "pointer" : "default",
                  }}
                >
                  {/* Column bar */}
                  <div
                    style={{
                      width: "100%",
                      height: 80,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "80%",
                        height: `${heightPercent}%`,
                        backgroundColor: column.color || "var(--color-primary)",
                        borderRadius: "4px 4px 0 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 'var(--fs-base)',
                        minHeight: 24,
                        transition: "all 0.2s",
                      }}
                    >
                      {column.ticket_count}
                    </div>
                  </div>

                  {/* Column name */}
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 'var(--fs-xs)',
                      color: "var(--color-text-secondary)",
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {column.name}
                  </div>
                </div>
              </Tooltip>

              {/* Arrow between columns */}
              {index < data.columns.length - 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: "var(--color-border)",
                    paddingBottom: 20,
                  }}
                >
                  <RightOutlined style={{ fontSize: 'var(--fs-sm)' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
};

export default KanbanFlowOverview;
