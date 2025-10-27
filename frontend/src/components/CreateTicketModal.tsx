import React, { useState, useEffect } from "react";
import {
  Modal,
  Input,
  Select,
  DatePicker,
  Button,
  Form,
  message,
  Space,
  Checkbox,
} from "antd";
import { CloseOutlined } from "@ant-design/icons";
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
import { ticketService, type CreateTicketData } from "../services";

const { TextArea } = Input;
const { Option } = Select;

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  columnId?: number;
  onSuccess?: (ticket: Ticket) => void;
}

const getTypeIcon = (type: string) => {
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

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  open,
  onClose,
  columnId = 1,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [ticketType, setTicketType] = useState("task");
  const [currentProject, setCurrentProject] = useState<any>(null);

  // Load current project from localStorage when modal opens
  useEffect(() => {
    if (open) {
      const projectData = localStorage.getItem("currentProject");
      if (projectData) {
        try {
          const project = JSON.parse(projectData);
          setCurrentProject(project);
          form.setFieldValue("project", project.id);
        } catch (error) {
          console.error("Failed to load current project:", error);
          message.error("Failed to load project information");
        }
      } else {
        message.warning("No project selected. Please create a project first.");
      }
    }
  }, [open, form]);

  const handleSubmit = async (values: any) => {
    if (!currentProject) {
      message.error("No project selected. Please create a project first.");
      return;
    }

    setSaving(true);
    try {
      const ticketData: CreateTicketData = {
        name: values.summary,
        description: values.description || "",
        type: values.type,
        status: values.status || "New",
        priority_id: values.priority || 3,
        column: columnId,
        project: currentProject.id, // Use current project
        due_date: values.dueDate
          ? dayjs(values.dueDate).format("YYYY-MM-DD")
          : undefined,
        start_date: values.startDate
          ? dayjs(values.startDate).format("YYYY-MM-DD")
          : undefined,
      };

      const newTicket = await ticketService.createTicket(ticketData);
      message.success("Ticket created successfully!");

      onSuccess?.(newTicket);

      if (createAnother) {
        // Reset form but keep type and project
        form.resetFields();
        form.setFieldValue("type", values.type);
        form.setFieldValue("project", currentProject.id);
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error("Failed to create ticket:", error);
      message.error(error.message || "Failed to create ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setCreateAnother(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={680}
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
    >
      <div
        style={{
          maxHeight: "calc(100vh - 80px)",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid #dfe1e6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fff",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 500,
              color: "#172b4d",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Create {ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}
          </h1>
          <div style={{ display: "flex", gap: "4px" }}>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={handleClose}
              style={{ color: "#5e6c84" }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div style={{ padding: "16px 20px", flex: 1 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              type: "task",
              status: "New",
              priority: 3,
            }}
            size="middle"
          >
            {/* Project */}
            <Form.Item
              label="Space"
              name="project"
              required
              rules={[{ required: true, message: "Project is required" }]}
              style={{ marginBottom: "12px" }}
            >
              <Select placeholder="Select project" disabled>
                {currentProject && (
                  <Option value={currentProject.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "3px",
                          backgroundColor: "#0052cc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {currentProject.key.substring(0, 2)}
                      </div>
                      <span>
                        {currentProject.name} ({currentProject.key})
                      </span>
                    </div>
                  </Option>
                )}
              </Select>
            </Form.Item>

            {/* Work Type */}
            <Form.Item
              label="Work type"
              name="type"
              required
              rules={[{ required: true, message: "Work type is required" }]}
              style={{ marginBottom: "12px" }}
            >
              <Select
                placeholder="Select type"
                onChange={(value) => setTicketType(value)}
              >
                <Option value="task">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={getTypeIcon("task").icon}
                      style={{
                        fontSize: "16px",
                        color: getTypeIcon("task").color,
                      }}
                    />
                    <span>Task</span>
                  </div>
                </Option>
                <Option value="bug">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={getTypeIcon("bug").icon}
                      style={{
                        fontSize: "16px",
                        color: getTypeIcon("bug").color,
                      }}
                    />
                    <span>Bug</span>
                  </div>
                </Option>
                <Option value="story">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={getTypeIcon("story").icon}
                      style={{
                        fontSize: "16px",
                        color: getTypeIcon("story").color,
                      }}
                    />
                    <span>Story</span>
                  </div>
                </Option>
                <Option value="epic">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={getTypeIcon("epic").icon}
                      style={{
                        fontSize: "16px",
                        color: getTypeIcon("epic").color,
                      }}
                    />
                    <span>Epic</span>
                  </div>
                </Option>
              </Select>
            </Form.Item>

            {/* Status */}
            <Form.Item
              label="Status"
              name="status"
              style={{ marginBottom: "12px" }}
            >
              <Select placeholder="Select status" disabled>
                <Option value="New">To Do</Option>
              </Select>
            </Form.Item>

            {/* Summary */}
            <Form.Item
              label="Summary"
              name="summary"
              required
              rules={[{ required: true, message: "Summary is required" }]}
              style={{ marginBottom: "12px" }}
            >
              <Input placeholder="Enter a summary" />
            </Form.Item>

            {/* Description */}
            <Form.Item
              label="Description"
              name="description"
              style={{ marginBottom: "12px" }}
            >
              <TextArea
                placeholder="Add description..."
                autoSize={{ minRows: 3, maxRows: 8 }}
              />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {/* Assignee */}
              <Form.Item
                label="Assignee"
                name="assignee"
                style={{ marginBottom: "12px" }}
              >
                <Select placeholder="Automatic" allowClear showSearch>
                  <Option value={1}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: "#0052cc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        BK
                      </div>
                      <span>Boris Karaya</span>
                    </div>
                  </Option>
                </Select>
              </Form.Item>

              {/* Parent */}
              <Form.Item
                label="Parent"
                name="parent"
                style={{ marginBottom: "12px" }}
              >
                <Select placeholder="Select parent" allowClear showSearch />
              </Form.Item>

              {/* Priority */}
              <Form.Item
                label="Priority"
                name="priority"
                style={{ marginBottom: "12px" }}
              >
                <Select placeholder="Select priority">
                  <Option value={1}>{getPriorityIcon(1)}</Option>
                  <Option value={2}>{getPriorityIcon(2)}</Option>
                  <Option value={3}>{getPriorityIcon(3)}</Option>
                  <Option value={4}>{getPriorityIcon(4)}</Option>
                </Select>
              </Form.Item>

              {/* Due date */}
              <Form.Item
                label="Due date"
                name="dueDate"
                style={{ marginBottom: "12px" }}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  placeholder="Add due date"
                  format="YYYY-MM-DD"
                />
              </Form.Item>

              {/* Tags */}
              <Form.Item
                label="Tags"
                name="tags"
                style={{ marginBottom: "12px" }}
              >
                <Select
                  mode="multiple"
                  placeholder="Add tags"
                  allowClear
                  options={[
                    { value: 1, label: "TechCorp Solutions" },
                    { value: 2, label: "RetailMax Inc" },
                    { value: 3, label: "High Priority" },
                    { value: 4, label: "StartupHub" },
                    { value: 5, label: "DataFlow Systems" },
                  ]}
                />
              </Form.Item>

              {/* Start date */}
              <Form.Item
                label="Start date"
                name="startDate"
                style={{ marginBottom: "12px" }}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  placeholder="Add date"
                  format="YYYY-MM-DD"
                />
              </Form.Item>

              {/* Reporter */}
              <Form.Item
                label="Reporter"
                name="reporter"
                style={{ marginBottom: "12px" }}
              >
                <Select placeholder="Select reporter" defaultValue={1} disabled>
                  <Option value={1}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: "#0052cc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        BK
                      </div>
                      <span>Boris Karaya</span>
                    </div>
                  </Option>
                </Select>
              </Form.Item>
            </div>

            {/* Attachment */}
            <Form.Item
              label="Attachment"
              name="attachment"
              style={{ marginBottom: "12px" }}
            >
              <div
                style={{
                  border: "2px dashed #dfe1e6",
                  borderRadius: "3px",
                  padding: "12px",
                  textAlign: "center",
                  color: "#5e6c84",
                  cursor: "pointer",
                  backgroundColor: "#fafbfc",
                  fontSize: "13px",
                }}
              >
                Drop files to attach or{" "}
                <Button type="link" size="small" style={{ padding: 0 }}>
                  Browse
                </Button>
              </div>
            </Form.Item>

            {/* Linked Work items */}
            <Form.Item
              label="Linked Work items"
              name="linkedItems"
              style={{ marginBottom: "12px" }}
            >
              <Space.Compact style={{ width: "100%" }}>
                <Select
                  placeholder="blocks"
                  defaultValue="blocks"
                  style={{ width: "30%" }}
                >
                  <Option value="blocks">blocks</Option>
                  <Option value="is blocked by">is blocked by</Option>
                  <Option value="relates to">relates to</Option>
                  <Option value="duplicates">duplicates</Option>
                </Select>
                <Select
                  mode="multiple"
                  placeholder="Type, search or paste URL"
                  style={{ width: "70%" }}
                  allowClear
                  showSearch
                />
              </Space.Compact>
            </Form.Item>

            {/* Flagged */}
            <Form.Item
              name="flagged"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Checkbox>
                <span style={{ color: "#172b4d", fontSize: "13px" }}>
                  Impediment
                </span>
              </Checkbox>
            </Form.Item>
          </Form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #dfe1e6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fff",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
          }}
        >
          <Checkbox
            checked={createAnother}
            onChange={(e) => setCreateAnother(e.target.checked)}
            style={{ fontSize: "13px" }}
          >
            Create another
          </Checkbox>
          <Space size="small">
            <Button onClick={handleClose} size="middle">
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={saving}
              size="middle"
            >
              Create
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};
