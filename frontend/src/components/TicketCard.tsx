import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Row, Col, Space } from "antd";
import { EyeOutlined, MessageOutlined, UserOutlined } from "@ant-design/icons";
import { getPriorityIcon } from "./PriorityIcons";
import type { Ticket } from "../types/ticket";

interface TicketCardProps {
  id: string;
  ticket: Ticket;
  disabled?: boolean;
  dragOverlay?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  id,
  ticket,
  disabled,
  dragOverlay,
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
      ? "0 2px 8px rgba(0,0,0,0.15)"
      : "0 1px 2px rgba(0,0,0,0.06)",
    border: dragOverlay ? "1px solid #1890ff" : "1px solid #e8e8e8",
    cursor: dragOverlay ? "grabbing" : "grab",
    touchAction: "manipulation",
    padding: "10px",
    borderRadius: "2px",
    backgroundColor: "#fff",
    marginBottom: "8px",
  };

  return (
    <div
      ref={disabled ? null : setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div>
        <Row justify="space-between">
          <Col span={20}>
            <div style={{ fontSize: "13px", fontWeight: 500 }}>
              {ticket.name}
            </div>
          </Col>
        </Row>
        <Row
          justify="space-between"
          style={{
            marginTop: "8px",
            color: "#777",
            fontSize: "12px",
          }}
        >
          <Col>
            <Space align="center" size="small">
              {ticket.following && <EyeOutlined />}
              {ticket.commentsCount && ticket.commentsCount > 0 && (
                <Space size={4}>
                  <MessageOutlined />
                  {ticket.commentsCount}
                </Space>
              )}
            </Space>
          </Col>
          <Col>
            <Space align="center" size="small">
              {getPriorityIcon(ticket.priorityId)}
              {ticket.assigneeIds && ticket.assigneeIds.length > 0 && (
                <Avatar.Group
                  maxCount={2}
                  size="small"
                  max={{
                    count: 2,
                    style: { color: "#fff", backgroundColor: "#ccc" },
                  }}
                >
                  {ticket.assigneeIds.map((userId: number) => (
                    <Avatar icon={<UserOutlined />} key={userId} size="small" />
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
