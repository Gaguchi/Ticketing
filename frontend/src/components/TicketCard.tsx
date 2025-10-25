import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Row, Col, Space } from "antd";
import { EyeOutlined, MessageOutlined, UserOutlined } from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { getPriorityIcon } from "./PriorityIcons";
import type { Ticket } from "../types/ticket";

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
const formatTicketId = (type?: string, id?: number) => {
  const typePrefix = type ? type.toUpperCase() : "TASK";
  return `${typePrefix}-${id}`;
};

export const TicketCard: React.FC<TicketCardProps> = ({
  id,
  ticket,
  disabled,
  dragOverlay,
  onClick,
}) => {
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
    border: "none",
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
        <Row
          justify="space-between"
          align="middle"
          style={{
            color: "#5e6c84",
            fontSize: "12px",
          }}
        >
          <Col>
            <Space align="center" size={8}>
              {/* Issue Type and ID */}
              <Space size={4} align="center">
                <FontAwesomeIcon
                  icon={getTypeIcon(ticket.type).icon}
                  style={{
                    fontSize: "14px",
                    color: getTypeIcon(ticket.type).color,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: "#5e6c84",
                    fontWeight: 500,
                  }}
                >
                  {formatTicketId(ticket.type, ticket.id)}
                </span>
              </Space>
              {ticket.following && <EyeOutlined style={{ fontSize: "14px" }} />}
              {ticket.commentsCount && ticket.commentsCount > 0 && (
                <Space size={4}>
                  <MessageOutlined style={{ fontSize: "14px" }} />
                  <span>{ticket.commentsCount}</span>
                </Space>
              )}
            </Space>
          </Col>
          <Col>
            <Space align="center" size={6}>
              {getPriorityIcon(ticket.priorityId ?? ticket.priority_id ?? 3)}
              {ticket.assigneeIds && ticket.assigneeIds.length > 0 && (
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
                  {ticket.assigneeIds.map((userId: number) => (
                    <Avatar
                      icon={<UserOutlined />}
                      key={userId}
                      size={20}
                      style={{ backgroundColor: "#0052cc" }}
                    />
                  ))}
                </Avatar.Group>
              )}
            </Space>
          </Col>
        </Row>
      </div>
    </div>
  );
};
