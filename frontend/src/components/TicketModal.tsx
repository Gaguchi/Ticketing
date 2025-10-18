import React, { useState } from "react";
import { Modal, Input, Select, DatePicker, Avatar, Button, Tabs } from "antd";
import {
  CloseOutlined,
  UserOutlined,
  EyeOutlined,
  ShareAltOutlined,
  EllipsisOutlined,
  FullscreenOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import type { Ticket } from "../types/ticket";
import { getPriorityIcon } from "./PriorityIcons";

const { TextArea } = Input;
const { Option } = Select;

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
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

// Mock quick comment suggestions
const quickComments = [
  { emoji: "👍", text: "Looks good!" },
  { emoji: "👋", text: "Need help?" },
  { emoji: "🚫", text: "This is blocked..." },
  { emoji: "🔍", text: "Can you clarify...?" },
  { emoji: "✅", text: "This is done!" },
];

export const TicketModal: React.FC<TicketModalProps> = ({
  open,
  onClose,
  ticket,
}) => {
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [activeTab, setActiveTab] = useState("comments");

  if (!ticket) return null;

  const typeInfo = getTypeIcon(ticket.type);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1100}
      footer={null}
      closeIcon={null}
      style={{ top: 20 }}
      styles={{
        body: {
          padding: 0,
          maxHeight: "calc(100vh - 100px)",
          overflow: "auto",
        },
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #dfe1e6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          backgroundColor: "#fff",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            style={{ color: "#5e6c84" }}
          >
            Add epic
          </Button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              color: "#5e6c84",
            }}
          >
            <FontAwesomeIcon
              icon={typeInfo.icon}
              style={{ fontSize: "16px", color: typeInfo.color }}
            />
            <span style={{ color: "#0052cc", fontWeight: 500 }}>
              {ticket.type?.toUpperCase()}-{ticket.id}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            style={{ color: "#5e6c84" }}
          >
            1
          </Button>
          <Button
            type="text"
            size="small"
            icon={<ShareAltOutlined />}
            style={{ color: "#5e6c84" }}
          />
          <Button
            type="text"
            size="small"
            icon={<EllipsisOutlined />}
            style={{ color: "#5e6c84" }}
          />
          <Button
            type="text"
            size="small"
            icon={<FullscreenOutlined />}
            style={{ color: "#5e6c84" }}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ color: "#5e6c84" }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex" }}>
        {/* Left Panel - Main Content */}
        <div style={{ flex: 1, padding: "24px", minWidth: 0 }}>
          {/* Title */}
          <Input
            defaultValue={ticket.name}
            bordered={false}
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "#172b4d",
              padding: "0 0 8px 0",
              marginBottom: "16px",
            }}
            placeholder="Add a title..."
          />

          {/* Description */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Description
            </h3>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              autoSize={{ minRows: 3, maxRows: 10 }}
              style={{
                fontSize: "14px",
                color: "#172b4d",
                border: "1px solid #dfe1e6",
                borderRadius: "3px",
              }}
            />
          </div>

          {/* Subtasks */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Subtasks
            </h3>
            <Button
              type="text"
              size="small"
              style={{ padding: 0, color: "#5e6c84", height: "auto" }}
            >
              Add subtask
            </Button>
          </div>

          {/* Linked work items */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Linked work items
            </h3>
            <Button
              type="text"
              size="small"
              style={{ padding: 0, color: "#5e6c84", height: "auto" }}
            >
              Add linked work item
            </Button>
          </div>

          {/* Activity Section */}
          <div style={{ marginTop: "32px" }}>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              Activity
            </h3>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                { key: "all", label: "All" },
                { key: "comments", label: "Comments" },
                { key: "history", label: "History" },
                { key: "worklog", label: "Work log" },
              ]}
              style={{ marginBottom: "16px" }}
            />

            {/* Comment Input */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <Avatar
                size={32}
                style={{ backgroundColor: "#0052cc", flexShrink: 0 }}
              >
                BK
              </Avatar>
              <div style={{ flex: 1 }}>
                <TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  autoSize={{ minRows: 1, maxRows: 10 }}
                  style={{
                    fontSize: "14px",
                    color: "#172b4d",
                    border: "1px solid #dfe1e6",
                    borderRadius: "3px",
                    marginBottom: "8px",
                  }}
                />
                {/* Quick Comment Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "8px",
                  }}
                >
                  {quickComments.map((qc, idx) => (
                    <Button
                      key={idx}
                      size="small"
                      type="text"
                      onClick={() => setComment(qc.text)}
                      style={{
                        fontSize: "12px",
                        color: "#5e6c84",
                        border: "1px solid #dfe1e6",
                        borderRadius: "3px",
                        padding: "2px 8px",
                        height: "auto",
                      }}
                    >
                      {qc.emoji} {qc.text}
                    </Button>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "#5e6c84" }}>
                  <strong>Pro tip:</strong> press{" "}
                  <kbd
                    style={{
                      padding: "2px 6px",
                      border: "1px solid #dfe1e6",
                      borderRadius: "3px",
                      backgroundColor: "#f4f5f7",
                    }}
                  >
                    M
                  </kbd>{" "}
                  to comment
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Details */}
        <div
          style={{
            width: "320px",
            borderLeft: "1px solid #dfe1e6",
            padding: "24px",
            backgroundColor: "#fafbfc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Details
            </h3>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              style={{ color: "#5e6c84", padding: 0 }}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Status
            </div>
            <Select
              defaultValue={ticket.status}
              style={{ width: "100%" }}
              size="small"
            >
              <Option value="New">To Do</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Review">Review</Option>
              <Option value="Done">Done</Option>
            </Select>
          </div>

          {/* Assignee */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Assignee
            </div>
            <Button
              type="text"
              size="small"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "4px 8px",
                height: "auto",
                color: "#5e6c84",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <UserOutlined />
              <span>Unassigned</span>
            </Button>
            <Button
              type="link"
              size="small"
              style={{
                padding: "4px 0",
                height: "auto",
                fontSize: "12px",
              }}
            >
              Assign to me
            </Button>
          </div>

          {/* Labels */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Labels
            </div>
            <Button
              type="text"
              size="small"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "4px 8px",
                height: "auto",
                color: "#5e6c84",
              }}
            >
              Add labels
            </Button>
          </div>

          {/* Parent */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Parent
            </div>
            <Button
              type="text"
              size="small"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "4px 8px",
                height: "auto",
                color: "#5e6c84",
              }}
            >
              Add parent
            </Button>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Priority
            </div>
            <Select
              defaultValue={ticket.priorityId}
              style={{ width: "100%" }}
              size="small"
            >
              <Option value={1}>{getPriorityIcon(1)}</Option>
              <Option value={2}>{getPriorityIcon(2)}</Option>
              <Option value={3}>{getPriorityIcon(3)}</Option>
              <Option value={4}>{getPriorityIcon(4)}</Option>
            </Select>
          </div>

          {/* Due date */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Due date
            </div>
            <DatePicker
              style={{ width: "100%" }}
              size="small"
              placeholder="Add due date"
            />
          </div>

          {/* Customer */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Customer
            </div>
            <Input
              defaultValue={ticket.customer}
              size="small"
              placeholder="Add customer"
            />
          </div>

          {/* Start date */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Start date
            </div>
            <DatePicker
              style={{ width: "100%" }}
              size="small"
              placeholder="Add date"
            />
          </div>

          {/* Reporter */}
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#5e6c84",
                marginBottom: "4px",
              }}
            >
              Reporter
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Avatar size={24} style={{ backgroundColor: "#0052cc" }}>
                BK
              </Avatar>
              <span style={{ fontSize: "14px", color: "#172b4d" }}>
                Boris Karaya
              </span>
            </div>
          </div>

          {/* Automation */}
          <div
            style={{
              borderTop: "1px solid #dfe1e6",
              paddingTop: "16px",
              marginTop: "24px",
            }}
          >
            <Button
              type="text"
              size="small"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "4px 8px",
                height: "auto",
                color: "#5e6c84",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ThunderboltOutlined />
              <span style={{ flex: 1 }}>Automation</span>
              <span style={{ fontSize: "12px" }}>Rule executions</span>
            </Button>
          </div>

          {/* Timestamps */}
          <div
            style={{
              marginTop: "24px",
              fontSize: "11px",
              color: "#5e6c84",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div>Created {ticket.createdAt}</div>
            <div>Updated 2 days ago</div>
          </div>

          {/* Configure Button */}
          <Button
            type="link"
            size="small"
            style={{
              marginTop: "8px",
              padding: 0,
              height: "auto",
              fontSize: "12px",
            }}
          >
            Configure
          </Button>
        </div>
      </div>
    </Modal>
  );
};
