import React from "react";
import { Card, Avatar, Space, Typography, Badge, Tooltip, Spin } from "antd";
import {
  ShopOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EditOutlined,
  SettingOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Dropdown } from "antd";

const { Title, Text } = Typography;

export interface CompanyStats {
  open_tickets: number;
  urgent_tickets: number;
  overdue_tickets: number;
  resolved_this_month: number;
  total_tickets: number;
  user_count: number;
  admin_count: number;
  health_status: "critical" | "attention" | "healthy" | "inactive";
  last_activity: string | null;
}

export interface Company {
  id: number;
  name: string;
  description: string;
  logo?: string;
  logo_url?: string;
  logo_thumbnail_url?: string;
  primary_contact_email?: string;
  phone?: string;
  ticket_count: number;
  admin_count: number;
  user_count: number;
  project_count: number;
}

interface CompanyCardProps {
  company: Company;
  stats?: CompanyStats | null;
  statsLoading?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onSettings?: () => void;
  menuItems?: MenuProps["items"];
}

const healthConfig = {
  critical: {
    color: "#dc2626", // red-600
    bgColor: "#fef2f2", // red-50
    borderColor: "#fecaca", // red-200
    icon: <ExclamationCircleOutlined />,
    label: "Critical",
    description: "Requires immediate attention",
  },
  attention: {
    color: "#d97706", // amber-600
    bgColor: "#fffbeb", // amber-50
    borderColor: "#fde68a", // amber-200
    icon: <WarningOutlined />,
    label: "Needs Attention",
    description: "Has overdue or urgent tickets",
  },
  healthy: {
    color: "#16a34a", // green-600
    bgColor: "#f0fdf4", // green-50
    borderColor: "#bbf7d0", // green-200
    icon: <CheckCircleOutlined />,
    label: "Healthy",
    description: "All systems normal",
  },
  inactive: {
    color: "#6b7280", // gray-500
    bgColor: "#f9fafb", // gray-50
    borderColor: "#e5e7eb", // gray-200
    icon: <ClockCircleOutlined />,
    label: "Inactive",
    description: "No recent activity",
  },
};

const formatLastActivity = (lastActivity: string | null): string => {
  if (!lastActivity) return "No activity";

  const date = new Date(lastActivity);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  stats,
  statsLoading = false,
  onClick,
  onEdit,
  onSettings,
  menuItems,
}) => {
  const health = stats ? healthConfig[stats.health_status] : null;

  return (
    <Card
      hoverable
      style={{
        height: "100%",
        cursor: "pointer",
        borderLeft: health ? `4px solid ${health.color}` : undefined,
        transition: "all 0.2s ease",
      }}
      styles={{
        body: { padding: 16 },
      }}
      onClick={onClick}
      actions={[
        <Tooltip title="Edit company" key="edit">
          <EditOutlined
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          />
        </Tooltip>,
        <Tooltip title="Settings" key="settings">
          <SettingOutlined
            onClick={(e) => {
              e.stopPropagation();
              onSettings?.();
            }}
          />
        </Tooltip>,
        menuItems ? (
          <div key="more" onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <MoreOutlined />
            </Dropdown>
          </div>
        ) : (
          <MoreOutlined key="more" style={{ visibility: "hidden" }} />
        ),
      ]}
    >
      {/* Header with logo and health status */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {company.logo_url || company.logo_thumbnail_url ? (
            <Avatar
              size={48}
              src={company.logo_thumbnail_url || company.logo_url}
              style={{ padding: 5, flexShrink: 0 }}
              className="company-logo-avatar"
            />
          ) : (
            <Avatar
              size={48}
              style={{ background: "#2C3E50", flexShrink: 0 }}
              icon={<ShopOutlined />}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <Title
              level={5}
              style={{
                marginBottom: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {company.name}
            </Title>
            {company.description && (
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {company.description}
              </Text>
            )}
          </div>
        </div>

        {/* Health Status Badge */}
        {statsLoading ? (
          <Spin size="small" />
        ) : health ? (
          <Tooltip title={health.description}>
            <Badge
              count={
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 12,
                    backgroundColor: health.bgColor,
                    border: `1px solid ${health.borderColor}`,
                    color: health.color,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {health.icon}
                  {health.label}
                </span>
              }
            />
          </Tooltip>
        ) : null}
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <Spin size="small" />
        </div>
      ) : stats ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {/* Open Tickets */}
          <div
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: "var(--color-bg-inset)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <FileTextOutlined style={{ color: "var(--color-primary)", fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Open
              </Text>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-primary)" }}>
              {stats.open_tickets}
            </div>
          </div>

          {/* Urgent/Overdue Tickets */}
          <div
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor:
                stats.urgent_tickets > 0 || stats.overdue_tickets > 0
                  ? "#fff7e6"
                  : "var(--color-bg-inset)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ExclamationCircleOutlined
                style={{
                  color:
                    stats.urgent_tickets > 0 || stats.overdue_tickets > 0
                      ? "#fa8c16"
                      : "var(--color-text-muted)",
                  fontSize: 12,
                }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Urgent
              </Text>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color:
                  stats.urgent_tickets > 0 || stats.overdue_tickets > 0
                    ? "#fa8c16"
                    : "var(--color-text-muted)",
              }}
            >
              {stats.urgent_tickets + stats.overdue_tickets}
            </div>
          </div>

          {/* Resolved This Month */}
          <div
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: "#f6ffed",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Resolved
              </Text>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#52c41a" }}>
              {stats.resolved_this_month}
            </div>
          </div>

          {/* Total Tickets */}
          <div
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: "var(--color-bg-inset)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <FileTextOutlined style={{ color: "var(--color-text-muted)", fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Total
              </Text>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
              {stats.total_tickets}
            </div>
          </div>
        </div>
      ) : (
        /* Fallback: Basic counts from company object */
        <Space
          direction="vertical"
          size={4}
          style={{ width: "100%", marginBottom: 12 }}
        >
          <Space>
            <FileTextOutlined style={{ color: "var(--color-text-muted)" }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {company.ticket_count} tickets
            </Text>
          </Space>
        </Space>
      )}

      {/* Footer: Team info and last activity */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--color-border-light)",
          paddingTop: 8,
          marginTop: 4,
        }}
      >
        <Space size={4}>
          <TeamOutlined style={{ color: "var(--color-text-muted)", fontSize: 12 }} />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {stats?.admin_count ?? company.admin_count} admins ·{" "}
            {stats?.user_count ?? company.user_count} users
          </Text>
        </Space>

        {stats?.last_activity && (
          <Tooltip title={new Date(stats.last_activity).toLocaleString()}>
            <Space size={4}>
              <ClockCircleOutlined style={{ color: "var(--color-text-muted)", fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatLastActivity(stats.last_activity)}
              </Text>
            </Space>
          </Tooltip>
        )}
      </div>
    </Card>
  );
};

export default CompanyCard;
