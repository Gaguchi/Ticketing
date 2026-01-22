import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Space, Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { getPriorityIcon } from "./PriorityIcons";
import type { Ticket } from "../types/api";

interface TicketCardProps {
  id: string;
  ticket: Ticket;
  disabled?: boolean;
  dragOverlay?: boolean;
  onClick?: (ticket: Ticket) => void;
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

// Helper function to format ticket ID with type prefix
const formatTicketId = (ticket: Ticket) => {
  // Prefer ticket_key if available (project-scoped number)
  if (ticket.ticket_key) {
    return ticket.ticket_key;
  }
  // Fallback to old format for backward compatibility
  const key = ticket.project_key || "TICK";
  const num = ticket.project_number || ticket.id;
  return `${key}-${num}`;
};

const TicketCardComponent: React.FC<TicketCardProps> = ({
  id,
  ticket,
  disabled,
  dragOverlay,
  onClick,
}) => {
  const isResolved = !!ticket.resolved_at;

  // Get assignees from either full object or detail format
  const assigneesList = ticket.assignees || ticket.assignees_detail || [];

  // Format due date for display
  const formatDueDate = (dueDate: string | null | undefined) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const isOverdue = dateOnly < today;
    const isToday = dateOnly.getTime() === today.getTime();
    const isTomorrow = dateOnly.getTime() === tomorrow.getTime();
    
    let text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let color = '#5e6c84';
    let bgColor = '#f4f5f7';
    
    if (isOverdue) {
      text = 'Overdue';
      color = '#de350b';
      bgColor = '#ffebe6';
    } else if (isToday) {
      text = 'Today';
      color = '#ff8b00';
      bgColor = '#fff4e6';
    } else if (isTomorrow) {
      text = 'Tomorrow';
      color = '#ff991f';
      bgColor = '#fffae6';
    }
    
    return { text, color, bgColor };
  };

  const dueDateInfo = formatDueDate(ticket.due_date);

  const {
    setNodeRef,
    listeners,
    isDragging,
    transform,
    transition,
    attributes,
  } = useSortable({
    id: id,
    disabled: disabled,
    data: {
      type: "TICKET",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: dragOverlay
      ? "0 4px 8px rgba(9,30,66,0.25)"
      : "0 1px 2px rgba(9,30,66,0.2)",
    cursor: dragOverlay ? "grabbing" : "pointer",
    touchAction: "manipulation",
    padding: "8px 10px",
    borderRadius: "3px",
    backgroundColor: "#fff",
    marginBottom: "8px",
  };

  return (
    <div
      ref={disabled ? null : setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick(ticket);
        }
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = "#f4f5f7";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#fff";
      }}
    >
      <div>
        {/* Resolved indicator */}
        {/* Expanded Resolution Workflow Statuses */}
        {ticket.resolution_status === "rejected" && (
          <div style={{ marginBottom: "6px" }}>
            <Tag color="#cd201f" style={{ margin: 0, fontSize: "11px" }}>
              Resolution Rejected
            </Tag>
          </div>
        )}
        {ticket.resolution_status === "awaiting_review" && (
          <div style={{ marginBottom: "6px" }}>
            <Tag color="gold" style={{ margin: 0, fontSize: "11px" }}>
              Awaiting Review
            </Tag>
          </div>
        )}
        {/* Legacy or Accepted Resolved indicator - Only show if NOT rejected/awaiting review */}
        {(isResolved || ticket.resolution_status === "accepted") &&
          ticket.resolution_status !== "rejected" &&
          ticket.resolution_status !== "awaiting_review" && (
            <div style={{ marginBottom: "6px" }}>
              <Tag
                icon={<CheckCircleOutlined />}
                color="success"
                style={{ margin: 0, fontSize: "11px" }}
              >
                Resolved
              </Tag>
            </div>
          )}

        {/* Rejection Feedback Preview - Shows latest feedback truncated */}
        {ticket.resolution_status === "rejected" &&
          ticket.resolution_feedback && (
            <div
              style={{
                marginBottom: "8px",
                padding: "6px 8px",
                backgroundColor: "#FFF1F0",
                border: "1px solid #FFCCC7",
                borderRadius: "4px",
                fontSize: "11px",
                color: "#CF1322",
              }}
              title={ticket.resolution_feedback}
            >
              <span style={{ fontWeight: 600 }}>Feedback: </span>
              {ticket.resolution_feedback.length > 80
                ? `${ticket.resolution_feedback.substring(0, 80)}...`
                : ticket.resolution_feedback}
            </div>
          )}
        <div
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "#172b4d",
            marginBottom: "8px",
            lineHeight: "20px",
          }}
        >
          {ticket.name}
        </div>

        {/* Due Date Display */}
        {dueDateInfo && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 6px",
              borderRadius: "3px",
              backgroundColor: dueDateInfo.bgColor,
              color: dueDateInfo.color,
              fontSize: "11px",
              fontWeight: 500,
              marginBottom: "8px",
            }}
          >
            <ClockCircleOutlined style={{ fontSize: "10px" }} />
            {dueDateInfo.text}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#5e6c84",
            fontSize: "12px",
          }}
        >
          <div>
            <Space align="center" size={8}>
              {/* Issue Type/Company Logo and ID */}
              <Space size={4} align="center">
                {ticket.company_logo_url ? (
                  <Avatar
                    src={ticket.company_logo_url}
                    size={16}
                    style={{
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={getTypeIcon(ticket.type).icon}
                    style={{
                      fontSize: "14px",
                      color: getTypeIcon(ticket.type).color,
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: "12px",
                    color: "#5e6c84",
                    fontWeight: 500,
                  }}
                >
                  {formatTicketId(ticket)}
                </span>
              </Space>
              {ticket.following && <EyeOutlined style={{ fontSize: "14px" }} />}
              {(ticket.comments_count ?? 0) > 0 && (
                <Space size={4}>
                  <MessageOutlined style={{ fontSize: "14px" }} />
                  <span>{ticket.comments_count}</span>
                </Space>
              )}
            </Space>
          </div>
          <div>
            <Space align="center" size={6}>
              {getPriorityIcon(ticket.priority_id ?? 3)}
              {assigneesList.length > 0 && (
                <Avatar.Group
                  size={20}
                  max={{
                    count: 2,
                    style: {
                      color: "#fff",
                      backgroundColor: "#dfe1e6",
                      fontSize: "11px",
                    },
                  }}
                >
                  {assigneesList.map((user: any) => (
                    <Tooltip
                      key={user.id}
                      title={user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                    >
                      <Avatar
                        icon={<UserOutlined />}
                        size={20}
                        style={{ backgroundColor: "#0052cc" }}
                      />
                    </Tooltip>
                  ))}
                </Avatar.Group>
              )}
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TicketCard = memo(TicketCardComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.disabled === next.disabled &&
    prev.dragOverlay === next.dragOverlay &&
    prev.ticket === next.ticket &&
    prev.onClick === next.onClick
  );
});

TicketCard.displayName = "TicketCard";
