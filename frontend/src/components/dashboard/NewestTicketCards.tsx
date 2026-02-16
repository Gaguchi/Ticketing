/**
 * NewestTicketCards Component (Widget 4A)
 * Compact card grid showing the newest tickets
 * Each card shows key info with company logo, priority, and time
 */

import React from "react";
import { Card, Spin, Empty } from "antd";
import { useTranslation } from "react-i18next";
import type { DashboardTicket } from "../../types/dashboard";

interface Props {
  tickets: DashboardTicket[];
  loading?: boolean;
  onTicketClick?: (ticketId: number) => void;
  maxCards?: number;
}

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Priority color mapping
const getPriorityColor = (priority: string | null): string => {
  if (!priority) return "default";
  const p = priority.toLowerCase();
  if (p.includes("critical") || p.includes("highest")) return "#ff4d4f";
  if (p.includes("high")) return "#fa8c16";
  if (p.includes("medium")) return "var(--color-primary)";
  if (p.includes("low")) return "#52c41a";
  return "var(--color-text-muted)";
};

// Priority background color
const getPriorityBgColor = (priority: string | null): string => {
  if (!priority) return "var(--color-bg-sidebar)";
  const p = priority.toLowerCase();
  if (p.includes("critical") || p.includes("highest")) return "var(--color-tint-danger-bg)";
  if (p.includes("high")) return "var(--color-tint-warning-bg)";
  if (p.includes("medium")) return "var(--color-primary-light)";
  if (p.includes("low")) return "var(--color-tint-success-bg)";
  return "var(--color-bg-sidebar)";
};

const NewestTicketCards: React.FC<Props> = ({
  tickets,
  loading = false,
  onTicketClick,
  maxCards = 8,
}) => {
  const { t } = useTranslation('dashboard');
  const displayTickets = tickets.slice(0, maxCards);

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
          <span style={{ fontSize: 'var(--fs-caption)' }}>{t('newest.newestTickets')}</span>
          <span style={{ fontSize: 'var(--fs-xs)', color: "var(--color-text-muted)", fontWeight: 400 }}>
            {t('newest.recent', { count: tickets.length })}
          </span>
        </div>
      }
      size="small"
      style={{ borderRadius: 8, height: "100%" }}
      styles={{
        body: { padding: 0, height: "calc(100% - 40px)", overflow: "auto" },
      }}
    >
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Spin />
        </div>
      ) : displayTickets.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('newest.noTickets')}
          style={{ padding: 24 }}
        />
      ) : (
        <div style={{ fontSize: 'var(--fs-sm)' }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 70px 60px 50px",
              gap: 8,
              padding: "8px 12px",
              backgroundColor: "var(--color-bg-sidebar)",
              borderBottom: "1px solid var(--color-border-light)",
              fontWeight: 600,
              fontSize: 'var(--fs-2xs)',
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
            }}
          >
            <span>{t('newest.ticket')}</span>
            <span>{t('newest.title')}</span>
            <span>{t('newest.priority')}</span>
            <span>{t('newest.status')}</span>
            <span>{t('newest.age')}</span>
          </div>

          {/* Table Rows */}
          {displayTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => onTicketClick?.(ticket.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr 70px 60px 50px",
                gap: 8,
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid var(--color-bg-inset)",
                alignItems: "center",
              }}
              className="newest-ticket-row"
            >
              {/* Ticket Key */}
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 'var(--fs-xs)',
                  color: "var(--color-primary)",
                  fontWeight: 500,
                }}
              >
                {ticket.key}
              </span>

              {/* Title */}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--color-text-primary)",
                }}
              >
                {ticket.title}
              </span>

              {/* Priority */}
              <span
                style={{
                  fontSize: 'var(--fs-2xs)',
                  padding: "2px 6px",
                  borderRadius: 4,
                  backgroundColor: getPriorityBgColor(ticket.priority),
                  color: getPriorityColor(ticket.priority),
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                {ticket.priority || "-"}
              </span>

              {/* Status */}
              <span
                style={{
                  fontSize: 'var(--fs-2xs)',
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ticket.status || "Open"}
              </span>

              {/* Age */}
              <span
                style={{
                  fontSize: 'var(--fs-2xs)',
                  color: "var(--color-text-muted)",
                  textAlign: "right",
                }}
              >
                {formatRelativeTime(ticket.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      <style>
        {`
          .newest-ticket-row:hover {
            background-color: var(--color-bg-inset) !important;
          }
        `}
      </style>
    </Card>
  );
};

export default NewestTicketCards;
