/**
 * AttentionNeededCards Component (Widget 3A)
 * Single list with category headers showing grouped tickets
 * Collapsible sections for Overdue, Unassigned Critical, and Stale
 */

import React, { useState } from "react";
import { Card, Avatar, Tag, Spin, Empty, Button } from "antd";
import {
  ClockCircleOutlined,
  UserDeleteOutlined,
  FieldTimeOutlined,
  RightOutlined,
  DownOutlined,
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
}

type CategoryType = "overdue" | "unassigned" | "stale";

// Format relative time for stale/overdue
const formatTimeDiff = (dateString: string, isOverdue: boolean): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = isOverdue
    ? now.getTime() - date.getTime()
    : now.getTime() - date.getTime();
  const diffDays = Math.floor(Math.abs(diffMs) / 86400000);
  const diffHours = Math.floor(Math.abs(diffMs) / 3600000);

  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
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

// Category config (without translatable strings - those are resolved at render time)
const categoryStyleConfig: Record<
  CategoryType,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }
> = {
  overdue: {
    icon: <ClockCircleOutlined />,
    color: "#ff4d4f",
    bgColor: "#fff1f0",
  },
  unassigned: {
    icon: <UserDeleteOutlined />,
    color: "#faad14",
    bgColor: "#fffbe6",
  },
  stale: {
    icon: <FieldTimeOutlined />,
    color: "var(--color-text-muted)",
    bgColor: "var(--color-bg-sidebar)",
  },
};

// Ticket item component
const TicketItem: React.FC<{
  ticket: DashboardTicket;
  category: CategoryType;
  onClick?: () => void;
}> = ({ ticket, category, onClick }) => {
  const { t } = useTranslation('dashboard');
  return (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      marginLeft: 20,
      borderLeft: `2px solid ${categoryStyleConfig[category].color}20`,
      cursor: onClick ? "pointer" : "default",
      transition: "background-color 0.2s",
    }}
    className="attention-ticket-item"
  >
    {/* Company avatar */}
    <Avatar
      size={28}
      src={ticket.company?.logo_url}
      style={{
        backgroundColor: ticket.company ? "var(--color-primary)" : "var(--color-border)",
        flexShrink: 0,
      }}
    >
      {ticket.company ? (
        <FontAwesomeIcon icon={faBuilding} style={{ fontSize: 'var(--fs-2xs)' }} />
      ) : (
        "G"
      )}
    </Avatar>

    {/* Ticket info */}
    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 'var(--fs-2xs)',
            color: "var(--color-text-muted)",
            flexShrink: 0,
          }}
        >
          {ticket.key}
        </span>
        <span
          style={{
            fontSize: 'var(--fs-sm)',
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {ticket.title}
        </span>
      </div>
    </div>

    {/* Priority tag */}
    {ticket.priority && (
      <Tag
        color={getPriorityColor(ticket.priority)}
        style={{
          margin: 0,
          fontSize: 'var(--fs-2xs)',
          lineHeight: "16px",
          padding: "0 6px",
          flexShrink: 0,
        }}
      >
        {ticket.priority}
      </Tag>
    )}

    {/* Time indicator */}
    <span
      style={{
        fontSize: 'var(--fs-2xs)',
        color: category === "overdue" ? "#ff4d4f" : "var(--color-text-muted)",
        fontWeight: category === "overdue" ? 600 : 400,
        flexShrink: 0,
        minWidth: 30,
        textAlign: "right",
      }}
    >
      {category === "overdue" && ticket.due_date && (
        <>{formatTimeDiff(ticket.due_date, true)} {t('workload.overdue')}</>
      )}
      {category === "stale" && ticket.updated_at && (
        <>{formatTimeDiff(ticket.updated_at, false)} {t('activity.updated')}</>
      )}
    </span>

    {/* View arrow */}
    <RightOutlined style={{ fontSize: 'var(--fs-2xs)', color: "#bfbfbf" }} />
  </div>
  );
};

const AttentionNeededCards: React.FC<Props> = ({
  data,
  loading = false,
  onTicketClick,
}) => {
  const { t } = useTranslation('dashboard');
  const [collapsedCategories, setCollapsedCategories] = useState<
    Set<CategoryType>
  >(new Set());

  const toggleCategory = (category: CategoryType) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const overdueCount = data?.overdue.length || 0;
  const unassignedCount = data?.unassigned_critical.length || 0;
  const staleCount = data?.stale.length || 0;
  const totalCount = overdueCount + unassignedCount + staleCount;

  const getTickets = (category: CategoryType): DashboardTicket[] => {
    if (!data) return [];
    switch (category) {
      case "overdue":
        return data.overdue;
      case "unassigned":
        return data.unassigned_critical;
      case "stale":
        return data.stale;
    }
  };

  const getCount = (category: CategoryType): number => {
    switch (category) {
      case "overdue":
        return overdueCount;
      case "unassigned":
        return unassignedCount;
      case "stale":
        return staleCount;
    }
  };

  if (loading) {
    return (
      <Card
        size="small"
        style={{ borderRadius: 8, height: "100%" }}
        styles={{
          body: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
            height: "100%",
          },
        }}
      >
        <Spin />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      style={{ borderRadius: 8, height: "100%" }}
      styles={{
        body: { padding: 12, height: "calc(100% - 0px)", overflow: "auto" },
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--fs-base)' }}>
            {t('attention.needsAttention')}
          </span>
          {totalCount > 0 && (
            <Tag
              color={totalCount > 5 ? "error" : "warning"}
              style={{ margin: 0 }}
            >
              {t('attention.total', { count: totalCount })}
            </Tag>
          )}
        </div>
      </div>

      {/* Categories */}
      {totalCount === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('attention.noAttention')}
          style={{ padding: 24 }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(["overdue", "unassigned", "stale"] as CategoryType[]).map(
            (category) => {
              const config = categoryStyleConfig[category];
              const categoryTitles: Record<CategoryType, string> = {
                overdue: t('attention.overdueLabel'),
                unassigned: t('attention.unassignedLabel'),
                stale: t('attention.staleLabel'),
              };
              const categoryTitle = categoryTitles[category];
              const count = getCount(category);
              const tickets = getTickets(category);
              const isCollapsed = collapsedCategories.has(category);
              const hasTickets = count > 0;

              return (
                <div key={category}>
                  {/* Category Header */}
                  <div
                    onClick={() => hasTickets && toggleCategory(category)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      backgroundColor: hasTickets ? config.bgColor : "var(--color-bg-sidebar)",
                      borderRadius: 6,
                      cursor: hasTickets ? "pointer" : "default",
                      transition: "background-color 0.2s",
                    }}
                    className={hasTickets ? "category-header-hover" : ""}
                  >
                    {/* Expand/Collapse icon */}
                    <span
                      style={{
                        color: hasTickets ? config.color : "var(--color-border)",
                        fontSize: 'var(--fs-2xs)',
                        transition: "transform 0.2s",
                        transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)",
                      }}
                    >
                      <DownOutlined />
                    </span>

                    {/* Category icon */}
                    <span
                      style={{ color: hasTickets ? config.color : "var(--color-border)" }}
                    >
                      {config.icon}
                    </span>

                    {/* Category title */}
                    <span
                      style={{
                        fontSize: 'var(--fs-xs)',
                        fontWeight: 600,
                        color: hasTickets ? config.color : "#bfbfbf",
                        letterSpacing: "0.5px",
                        flex: 1,
                      }}
                    >
                      {categoryTitle} ({count})
                    </span>

                    {/* Quick action */}
                    {hasTickets && (
                      <Button
                        type="link"
                        size="small"
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: 0,
                          height: "auto",
                          color: "var(--color-primary)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could open a modal with all tickets
                        }}
                      >
                        {t('attention.viewAll')}
                      </Button>
                    )}
                  </div>

                  {/* Ticket List */}
                  {hasTickets && !isCollapsed && (
                    <div style={{ marginTop: 4 }}>
                      {tickets.slice(0, 3).map((ticket) => (
                        <TicketItem
                          key={ticket.id}
                          ticket={ticket}
                          category={category}
                          onClick={() => onTicketClick?.(ticket.id)}
                        />
                      ))}
                      {count > 3 && (
                        <div
                          style={{
                            marginLeft: 20,
                            padding: "6px 12px",
                            fontSize: 'var(--fs-xs)',
                            color: "var(--color-text-muted)",
                            borderLeft: `2px solid ${config.color}20`,
                          }}
                        >
                          {t('attention.more', { count: count - 3 })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      <style>
        {`
          .attention-ticket-item:hover {
            background-color: var(--color-bg-sidebar) !important;
          }
          .category-header-hover:hover {
            filter: brightness(0.97);
          }
        `}
      </style>
    </Card>
  );
};

export default AttentionNeededCards;
