/**
 * TimelineActivityFeed Component (Widget 5B)
 * Timeline-style activity feed with connecting lines and grouped by time
 */

import React from "react";
import { Card, Tooltip, Spin, Empty, Avatar } from "antd";
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Format field name for display
const formatFieldName = (field: string): string => {
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

// Group activities by time periods (uses translation keys as labels)
const groupActivitiesByTime = (
  activities: ActivityEntry[]
): {
  labelKey: string;
  activities: ActivityEntry[];
}[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { labelKey: string; activities: ActivityEntry[] }[] = [
    { labelKey: "activity.today", activities: [] },
    { labelKey: "activity.yesterday", activities: [] },
    { labelKey: "activity.thisWeek", activities: [] },
    { labelKey: "activity.older", activities: [] },
  ];

  activities.forEach((activity) => {
    const date = new Date(activity.changed_at);
    if (date >= today) {
      groups[0].activities.push(activity);
    } else if (date >= yesterday) {
      groups[1].activities.push(activity);
    } else if (date >= thisWeek) {
      groups[2].activities.push(activity);
    } else {
      groups[3].activities.push(activity);
    }
  });

  return groups.filter((g) => g.activities.length > 0);
};

const TimelineActivityFeed: React.FC<Props> = ({
  activities,
  loading = false,
  onTicketClick,
}) => {
  const { t } = useTranslation('dashboard');
  const groupedActivities = groupActivitiesByTime(activities);

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
          <span style={{ fontSize: 'var(--fs-caption)' }}>{t('activity.liveActivity')}</span>
        </div>
      }
      size="small"
      style={{ borderRadius: 8, height: "100%" }}
      styles={{
        body: { padding: 0, height: "calc(100% - 40px)", overflow: "hidden" },
      }}
      extra={
        <span style={{ fontSize: 'var(--fs-xs)', color: "var(--color-text-muted)" }}>
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
          .timeline-item:hover {
            background-color: var(--color-bg-sidebar);
          }
        `}
      </style>

      <div style={{ height: "100%", overflowY: "auto" }}>
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
          <div style={{ padding: "12px 0" }}>
            {groupedActivities.map((group) => (
              <div key={group.labelKey}>
                {/* Time Group Label */}
                <div
                  style={{
                    padding: "8px 16px",
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    backgroundColor: "var(--color-bg-sidebar)",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {t(group.labelKey)}
                </div>

                {/* Activities in group */}
                {group.activities.map((activity, index) => {
                  const color = getActivityColor(activity.field);
                  const isLast = index === group.activities.length - 1;

                  return (
                    <div
                      key={activity.id}
                      onClick={() => onTicketClick?.(activity.ticket.id)}
                      className="timeline-item"
                      style={{
                        display: "flex",
                        padding: "12px 16px",
                        cursor: onTicketClick ? "pointer" : "default",
                        position: "relative",
                      }}
                    >
                      {/* Timeline connector */}
                      <div
                        style={{
                          position: "relative",
                          marginRight: 12,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        {/* Icon dot */}
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            backgroundColor: `${color}15`,
                            color: color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 'var(--fs-sm)',
                            zIndex: 1,
                          }}
                        >
                          {getActivityIcon(activity.field)}
                        </div>
                        {/* Connecting line */}
                        {!isLast && (
                          <div
                            style={{
                              width: 2,
                              flex: 1,
                              backgroundColor: "var(--color-border-light)",
                              position: "absolute",
                              top: 28,
                              bottom: -12,
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* User and action */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          <Avatar
                            size={18}
                            style={{
                              backgroundColor: "var(--color-primary)",
                              fontSize: 'var(--fs-2xs)',
                            }}
                          >
                            {activity.changed_by
                              ? activity.changed_by.first_name?.[0] ||
                                activity.changed_by.username[0]
                              : "S"}
                          </Avatar>
                          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>
                            {activity.changed_by
                              ? activity.changed_by.first_name ||
                                activity.changed_by.username
                              : t('activity.system')}
                          </span>
                          <span style={{ fontSize: 'var(--fs-sm)', color: "var(--color-text-muted)" }}>
                            {t('activity.updated')}{" "}
                            <span style={{ color: color, fontWeight: 500 }}>
                              {formatFieldName(activity.field)}
                            </span>
                          </span>
                        </div>

                        {/* Ticket info */}
                        <div
                          style={{
                            fontSize: 'var(--fs-xs)',
                            color: "var(--color-text-secondary)",
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              backgroundColor: "var(--color-bg-inset)",
                              padding: "1px 4px",
                              borderRadius: 3,
                              marginRight: 6,
                            }}
                          >
                            {activity.ticket.key}
                          </span>
                          {activity.ticket.title}
                        </div>

                        {/* Value change */}
                        {(activity.old_value || activity.new_value) && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 'var(--fs-xs)',
                            }}
                          >
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: "var(--color-bg-inset)",
                                color: "var(--color-text-muted)",
                                maxWidth: 100,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {activity.old_value || t('activity.empty')}
                            </span>
                            <span style={{ color: "#bfbfbf" }}>→</span>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: `${color}15`,
                                color: color,
                                maxWidth: 100,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontWeight: 500,
                              }}
                            >
                              {activity.new_value || t('activity.empty')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <Tooltip
                        title={new Date(activity.changed_at).toLocaleString()}
                      >
                        <span
                          style={{
                            fontSize: 'var(--fs-2xs)',
                            color: "#bfbfbf",
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {formatRelativeTime(activity.changed_at)}
                        </span>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TimelineActivityFeed;
