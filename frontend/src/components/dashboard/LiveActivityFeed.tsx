/**
 * LiveActivityFeed Component
 * Real-time activity ticker showing recent ticket changes
 */

import React, { useEffect, useRef } from "react";
import { Card, List, Tooltip, Spin, Empty, Tag } from "antd";
import {
  EditOutlined,
  UserSwitchOutlined,
  SwapOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { ActivityEntry } from "../../types/dashboard";

interface Props {
  activities: ActivityEntry[];
  loading?: boolean;
  onTicketClick?: (ticketId: number) => void;
  maxHeight?: number;
  autoScroll?: boolean;
}

// Get icon based on field changed
const getActivityIcon = (field: string) => {
  const f = field.toLowerCase();
  if (f.includes("assignee")) return <UserSwitchOutlined />;
  if (f.includes("status") || f.includes("column")) return <SwapOutlined />;
  if (f.includes("created") || f === "new") return <PlusOutlined />;
  if (f.includes("delete")) return <DeleteOutlined />;
  return <EditOutlined />;
};

// Get color based on field changed
const getActivityColor = (field: string): string => {
  const f = field.toLowerCase();
  if (f.includes("assignee")) return "#722ed1";
  if (f.includes("status") || f.includes("column")) return "var(--color-primary)";
  if (f.includes("created") || f === "new") return "#52c41a";
  if (f.includes("priority")) return "#fa8c16";
  if (f.includes("delete")) return "#ff4d4f";
  return "var(--color-text-muted)";
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Format field name for display
const formatFieldName = (field: string): string => {
  // Map internal field names to user-friendly display names
  const fieldMappings: Record<string, string> = {
    column: "Status",
    assignees: "Assignee",
  };

  const lowerField = field.toLowerCase();
  if (fieldMappings[lowerField]) {
    return fieldMappings[lowerField];
  }

  return field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

// Truncate value for display
const truncateValue = (value: string | null, maxLength = 20): string => {
  if (!value) return "(empty)";
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength) + "...";
};

const LiveActivityFeed: React.FC<Props> = ({
  activities,
  loading = false,
  onTicketClick,
  maxHeight = 400,
  autoScroll = false,
}) => {
  const { t } = useTranslation('dashboard');
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new activities arrive
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [activities, autoScroll]);

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              backgroundColor: "#52c41a",
              borderRadius: "50%",
              animation: "pulse 2s infinite",
            }}
          />
          {t('activity.liveActivity')}
        </div>
      }
      size="small"
      style={{ borderRadius: 8 }}
      styles={{ body: { padding: 0 } }}
      extra={
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {t('activity.recent', { count: activities.length })}
        </span>
      }
    >
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .activity-item:hover {
            background-color: var(--color-bg-sidebar);
          }
        `}
      </style>

      <div ref={listRef} style={{ maxHeight, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Spin size="small" />
          </div>
        ) : activities.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('activity.noActivity')}
            style={{ padding: 32 }}
          />
        ) : (
          <List
            dataSource={activities}
            renderItem={(activity) => (
              <List.Item
                onClick={() => onTicketClick?.(activity.ticket.id)}
                className="activity-item"
                style={{
                  padding: "10px 12px",
                  cursor: onTicketClick ? "pointer" : "default",
                  borderBottom: "1px solid var(--color-bg-inset)",
                }}
              >
                <div style={{ display: "flex", gap: 10, width: "100%" }}>
                  {/* Activity icon */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: getActivityColor(activity.field) + "15",
                      color: getActivityColor(activity.field),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {getActivityIcon(activity.field)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* User and action */}
                    <div style={{ fontSize: 12, marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>
                        {activity.changed_by
                          ? `${
                              activity.changed_by.first_name ||
                              activity.changed_by.username
                            }`
                          : t('activity.system')}
                      </span>
                      <span style={{ color: "var(--color-text-muted)" }}> {t('activity.updated')} </span>
                      <span style={{ fontWeight: 500 }}>
                        {formatFieldName(activity.field)}
                      </span>
                    </div>

                    {/* Ticket info */}
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontFamily: "monospace" }}>
                        {activity.ticket.key}
                      </span>
                      <span style={{ margin: "0 4px" }}>·</span>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {activity.ticket.title}
                      </span>
                    </div>

                    {/* Value change */}
                    {(activity.old_value || activity.new_value) && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10,
                        }}
                      >
                        <Tooltip title={activity.old_value || "(empty)"}>
                          <Tag
                            style={{
                              margin: 0,
                              maxWidth: 80,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              backgroundColor: "var(--color-bg-inset)",
                              border: "none",
                            }}
                          >
                            {truncateValue(activity.old_value, 12)}
                          </Tag>
                        </Tooltip>
                        <span style={{ color: "var(--color-text-muted)" }}>→</span>
                        <Tooltip title={activity.new_value || "(empty)"}>
                          <Tag
                            style={{
                              margin: 0,
                              maxWidth: 80,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              backgroundColor:
                                getActivityColor(activity.field) + "15",
                              color: getActivityColor(activity.field),
                              border: "none",
                            }}
                          >
                            {truncateValue(activity.new_value, 12)}
                          </Tag>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <Tooltip
                    title={new Date(activity.changed_at).toLocaleString()}
                  >
                    <span
                      style={{ fontSize: 10, color: "#bfbfbf", flexShrink: 0 }}
                    >
                      {formatRelativeTime(activity.changed_at)}
                    </span>
                  </Tooltip>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
};

export default LiveActivityFeed;
