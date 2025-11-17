import React from "react";
import { Card, Tag, Space, Typography } from "antd";
import { ClockCircleOutlined, UserOutlined } from "@ant-design/icons";
import { Ticket } from "../types";
import { formatDate, getPriorityColor, getPriorityLabel, getStatusColor } from "../utils/helpers";

const { Text, Paragraph } = Typography;

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick }) => {
  return (
    <Card hoverable onClick={onClick} style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 16 }}>
              {ticket.key} - {ticket.name}
            </Text>
          </div>
          <Space>
            <Tag color={getPriorityColor(ticket.priority_id)}>
              {getPriorityLabel(ticket.priority_id)}
            </Tag>
            <Tag color={getStatusColor(ticket.status)}>{ticket.status}</Tag>
          </Space>
        </div>

        <Paragraph
          ellipsis={{ rows: 2 }}
          type="secondary"
          style={{ marginBottom: 8 }}
        >
          {ticket.description?.replace(/<[^>]*>/g, "") || "No description"}
        </Paragraph>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Space>
            <Tag>{ticket.type}</Tag>
            {ticket.assignees && ticket.assignees.length > 0 && (
              <Space size={4}>
                <UserOutlined style={{ fontSize: 12 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Assigned to:{" "}
                  {ticket.assignees
                    .map((a) => a.first_name || a.username)
                    .join(", ")}
                </Text>
              </Space>
            )}
          </Space>

          <Space size={4}>
            <ClockCircleOutlined style={{ fontSize: 12, color: "#8c8c8c" }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(ticket.created_at)}
            </Text>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default TicketCard;
