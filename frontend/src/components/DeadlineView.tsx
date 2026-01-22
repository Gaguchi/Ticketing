import React, { useMemo } from "react";
import { Card, Tag, Avatar, Space, Typography } from "antd";
import { ClockCircleOutlined, UserOutlined } from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { getPriorityIcon } from "./PriorityIcons";
import type { Ticket, TicketColumn } from "../types/api";

const { Text } = Typography;

interface DeadlineViewProps {
  tickets: Ticket[];
  columns: TicketColumn[];
  onTicketClick?: (ticket: Ticket) => void;
}

const getTypeIcon = (type?: string) => {
  switch (type) {
    case "task":
      return { icon: faCheckSquare, color: "#4bade8" };
    case "bug":
      return { icon: faBug, color: "#e5493a" };
    case "story":
      return { icon: faBookmark, color: "#63ba3c" };
    case "epic":
      return { icon: faBolt, color: "#904ee2" };
    default:
      return { icon: faCheckSquare, color: "#4bade8" };
  }
};

const formatTicketId = (ticket: Ticket) => {
  // Prefer ticket_key from backend (includes project-scoped number)
  if (ticket.ticket_key) {
    return ticket.ticket_key;
  }
  // Fallback to constructing from available fields
  const key = ticket.project_key || "TICK";
  const num = ticket.project_number || ticket.id;
  return `${key}-${num}`;
};

// Function to categorize tickets by deadline
const categorizeByDeadline = (tickets: Ticket[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));

  const categories = {
    overdue: [] as Ticket[],
    dueToday: [] as Ticket[],
    dueThisWeek: [] as Ticket[],
    dueNextWeekPlus: [] as Ticket[],
    noDeadline: [] as Ticket[],
    completed: [] as Ticket[],
  };

  tickets.forEach((ticket) => {
    // Check if completed first
    if (
      ticket.column_name?.toLowerCase() === "done" ||
      ticket.column_name?.toLowerCase() === "completed"
    ) {
      categories.completed.push(ticket);
      return;
    }

    // Check due_date property
    const dueDateValue = ticket.due_date;

    if (!dueDateValue) {
      categories.noDeadline.push(ticket);
      return;
    }

    const dueDate = new Date(dueDateValue);
    const dueDateOnly = new Date(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate()
    );

    if (dueDateOnly < today) {
      categories.overdue.push(ticket);
    } else if (dueDateOnly.getTime() === today.getTime()) {
      categories.dueToday.push(ticket);
    } else if (dueDateOnly <= endOfWeek) {
      categories.dueThisWeek.push(ticket);
    } else {
      // All tickets due after this week go into "Next Week +"
      categories.dueNextWeekPlus.push(ticket);
    }
  });

  return categories;
};

const DeadlineColumn: React.FC<{
  title: string;
  count: number;
  tickets: Ticket[];
  color: string;
  onTicketClick?: (ticket: Ticket) => void;
}> = ({ title, count, tickets, color, onTicketClick }) => {
  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        position: "relative",
      }}
    >
      {/* The Vertical Timeline Line - On the RIGHT */}
      <div
        style={{
          position: "absolute",
          right: 0, // Aligned with the flat edge |
          top: 18,
          bottom: 0,
          width: 2,
          backgroundColor: color,
          opacity: 0.3,
          zIndex: 1,
        }}
      />

      {/* The Arrow Header - <____| Shape */}
      <div
        style={{
          height: 36,
          backgroundColor: color,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px 0 24px", // Left padding for arrow tip
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          position: "relative",
          // The <____| shape: Point on left, Flat on right
          clipPath: "polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%)",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            backgroundColor: "rgba(255,255,255,0.25)",
            padding: "1px 8px",
            borderRadius: 10,
            fontSize: 11,
            minWidth: 24,
            textAlign: "center",
          }}
        >
          {count}
        </span>
      </div>

      {/* Tickets */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 12, // Padding for the line on the right
          paddingLeft: 8,
        }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              size="small"
              hoverable
              onClick={() => onTicketClick?.(ticket)}
              style={{
                cursor: "pointer",
                borderRadius: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                border: "1px solid #f0f0f0",
                background: "#fff",
              }}
              styles={{ body: { padding: "10px 12px" } }}
            >
              {/* Ticket Title */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: "#172b4d",
                  lineHeight: "18px",
                }}
              >
                {ticket.name}
              </div>

              {/* Due Date - Prominent Display */}
              {ticket.due_date && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 8,
                    padding: "4px 6px",
                    backgroundColor: "#f4f5f7",
                    borderRadius: 3,
                    fontSize: 12,
                    color: "#5e6c84",
                  }}
                >
                  <ClockCircleOutlined style={{ fontSize: 12 }} />
                  <Text style={{ fontSize: 12, fontWeight: 500 }}>
                    {new Date(ticket.due_date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </div>
              )}

              {/* Metadata Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#5e6c84",
                }}
              >
                <Space size={6} align="center">
                  {/* Type Icon */}
                  <FontAwesomeIcon
                    icon={getTypeIcon(ticket.type).icon}
                    style={{
                      fontSize: 12,
                      color: getTypeIcon(ticket.type).color,
                    }}
                  />

                  {/* Ticket ID */}
                  <Text
                    style={{ fontSize: 11, color: "#5e6c84", fontWeight: 500 }}
                  >
                    {formatTicketId(ticket)}
                  </Text>

                  {/* Priority */}
                  {ticket.priority_id && (
                    <span style={{ fontSize: 12 }}>
                      {getPriorityIcon(ticket.priority_id)}
                    </span>
                  )}
                </Space>

                {/* Assignees */}
                {ticket.assignees && ticket.assignees.length > 0 && (
                  <Avatar.Group maxCount={2} size={20}>
                    {ticket.assignees.map((_, idx) => (
                      <Avatar
                        key={idx}
                        size={20}
                        icon={<UserOutlined />}
                        style={{ fontSize: 10 }}
                      />
                    ))}
                  </Avatar.Group>
                )}
              </div>

              {/* Tags */}
              {ticket.tags_detail && ticket.tags_detail.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Space size={4} wrap>
                    {ticket.tags_detail.slice(0, 2).map((tag, idx) => (
                      <Tag
                        key={idx}
                        style={{
                          fontSize: 10,
                          padding: "0 6px",
                          margin: 0,
                          borderRadius: 2,
                        }}
                      >
                        {tag.name}
                      </Tag>
                    ))}
                    {ticket.tags_detail.length > 2 && (
                      <Tag
                        style={{
                          fontSize: 10,
                          padding: "0 6px",
                          margin: 0,
                          borderRadius: 2,
                        }}
                      >
                        +{ticket.tags_detail.length - 2}
                      </Tag>
                    )}
                  </Space>
                </div>
              )}
            </Card>
          ))}
        </Space>
      </div>
    </div>
  );
};

export const DeadlineView: React.FC<DeadlineViewProps> = ({
  tickets,
  onTicketClick,
}) => {
  const categorized = useMemo(() => categorizeByDeadline(tickets), [tickets]);

  const columns = [
    {
      key: "overdue",
      title: "Overdue",
      tickets: categorized.overdue,
      color: "#de350b", // Jira Red
      count: categorized.overdue.length,
    },
    {
      key: "dueToday",
      title: "Due Today",
      tickets: categorized.dueToday,
      color: "#0052cc", // Jira Blue
      count: categorized.dueToday.length,
    },
    {
      key: "dueThisWeek",
      title: "Due This Week",
      tickets: categorized.dueThisWeek,
      color: "#2684ff", // Lighter Blue
      count: categorized.dueThisWeek.length,
    },
    {
      key: "dueNextWeekPlus",
      title: "Next Week +",
      tickets: categorized.dueNextWeekPlus,
      color: "#4c9aff", // Even Lighter Blue
      count: categorized.dueNextWeekPlus.length,
    },
    {
      key: "noDeadline",
      title: "No Deadline",
      tickets: categorized.noDeadline,
      color: "#5e6c84", // Slate Gray
      count: categorized.noDeadline.length,
    },
    {
      key: "completed",
      title: "Completed",
      tickets: categorized.completed,
      color: "#00875a", // Jira Green
      count: categorized.completed.length,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        padding: "16px 20px",
        gap: 4,
      }}
    >
      {columns.map((column) => (
        <DeadlineColumn
          key={column.key}
          title={column.title}
          count={column.count}
          tickets={column.tickets}
          color={column.color}
          onTicketClick={onTicketClick}
        />
      ))}
    </div>
  );
};
