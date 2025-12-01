/**
 * NewestTicketCards Component (Widget 4A)
 * Compact card grid showing the newest tickets
 * Each card shows key info with company logo, priority, and time
 */

import React from "react";
import { Card, Spin, Empty } from "antd";
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
  if (p.includes("medium")) return "#1890ff";
  if (p.includes("low")) return "#52c41a";
  return "#8c8c8c";
};

// Priority background color
const getPriorityBgColor = (priority: string | null): string => {
  if (!priority) return "#fafafa";
  const p = priority.toLowerCase();
  if (p.includes("critical") || p.includes("highest")) return "#fff1f0";
  if (p.includes("high")) return "#fff7e6";
  if (p.includes("medium")) return "#e6f7ff";
  if (p.includes("low")) return "#f6ffed";
  return "#fafafa";
};

const NewestTicketCards: React.FC<Props> = ({
  tickets,
  loading = false,
  onTicketClick,
  maxCards = 8,
}) => {
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
          <span style={{ fontSize: 13 }}>📥 Newest Tickets</span>
          <span style={{ fontSize: 11, color: "#8c8c8c", fontWeight: 400 }}>
            {tickets.length} recent
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
          description="No recent tickets"
          style={{ padding: 24 }}
        />
      ) : (
        <div style={{ fontSize: 12 }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 70px 60px 50px",
              gap: 8,
              padding: "8px 12px",
              backgroundColor: "#fafafa",
              borderBottom: "1px solid #f0f0f0",
              fontWeight: 600,
              fontSize: 10,
              color: "#8c8c8c",
              textTransform: "uppercase",
            }}
          >
            <span>Ticket</span>
            <span>Title</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Age</span>
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
                borderBottom: "1px solid #f5f5f5",
                alignItems: "center",
              }}
              className="newest-ticket-row"
            >
              {/* Ticket Key */}
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#1890ff",
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
                  color: "#262626",
                }}
              >
                {ticket.title}
              </span>

              {/* Priority */}
              <span
                style={{
                  fontSize: 10,
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
                  fontSize: 10,
                  color: "#595959",
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
                  fontSize: 10,
                  color: "#8c8c8c",
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
            background-color: #f5f5f5 !important;
          }
        `}
      </style>
    </Card>
  );
};

export default NewestTicketCards;
