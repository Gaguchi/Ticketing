/**
 * CompanyHealthCard Component
 * Displays company health metrics in a card format with mini Kanban flow
 */

import React from "react";
import { Card, Avatar, Tag, Tooltip, Progress } from "antd";
import {
  WarningOutlined,
  UserDeleteOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import type { CompanyHealth } from "../../types/dashboard";

interface Props {
  company: CompanyHealth;
  onClick?: (companyId: number) => void;
  isExpanded?: boolean;
}

// Color mapping for common column names
const getColumnColor = (columnName: string): string => {
  const name = columnName.toLowerCase();
  if (
    name.includes("backlog") ||
    name.includes("to do") ||
    name.includes("open")
  ) {
    return "var(--color-text-muted)";
  }
  if (
    name.includes("progress") ||
    name.includes("doing") ||
    name.includes("dev")
  ) {
    return "var(--color-primary)";
  }
  if (name.includes("review") || name.includes("test") || name.includes("qa")) {
    return "#faad14";
  }
  if (
    name.includes("done") ||
    name.includes("complete") ||
    name.includes("closed")
  ) {
    return "#52c41a";
  }
  return "var(--color-border)";
};

// Mini Kanban flow visualization
const MiniKanbanFlow: React.FC<{ ticketsByStatus: Record<string, number> }> = ({
  ticketsByStatus,
}) => {
  const { t } = useTranslation('dashboard');
  const entries = Object.entries(ticketsByStatus);

  if (entries.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{t('company.noTickets')}</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
      }}
    >
      {entries.map(([status, count], index) => (
        <React.Fragment key={status}>
          <Tooltip
            title={t('kanban.ticketTooltip', { name: status, count })}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 4,
                backgroundColor: getColumnColor(status) + "20",
                border: `1px solid ${getColumnColor(status)}`,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              <span style={{ color: getColumnColor(status) }}>{count}</span>
            </div>
          </Tooltip>
          {index < entries.length - 1 && (
            <ArrowRightOutlined style={{ fontSize: 10, color: "var(--color-border)" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const CompanyHealthCard: React.FC<Props> = ({
  company,
  onClick,
  isExpanded = false,
}) => {
  const { t } = useTranslation('dashboard');
  const hasIssues = company.overdue_count > 0 || company.unassigned_count > 0;

  // Calculate flow health (percentage not in backlog/done)
  const entries = Object.entries(company.tickets_by_status);
  const inProgress = entries.reduce((sum, [status, count]) => {
    const name = status.toLowerCase();
    if (
      name.includes("done") ||
      name.includes("complete") ||
      name.includes("backlog")
    ) {
      return sum;
    }
    return sum + count;
  }, 0);
  const flowPercentage =
    company.total_tickets > 0
      ? Math.round((inProgress / company.total_tickets) * 100)
      : 0;

  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={() => onClick?.(company.id)}
      style={{
        borderRadius: 8,
        border: hasIssues ? "1px solid #ff4d4f40" : "1px solid var(--color-border-light)",
        height: isExpanded ? "auto" : 160,
      }}
      styles={{
        body: {
          padding: isExpanded ? 16 : 12,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header with logo and name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Avatar
          size={isExpanded ? 48 : 36}
          src={company.logo_thumbnail_url || company.logo_url}
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {!company.logo_url && (
            <FontAwesomeIcon
              icon={faBuilding}
              style={{ fontSize: isExpanded ? 20 : 14 }}
            />
          )}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: isExpanded ? 16 : 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {company.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {t('company.tickets', { count: company.total_tickets })}
          </div>
        </div>
      </div>

      {/* Mini Kanban Flow */}
      <div style={{ marginBottom: 12, flex: 1 }}>
        <MiniKanbanFlow ticketsByStatus={company.tickets_by_status} />
      </div>

      {/* Alert indicators */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {company.overdue_count > 0 && (
          <Tag color="error" icon={<WarningOutlined />} style={{ margin: 0 }}>
            {t('company.overdue', { count: company.overdue_count })}
          </Tag>
        )}
        {company.unassigned_count > 0 && (
          <Tag
            color="warning"
            icon={<UserDeleteOutlined />}
            style={{ margin: 0 }}
          >
            {t('company.unassigned', { count: company.unassigned_count })}
          </Tag>
        )}
      </div>

      {/* Expanded view extras */}
      {isExpanded && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
            {t('company.workInProgress')}
          </div>
          <Progress
            percent={flowPercentage}
            strokeColor="var(--color-primary)"
            trailColor="var(--color-border-light)"
            size="small"
          />

          {Object.keys(company.tickets_by_priority).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 4, fontSize: 12, color: "var(--color-text-muted)" }}>
                {t('company.byPriority')}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(company.tickets_by_priority).map(
                  ([priority, count]) => (
                    <Tag key={priority} style={{ margin: 0, fontSize: 11 }}>
                      {priority}: {count}
                    </Tag>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CompanyHealthCard;
