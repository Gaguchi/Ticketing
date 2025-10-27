import React, { useState, useEffect } from "react";
import {
  Modal,
  Input,
  Select,
  DatePicker,
  Avatar,
  Button,
  Tabs,
  message,
} from "antd";
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
import dayjs from "dayjs";
import type { Ticket } from "../types/ticket";
import { getPriorityIcon } from "./PriorityIcons";
import {
  ticketService,
  projectService,
  tagService,
  type CreateTicketData,
} from "../services";

const { TextArea } = Input;
const { Option } = Select;

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  mode?: "create" | "edit";
  columnId?: number;
  onSuccess?: (ticket: Ticket) => void;
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
  mode = "edit",
  columnId,
  onSuccess,
}) => {
  const isCreateMode = mode === "create";

  // Form state
  const [title, setTitle] = useState(ticket?.name || "");
  const [description, setDescription] = useState(ticket?.description || "");
  const [ticketType, setTicketType] = useState(ticket?.type || "task");
  const [status, setStatus] = useState(ticket?.status || "new"); // Use lowercase status
  const [priority, setPriority] = useState(ticket?.priorityId || 3);
  const [tags, setTags] = useState<number[]>(ticket?.tags || []);
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(
    ticket?.dueDate ? dayjs(ticket.dueDate) : null
  );
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    ticket?.startDate ? dayjs(ticket.startDate) : null
  );
  const [comment, setComment] = useState("");
  const [activeTab, setActiveTab] = useState("comments");
  const [saving, setSaving] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [actualColumnId, setActualColumnId] = useState<number | null>(null);
  const [projectTags, setProjectTags] = useState<any[]>([]);

  // Load current project from localStorage when modal opens
  useEffect(() => {
    if (open && isCreateMode) {
      console.group(
        "🔧 TicketModal - Loading project and columns (CREATE mode)"
      );
      console.log("Modal opened with columnId:", columnId);

      const projectData = localStorage.getItem("currentProject");
      console.log("Project data from localStorage:", projectData);

      if (projectData) {
        try {
          const project = JSON.parse(projectData);
          console.log("Parsed project:", project);
          setCurrentProject(project);

          // Fetch project columns to get the actual column ID
          console.log("Fetching columns for project ID:", project.id);
          projectService
            .getProjectColumns(project.id)
            .then((columns) => {
              console.log("Fetched columns:", columns);
              if (columns.length > 0) {
                const targetColumn =
                  columns.find((col: any) => col.id === columnId) || columns[0];
                console.log("Selected column:", targetColumn);
                setActualColumnId(targetColumn.id);
                console.groupEnd();
              } else {
                console.warn("⚠️ No columns found");
                console.groupEnd();
              }
            })
            .catch((error) => {
              console.error("❌ Failed to load project columns:", error);
              console.groupEnd();
            });
        } catch (error) {
          console.error("❌ Failed to parse project data:", error);
          console.groupEnd();
        }
      } else {
        console.warn("⚠️ No project data in localStorage");
        console.groupEnd();
      }
    }
  }, [open, isCreateMode, columnId]);

  // Reset form when ticket changes
  useEffect(() => {
    if (open) {
      setTitle(ticket?.name || "");
      setDescription(ticket?.description || "");
      setTicketType(ticket?.type || "task");
      setStatus(ticket?.status || "New");
      setPriority(ticket?.priorityId || 3);
      setTags(ticket?.tags || []);
      setDueDate(ticket?.dueDate ? dayjs(ticket.dueDate) : null);
      setStartDate(ticket?.startDate ? dayjs(ticket.startDate) : null);

      // Load project tags for autocomplete
      const projectData = localStorage.getItem("currentProject");
      if (projectData) {
        try {
          const project = JSON.parse(projectData);
          tagService
            .getTags(project.id)
            .then((response: any) => {
              // Handle both array response and paginated response
              const tags = Array.isArray(response)
                ? response
                : response.results || [];
              setProjectTags(tags);
            })
            .catch((error) => {
              console.error("Failed to load tags:", error);
              setProjectTags([]); // Ensure it's always an array
            });
        } catch (error) {
          console.error("Failed to parse project data:", error);
        }
      }
    }
  }, [open, ticket]);

  const handleSave = async () => {
    console.group("🎫 TicketModal - handleSave");
    console.log("Mode:", isCreateMode ? "CREATE" : "EDIT");
    console.log("Title:", title);
    console.log("Current project:", currentProject);
    console.log("Actual column ID:", actualColumnId);
    console.log("Passed column ID:", columnId);
    console.log("Ticket:", ticket);

    if (!title.trim()) {
      console.error("❌ No title!");
      message.error("Please enter a ticket title");
      console.groupEnd();
      return;
    }

    if (isCreateMode && !columnId) {
      console.error("❌ No column ID in create mode!");
      message.error("Column ID is required for creating tickets");
      console.groupEnd();
      return;
    }

    if (isCreateMode && !currentProject) {
      console.error("❌ No current project in create mode!");
      message.error("No project selected. Please create a project first.");
      console.groupEnd();
      return;
    }

    setSaving(true);
    try {
      const ticketData: CreateTicketData = {
        name: title,
        description,
        type: ticketType,
        status,
        priority_id: priority,
        column: isCreateMode
          ? actualColumnId || columnId || 1
          : ticket?.column || 1,
        project: isCreateMode
          ? currentProject.id
          : ticket?.project || currentProject?.id || 1,
        due_date: dueDate ? dueDate.format("YYYY-MM-DD") : undefined,
        start_date: startDate ? startDate.format("YYYY-MM-DD") : undefined,
      };

      console.log("📤 Ticket data to send:", ticketData);

      let savedTicket: Ticket;
      if (isCreateMode) {
        savedTicket = await ticketService.createTicket(ticketData);
        console.log("✅ Ticket created successfully:", savedTicket);
        message.success("Ticket created successfully!");
      } else if (ticket) {
        savedTicket = await ticketService.updateTicket(ticket.id, ticketData);
        console.log("✅ Ticket updated successfully:", savedTicket);
        message.success("Ticket updated successfully!");
      } else {
        console.error("❌ No ticket to update!");
        console.groupEnd();
        return;
      }

      console.groupEnd();
      onSuccess?.(savedTicket);
      onClose();
    } catch (error: any) {
      console.error("❌ Failed to save ticket:", error);
      console.error("Error details:", error.details || error.response || error);
      console.groupEnd();
      message.error(error.message || "Failed to save ticket");
    } finally {
      setSaving(false);
    }
  };

  if (!isCreateMode && !ticket) return null;

  const typeInfo = getTypeIcon(ticketType);

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
          maxHeight: "calc(100vh - 80px)",
          overflow: "hidden",
        },
      }}
      className="ticket-modal"
    >
      <style>
        {`
          .ticket-modal .ant-modal-content {
            padding: 0;
            overflow: hidden;
          }
          
          /* Custom scrollbar for modal body */
          .ticket-modal-body::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          .ticket-modal-body::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .ticket-modal-body::-webkit-scrollbar-thumb {
            background: #dfe1e6;
            border-radius: 4px;
          }
          
          .ticket-modal-body::-webkit-scrollbar-thumb:hover {
            background: #b3b9c4;
          }
          
          /* For Firefox */
          .ticket-modal-body {
            scrollbar-width: thin;
            scrollbar-color: #dfe1e6 transparent;
          }
        `}
      </style>
      <div
        className="ticket-modal-body"
        style={{
          maxHeight: "calc(100vh - 80px)",
          overflow: "auto",
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
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
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
                {isCreateMode
                  ? "NEW TICKET"
                  : `${ticketType.toUpperCase()}-${ticket?.id}`}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!isCreateMode && (
              <>
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
              </>
            )}
            <Button
              type="primary"
              size="small"
              onClick={handleSave}
              loading={saving}
              style={{ marginRight: "8px" }}
            >
              {isCreateMode ? "Create" : "Save"}
            </Button>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "16px" }}
              >
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
                value={status}
                onChange={setStatus}
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
                value={priority}
                onChange={setPriority}
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
                value={dueDate}
                onChange={setDueDate}
                style={{ width: "100%" }}
                size="small"
                placeholder="Add due date"
              />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#5e6c84",
                  marginBottom: "4px",
                }}
              >
                Tags
              </div>
              <Select
                mode="tags"
                value={tags}
                onChange={(value) => setTags(value)}
                size="small"
                placeholder="Type to add tags"
                style={{ width: "100%" }}
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={
                  Array.isArray(projectTags)
                    ? projectTags.map((tag) => ({
                        value: tag.name,
                        label: tag.name,
                      }))
                    : []
                }
                tokenSeparators={[","]}
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
                value={startDate}
                onChange={setStartDate}
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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
            {!isCreateMode && ticket && (
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
                <div>Created {ticket.created_at || ticket.createdAt}</div>
                <div>Updated {ticket.updated_at}</div>
              </div>
            )}

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
      </div>
    </Modal>
  );
};
