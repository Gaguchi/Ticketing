/**
 * NewestTickets Component
 * Displays the most recently created tickets
 */

import React from "react";
import { Card, List, Avatar, Tag, Tooltip, Spin, Empty } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faUser } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import type { DashboardTicket } from "../../types/dashboard";

interface Props {
  tickets: DashboardTicket[];
  loading?: boolean;
  onTicketClick?: (ticketId: number) => void;
  maxHeight?: number;
}

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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

const NewestTickets: React.FC<Props> = ({
  tickets,
  loading = false,
  onTicketClick,
  maxHeight = 400,
}) => {
  const { t } = useTranslation('dashboard');
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
          <span>{t('newest.newestTickets')}</span>
          <Tag color="blue" style={{ marginRight: 0 }}>
            {tickets.length}
          </Tag>
        </div>
      }
      size="small"
      style={{ borderRadius: 8 }}
      styles={{
        body: {
          padding: 0,
          maxHeight,
          overflowY: "auto",
        },
      }}
    >
      {loading ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin />
        </div>
      ) : tickets.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('newest.noTickets')}
          style={{ padding: 32 }}
        />
      ) : (
        <List
          dataSource={tickets}
          renderItem={(ticket) => (
            <List.Item
              onClick={() => onTicketClick?.(ticket.id)}
              style={{
                padding: "12px 16px",
                cursor: onTicketClick ? "pointer" : "default",
                borderBottom: "1px solid var(--color-border-light)",
              }}
              className="hover-highlight"
            >
              <div style={{ width: "100%" }}>
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                >
                  {/* Company avatar */}
                  <Avatar
                    size={32}
                    src={ticket.company?.logo_url}
                    style={{ backgroundColor: "var(--color-primary)", flexShrink: 0 }}
                  >
                    {ticket.company ? (
                      <FontAwesomeIcon
                        icon={faBuilding}
                        style={{ fontSize: 'var(--fs-sm)' }}
                      />
                    ) : (
                      <FontAwesomeIcon icon={faUser} style={{ fontSize: 'var(--fs-sm)' }} />
                    )}
                  </Avatar>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title and key */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 'var(--fs-caption)',
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ticket.title}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 'var(--fs-xs)',
                        color: "var(--color-text-muted)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontFamily: "monospace", fontSize: 'var(--fs-2xs)' }}>
                        {ticket.key}
                      </span>

                      {ticket.priority && (
                        <Tag
                          color={getPriorityColor(ticket.priority)}
                          style={{
                            margin: 0,
                            fontSize: 'var(--fs-2xs)',
                            lineHeight: "16px",
                            padding: "0 4px",
                          }}
                        >
                          {ticket.priority}
                        </Tag>
                      )}

                      {ticket.company && (
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {ticket.company.name}
                        </span>
                      )}

                      <Tooltip
                        title={new Date(ticket.created_at).toLocaleString()}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <ClockCircleOutlined style={{ fontSize: 'var(--fs-2xs)' }} />
                          {formatRelativeTime(ticket.created_at)}
                        </span>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Reporter avatar */}
                  {ticket.reporter && (
                    <Tooltip
                      title={t('newest.createdBy', { name: `${ticket.reporter.first_name} ${ticket.reporter.last_name}` })}
                    >
                      <Avatar
                        size={24}
                        style={{ backgroundColor: "#722ed1", flexShrink: 0 }}
                      >
                        {ticket.reporter.first_name?.[0] ||
                          ticket.reporter.username[0]}
                      </Avatar>
                    </Tooltip>
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default NewestTickets;
