/**
 * TeamWorkloadCards Component (Widget 6C)
 * Card-based team workload display with visual progress indicators
 */

import React from "react";
import { Card, Avatar, Tooltip, Spin, Empty, Tag, Progress } from "antd";
import { WarningOutlined, UserOutlined } from "@ant-design/icons";
import type { AgentWorkload as AgentWorkloadData } from "../../types/dashboard";

interface Props {
  workloads: AgentWorkloadData[];
  loading?: boolean;
  onUserClick?: (userId: number) => void;
}

// Get color based on workload percentage
const getWorkloadColor = (count: number, maxCount: number): string => {
  const ratio = count / Math.max(maxCount, 1);
  if (ratio > 0.8) return "#ff4d4f";
  if (ratio > 0.6) return "#faad14";
  return "#52c41a";
};

// Get status color
const getStatusColor = (status: string): string => {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete")) return "#52c41a";
  if (s.includes("progress") || s.includes("doing")) return "#1890ff";
  if (s.includes("review") || s.includes("test")) return "#faad14";
  return "#8c8c8c";
};

const TeamWorkloadCards: React.FC<Props> = ({
  workloads,
  loading = false,
  onUserClick,
}) => {
  const maxWorkload = Math.max(...workloads.map((w) => w.total_active), 1);

  return (
    <Card
      title="Team Workload"
      size="small"
      style={{ borderRadius: 8 }}
      styles={{ body: { padding: 12 } }}
      extra={
        <span style={{ fontSize: 11, color: "#8c8c8c" }}>
          {workloads.length} member{workloads.length !== 1 ? "s" : ""}
        </span>
      }
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Spin size="small" />
        </div>
      ) : workloads.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No team members found"
          style={{ padding: 24 }}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {workloads.map((workload) => {
            const displayName =
              workload.user.first_name && workload.user.last_name
                ? `${workload.user.first_name} ${workload.user.last_name}`
                : workload.user.username;

            const initials =
              workload.user.first_name && workload.user.last_name
                ? `${workload.user.first_name[0]}${workload.user.last_name[0]}`
                : workload.user.username.substring(0, 2).toUpperCase();

            const hasOverdue = workload.overdue > 0;
            const workloadColor = getWorkloadColor(
              workload.total_active,
              maxWorkload
            );
            const workloadPercent = Math.round(
              (workload.total_active / maxWorkload) * 100
            );

            return (
              <div
                key={workload.user.id}
                onClick={() => onUserClick?.(workload.user.id)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: hasOverdue
                    ? "1px solid #ff4d4f40"
                    : "1px solid #f0f0f0",
                  backgroundColor: hasOverdue ? "#fff1f0" : "#fff",
                  cursor: onUserClick ? "pointer" : "default",
                  transition: "all 0.2s ease",
                }}
                className="workload-card"
              >
                {/* Header: Avatar + Name + Count */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <Avatar
                    size={36}
                    style={{
                      backgroundColor: "#1890ff",
                      flexShrink: 0,
                    }}
                    icon={<UserOutlined />}
                  >
                    {initials}
                  </Avatar>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayName}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: workloadColor,
                        }}
                      >
                        {workload.total_active}
                      </span>
                      <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                        active
                      </span>
                      {hasOverdue && (
                        <Tooltip title={`${workload.overdue} overdue`}>
                          <Tag
                            color="error"
                            icon={<WarningOutlined />}
                            style={{
                              margin: 0,
                              fontSize: 10,
                              padding: "0 4px",
                            }}
                          >
                            {workload.overdue}
                          </Tag>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress
                  percent={workloadPercent}
                  size="small"
                  strokeColor={workloadColor}
                  showInfo={false}
                  style={{ marginBottom: 8 }}
                />

                {/* Status Breakdown */}
                {Object.keys(workload.by_status).length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {Object.entries(workload.by_status).map(
                      ([status, count]) => (
                        <Tooltip key={status} title={`${status}: ${count}`}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 6px",
                              borderRadius: 4,
                              backgroundColor: "#f5f5f5",
                              fontSize: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: getStatusColor(status),
                              }}
                            />
                            <span style={{ color: "#595959" }}>
                              {status.length > 10
                                ? status.substring(0, 10) + "..."
                                : status}
                              : {count}
                            </span>
                          </div>
                        </Tooltip>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>
        {`
          .workload-card:hover {
            border-color: #1890ff !important;
            box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
          }
        `}
      </style>
    </Card>
  );
};

export default TeamWorkloadCards;
