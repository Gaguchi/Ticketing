/**
 * AttentionNeeded Component
 * Displays tickets requiring attention: overdue, unassigned critical, stale
 */

import React, { useState } from "react";
import {
  Card,
  List,
  Avatar,
  Tag,
  Tooltip,
  Spin,
  Empty,
  Segmented,
  Badge,
} from "antd";
import {
  WarningOutlined,
  UserDeleteOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import type {
  AttentionNeeded as AttentionNeededData,
  DashboardTicket,
} from "../../types/dashboard";

interface Props {
  data: AttentionNeededData | null;
  loading?: boolean;
  onTicketClick?: (ticketId: number) => void;
  maxHeight?: number;
}

type ViewType = "overdue" | "unassigned" | "stale";

// Format relative time for stale/overdue
const formatTimeDiff = (dateString: string, isOverdue: boolean): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = isOverdue
    ? now.getTime() - date.getTime()
    : date.getTime() - now.getTime();
  const diffDays = Math.floor(Math.abs(diffMs) / 86400000);
  const diffHours = Math.floor(Math.abs(diffMs) / 3600000);

  if (diffHours < 24) return `${diffHours}h ${isOverdue ? "overdue" : "ago"}`;
  return `${diffDays}d ${isOverdue ? "overdue" : "ago"}`;
};

// Priority color mapping
const getPriorityColor = (priority: string | null): string => {
  if (!priority) return "default";
  const p = priority.toLowerCase();
  if (p.includes("critical") || p.includes("highest")) return "red";
  if (p.includes("high")) return "orange";
  if (p.includes("medium")) return "blue";
  if (p.includes("low")) return "green";
  return "default";
};

const TicketListItem: React.FC<{
  ticket: DashboardTicket;
  type: ViewType;
  onClick?: () => void;
}> = ({ ticket, type, onClick }) => {
  const { t } = useTranslation('dashboard');
  return (
  <List.Item
    onClick={onClick}
    style={{
      padding: "10px 12px",
      cursor: onClick ? "pointer" : "default",
      borderBottom: "1px solid var(--color-border-light)",
    }}
    className="hover-highlight"
  >
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {/* Company avatar */}
        <Avatar
          size={28}
          src={ticket.company?.logo_url}
          style={{ backgroundColor: "var(--color-primary)", flexShrink: 0 }}
        >
          {ticket.company && (
            <FontAwesomeIcon icon={faBuilding} style={{ fontSize: 'var(--fs-2xs)' }} />
          )}
        </Avatar>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div
            style={{
              fontWeight: 500,
              fontSize: 'var(--fs-sm)',
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 2,
            }}
          >
            {ticket.title}
          </div>

          {/* Meta row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 'var(--fs-2xs)',
              color: "var(--color-text-muted)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontFamily: "monospace" }}>{ticket.key}</span>

            {ticket.priority && (
              <Tag
                color={getPriorityColor(ticket.priority)}
                style={{
                  margin: 0,
                  fontSize: 'var(--fs-2xs)',
                  lineHeight: "14px",
                  padding: "0 3px",
                }}
              >
                {ticket.priority}
              </Tag>
            )}

            {type === "overdue" && ticket.due_date && (
              <Tag
                color="error"
                style={{
                  margin: 0,
                  fontSize: 'var(--fs-2xs)',
                  lineHeight: "14px",
                  padding: "0 3px",
                }}
              >
                {formatTimeDiff(ticket.due_date, true)}
              </Tag>
            )}

            {type === "stale" && ticket.updated_at && (
              <Tag
                color="warning"
                style={{
                  margin: 0,
                  fontSize: 'var(--fs-2xs)',
                  lineHeight: "14px",
                  padding: "0 3px",
                }}
              >
                {t('attention.noUpdates', { time: formatTimeDiff(ticket.updated_at, false) })}
              </Tag>
            )}
          </div>
        </div>

        {/* Assignee avatar (if any) */}
        {ticket.assignee && (
          <Tooltip
            title={t('attention.assignedTo', { name: `${ticket.assignee.first_name} ${ticket.assignee.last_name}` })}
          >
            <Avatar
              size={22}
              style={{ backgroundColor: "#52c41a", flexShrink: 0 }}
            >
              {ticket.assignee.first_name?.[0] || ticket.assignee.username[0]}
            </Avatar>
          </Tooltip>
        )}
      </div>
    </div>
  </List.Item>
  );
};

const AttentionNeeded: React.FC<Props> = ({
  data,
  loading = false,
  onTicketClick,
  maxHeight = 350,
}) => {
  const { t } = useTranslation('dashboard');
  const [activeView, setActiveView] = useState<ViewType>("overdue");

  const getTickets = (): DashboardTicket[] => {
    if (!data) return [];
    switch (activeView) {
      case "overdue":
        return data.overdue;
      case "unassigned":
        return data.unassigned_critical;
      case "stale":
        return data.stale;
      default:
        return [];
    }
  };

  const overdueCount = data?.overdue.length || 0;
  const unassignedCount = data?.unassigned_critical.length || 0;
  const staleCount = data?.stale.length || 0;
  const totalCount = overdueCount + unassignedCount + staleCount;

  const tickets = getTickets();

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
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <WarningOutlined
              style={{ color: totalCount > 0 ? "#ff4d4f" : "#52c41a" }}
            />
            {t('attention.needsAttention')}
          </span>
          {totalCount > 0 && (
            <Badge count={totalCount} style={{ backgroundColor: "#ff4d4f" }} />
          )}
        </div>
      }
      size="small"
      style={{ borderRadius: 8 }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Tab selector */}
      <div
        style={{ padding: "12px 12px 0", borderBottom: "1px solid var(--color-border-light)" }}
      >
        <Segmented
          block
          size="small"
          value={activeView}
          onChange={(val) => setActiveView(val as ViewType)}
          options={[
            {
              label: (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 'var(--fs-xs)',
                  }}
                >
                  <ClockCircleOutlined />
                  {t('attention.overdue')}
                  {overdueCount > 0 && (
                    <Badge
                      count={overdueCount}
                      size="small"
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </span>
              ),
              value: "overdue",
            },
            {
              label: (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 'var(--fs-xs)',
                  }}
                >
                  <UserDeleteOutlined />
                  {t('attention.unassigned')}
                  {unassignedCount > 0 && (
                    <Badge
                      count={unassignedCount}
                      size="small"
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </span>
              ),
              value: "unassigned",
            },
            {
              label: (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 'var(--fs-xs)',
                  }}
                >
                  <FieldTimeOutlined />
                  {t('attention.stale')}
                  {staleCount > 0 && (
                    <Badge
                      count={staleCount}
                      size="small"
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </span>
              ),
              value: "stale",
            },
          ]}
        />
      </div>

      {/* Ticket list */}
      <div style={{ maxHeight, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Spin size="small" />
          </div>
        ) : tickets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              activeView === "overdue" ? t('attention.noOverdue') :
              activeView === "unassigned" ? t('attention.noUnassignedCritical') :
              t('attention.noStale')
            }
            style={{ padding: "24px 16px" }}
          />
        ) : (
          <List
            dataSource={tickets}
            renderItem={(ticket) => (
              <TicketListItem
                ticket={ticket}
                type={activeView}
                onClick={() => onTicketClick?.(ticket.id)}
              />
            )}
          />
        )}
      </div>
    </Card>
  );
};

export default AttentionNeeded;
