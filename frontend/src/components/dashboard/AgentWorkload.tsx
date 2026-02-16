/**
 * AgentWorkload Component
 * Displays workload distribution across team members
 */

import React from "react";
import { Card, List, Avatar, Progress, Tooltip, Spin, Empty, Tag } from "antd";
import { WarningOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { AgentWorkload as AgentWorkloadData } from "../../types/dashboard";

interface Props {
  workloads: AgentWorkloadData[];
  loading?: boolean;
  maxHeight?: number;
  onUserClick?: (userId: number) => void;
}

// Get color based on workload
const getWorkloadColor = (count: number, maxCount: number): string => {
  const ratio = count / Math.max(maxCount, 1);
  if (ratio > 0.8) return "#ff4d4f";
  if (ratio > 0.6) return "#faad14";
  return "#52c41a";
};

const AgentWorkload: React.FC<Props> = ({
  workloads,
  loading = false,
  maxHeight = 350,
  onUserClick,
}) => {
  const { t } = useTranslation('dashboard');
  const maxWorkload = Math.max(...workloads.map((w) => w.total_active), 1);

  return (
    <Card
      title={t('widgets.teamWorkload')}
      size="small"
      style={{ borderRadius: 8 }}
      styles={{ body: { padding: 0 } }}
      extra={
        <span style={{ fontSize: 'var(--fs-xs)', color: "var(--color-text-muted)" }}>
          {t('workload.members', { count: workloads.length })}
        </span>
      }
    >
      <div style={{ maxHeight, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Spin size="small" />
          </div>
        ) : workloads.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('workload.noMembers')}
            style={{ padding: 32 }}
          />
        ) : (
          <List
            dataSource={workloads}
            renderItem={(workload) => {
              const displayName =
                workload.user.first_name && workload.user.last_name
                  ? `${workload.user.first_name} ${workload.user.last_name}`
                  : workload.user.username;

              const initials =
                workload.user.first_name && workload.user.last_name
                  ? `${workload.user.first_name[0]}${workload.user.last_name[0]}`
                  : workload.user.username.substring(0, 2).toUpperCase();

              const hasOverdue = workload.overdue > 0;

              return (
                <List.Item
                  onClick={() => onUserClick?.(workload.user.id)}
                  style={{
                    padding: "12px 16px",
                    cursor: onUserClick ? "pointer" : "default",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                  className="hover-highlight"
                >
                  <div style={{ width: "100%" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      {/* User avatar */}
                      <Avatar
                        size={36}
                        style={{ backgroundColor: "var(--color-primary)", flexShrink: 0 }}
                        icon={<UserOutlined />}
                      >
                        {initials}
                      </Avatar>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Name and ticket count */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
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
                            {displayName}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {hasOverdue && (
                              <Tooltip
                                title={t('workload.overdueTickets', { count: workload.overdue })}
                              >
                                <Tag
                                  color="error"
                                  icon={<WarningOutlined />}
                                  style={{ margin: 0, fontSize: 'var(--fs-2xs)' }}
                                >
                                  {workload.overdue}
                                </Tag>
                              </Tooltip>
                            )}
                            <Tag style={{ margin: 0 }}>
                              {workload.total_active} {t('workload.active')}
                            </Tag>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <Progress
                          percent={Math.round(
                            (workload.total_active / maxWorkload) * 100
                          )}
                          size="small"
                          strokeColor={getWorkloadColor(
                            workload.total_active,
                            maxWorkload
                          )}
                          showInfo={false}
                        />

                        {/* Status breakdown */}
                        {Object.keys(workload.by_status).length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              marginTop: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {Object.entries(workload.by_status).map(
                              ([status, count]) => (
                                <Tooltip
                                  key={status}
                                  title={`${status}: ${count}`}
                                >
                                  <Tag
                                    style={{
                                      margin: 0,
                                      fontSize: 'var(--fs-2xs)',
                                      padding: "0 4px",
                                      lineHeight: "16px",
                                    }}
                                  >
                                    {status.substring(0, 8)}: {count}
                                  </Tag>
                                </Tooltip>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </Card>
  );
};

export default AgentWorkload;
