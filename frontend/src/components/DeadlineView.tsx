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
import type { Ticket, TicketColumn } from "../types/ticket";

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

const formatTicketId = (projectKey?: string, id?: number) => {
  const key = projectKey || "TICK";
  return `${key}-${id}`;
};

// Function to categorize tickets by deadline
const categorizeByDeadline = (tickets: Ticket[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

  const categories = {
    overdue: [] as Ticket[],
    dueToday: [] as Ticket[],
    dueThisWeek: [] as Ticket[],
    dueNextWeek: [] as Ticket[],
    noDeadline: [] as Ticket[],
    dueOverTwoWeeks: [] as Ticket[],
    completed: [] as Ticket[],
  };

  tickets.forEach((ticket) => {
    // Check if completed first
    if (
      ticket.columnName?.toLowerCase() === "done" ||
      ticket.columnName?.toLowerCase() === "completed" ||
      ticket.column_name?.toLowerCase() === "done" ||
      ticket.column_name?.toLowerCase() === "completed"
    ) {
      categories.completed.push(ticket);
      return;
    }

    // Check both dueDate and due_date properties
    const dueDateValue = ticket.dueDate || ticket.due_date;

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
    } else if (dueDateOnly <= endOfNextWeek) {
      categories.dueNextWeek.push(ticket);
    } else if (dueDateOnly <= twoWeeksFromNow) {
      categories.dueOverTwoWeeks.push(ticket);
    } else {
      categories.dueOverTwoWeeks.push(ticket);
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
        width: 280,
        minWidth: 280,
        marginRight: 12,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: "8px 12px",
          borderRadius: "4px 4px 0 0",
          backgroundColor: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 600,
          color: "#fff",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 8,
        }}
      >
        <span>{title}</span>
        <span
          style={{
            backgroundColor: "rgba(255,255,255,0.25)",
            padding: "2px 8px",
            borderRadius: 10,
            fontSize: 12,
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
          paddingRight: 4,
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
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
              styles={{ body: { padding: 12 } }}
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
              {(ticket.dueDate || ticket.due_date) && (
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
                    {new Date(
                      ticket.dueDate || ticket.due_date!
                    ).toLocaleDateString("en-US", {
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
                    {formatTicketId(
                      ticket.projectKey || ticket.project_key,
                      ticket.id
                    )}
                  </Text>

                  {/* Priority */}
                  {(ticket.priorityId || ticket.priority_id) && (
                    <span style={{ fontSize: 12 }}>
                      {getPriorityIcon(
                        ticket.priorityId || ticket.priority_id!
                      )}
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
              {ticket.tag_names && ticket.tag_names.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Space size={4} wrap>
                    {ticket.tag_names.slice(0, 2).map((tag, idx) => (
                      <Tag
                        key={idx}
                        style={{
                          fontSize: 10,
                          padding: "0 6px",
                          margin: 0,
                          borderRadius: 2,
                        }}
                      >
                        {tag}
                      </Tag>
                    ))}
                    {ticket.tag_names.length > 2 && (
                      <Tag
                        style={{
                          fontSize: 10,
                          padding: "0 6px",
                          margin: 0,
                          borderRadius: 2,
                        }}
                      >
                        +{ticket.tag_names.length - 2}
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
      color: "#c9372c",
      count: categorized.overdue.length,
    },
    {
      key: "dueToday",
      title: "Due Today",
      tickets: categorized.dueToday,
      color: "#d97706",
      count: categorized.dueToday.length,
    },
    {
      key: "dueThisWeek",
      title: "Due This Week",
      tickets: categorized.dueThisWeek,
      color: "#0891b2",
      count: categorized.dueThisWeek.length,
    },
    {
      key: "dueNextWeek",
      title: "Due Next Week",
      tickets: categorized.dueNextWeek,
      color: "#0284c7",
      count: categorized.dueNextWeek.length,
    },
    {
      key: "noDeadline",
      title: "No Deadline",
      tickets: categorized.noDeadline,
      color: "#6b7280",
      count: categorized.noDeadline.length,
    },
    {
      key: "dueOverTwoWeeks",
      title: "Due Over Two Weeks",
      tickets: categorized.dueOverTwoWeeks,
      color: "#3b82f6",
      count: categorized.dueOverTwoWeeks.length,
    },
    {
      key: "completed",
      title: "Completed",
      tickets: categorized.completed,
      color: "#16a34a",
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
        gap: 0,
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
