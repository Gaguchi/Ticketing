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
import { useProject } from "../contexts/ProjectContext";
import {
  ticketService,
  projectService,
  columnService,
  tagService,
  type CreateTicketData,
} from "../services";

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
  const { selectedProject } = useProject();
  const [actualColumnId, setActualColumnId] = useState<number | null>(null);
  const [creatingColumns, setCreatingColumns] = useState(false);
  const [openTickets, setOpenTickets] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [projectColumns, setProjectColumns] = useState<any[]>([]);

  // Load project columns when modal opens or project changes
  useEffect(() => {
    if (open && selectedProject) {
      console.group("🔧 CreateTicketModal - Loading project and columns");
      console.log("Modal opened with columnId:", columnId);
      console.log("Selected project:", selectedProject);

      form.setFieldValue("project", selectedProject.id);

      // Fetch project columns to get the actual first column ID
      console.log("Fetching columns for project ID:", selectedProject.id);
      projectService
        .getProjectColumns(selectedProject.id)
        .then((columns) => {
          console.log("Fetched columns:", columns);
          setProjectColumns(columns);
          if (columns.length > 0) {
            // Use the first column or the specified columnId if it exists in this project
            const targetColumn =
              columns.find((col: any) => col.id === columnId) || columns[0];
            console.log("Selected column:", targetColumn);
            setActualColumnId(targetColumn.id);
            // Set default column value in form
            form.setFieldValue("column", targetColumn.id);
            console.groupEnd();
          } else {
            console.warn("⚠️ No columns found in project");
            console.groupEnd();

            // Offer to create default columns
            Modal.confirm({
              title: "No Columns Found",
              content:
                "This project has no columns. Would you like to create default columns now?",
              okText: "Create Columns",
              cancelText: "Cancel",
              onOk: async () => {
                setCreatingColumns(true);
                try {
                  const result = await columnService.createDefaults(
                    selectedProject.id
                  );
                  message.success(result.message);

                  // Set the first column as active
                  if (result.columns.length > 0) {
                    setActualColumnId(result.columns[0].id);
                  }
                } catch (error: any) {
                  console.error("❌ Failed to create default columns:", error);
                  message.error(
                    error.response?.data?.error ||
                      "Failed to create default columns"
                  );
                } finally {
                  setCreatingColumns(false);
                }
              },
            });
          }
        })
        .catch((error) => {
          console.error("❌ Failed to load project columns:", error);
          console.groupEnd();
          message.error("Failed to load project columns");
        });

      // Fetch open tickets for parent selection
      ticketService
        .getTickets(selectedProject.id)
        .then((response) => {
          const allTickets = response.results || [];
          // Filter to exclude done status
          const projectTickets = allTickets.filter(
            (t: any) => t.status !== "done"
          );
          setOpenTickets(projectTickets);
          console.log(
            "Fetched open tickets for parent selection:",
            projectTickets.length
          );
        })
        .catch((error) => {
          console.error("❌ Failed to load open tickets:", error);
        });

      // Fetch project tags for autocomplete
      tagService
        .getTags(selectedProject.id)
        .then((response: any) => {
          // Handle both array response and paginated response
          const tags = Array.isArray(response)
            ? response
            : response.results || [];
          setProjectTags(tags);
          console.log("Fetched project tags:", tags.length);
        })
        .catch((error) => {
          console.error("❌ Failed to load project tags:", error);
          setProjectTags([]); // Ensure it's always an array
        });
    } else if (open && !selectedProject) {
      console.warn("⚠️ No project selected");
      message.warning("No project selected. Please select a project first.");
    }
  }, [open, form, columnId, selectedProject]);

  const handleSubmit = async (values: any) => {
    console.group("🎫 CreateTicketModal - handleSubmit");
    console.log("Form values:", JSON.stringify(values, null, 2));
    console.log("Selected project:", selectedProject);
    console.log("Actual column ID:", actualColumnId);
    console.log("Passed column ID:", columnId);

    if (!selectedProject) {
      console.error("❌ No selected project!");
      message.error("No project selected. Please select a project first.");
      console.groupEnd();
      return;
    }

    if (!actualColumnId) {
      console.error("❌ No actual column ID!");
      message.error({
        content:
          "This project has no columns. Please create a new project (the old one was created before columns were added automatically).",
        duration: 8,
      });
      console.groupEnd();
      return;
    }

    setSaving(true);
    try {
      // Handle tags: create new tags if needed and get tag IDs
      let tagIds: number[] = [];
      if (values.tags && values.tags.length > 0) {
        console.log("Processing tags:", values.tags);

        for (const tagName of values.tags) {
          // Check if tag exists in projectTags
          let existingTag = projectTags.find(
            (t: any) => t.name.toLowerCase() === tagName.toLowerCase()
          );

          if (!existingTag) {
            // Create new tag
            try {
              console.log(`Creating new tag: ${tagName}`);
              const newTag = await tagService.createTag({
                name: tagName,
                color: "#0052cc", // Default color
                project: selectedProject.id,
              });
              existingTag = newTag;
              // Add to projectTags for next time
              setProjectTags((prev) => [...prev, newTag]);
            } catch (error) {
              console.error(`Failed to create tag ${tagName}:`, error);
              // Continue with other tags
              continue;
            }
          }

          if (existingTag) {
            tagIds.push(existingTag.id);
          }
        }
        console.log("Final tag IDs:", tagIds);
      }

      const ticketData: CreateTicketData = {
        name: values.summary,
        description: values.description || "",
        type: values.type,
        priority_id: values.priority || 3,
        column: values.column || actualColumnId, // Use selected column from form or the actual column ID
        project: selectedProject.id, // Use selected project from context
        assignee_ids: values.assignee ? [values.assignee] : undefined,
        parent: values.parent || undefined,
        tags: tagIds.length > 0 ? tagIds : undefined,
        due_date: values.dueDate
          ? dayjs(values.dueDate).format("YYYY-MM-DD")
          : undefined,
        start_date: values.startDate
          ? dayjs(values.startDate).format("YYYY-MM-DD")
          : undefined,
      };

      console.log(
        "📤 Ticket data to send:",
        JSON.stringify(ticketData, null, 2)
      );

      const newTicket = await ticketService.createTicket(ticketData);
      console.log(
        "✅ Ticket created successfully:",
        JSON.stringify(newTicket, null, 2)
      );
      console.groupEnd();
      message.success("Ticket created successfully!");

      onSuccess?.(newTicket);

      if (createAnother) {
        // Reset form but keep type and project
        form.resetFields();
        form.setFieldValue("type", values.type);
        form.setFieldValue("project", selectedProject.id);
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error("❌ Failed to create ticket:", error);
      console.error("Error details:", error.details || error.response || error);
      console.groupEnd();
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
              status: "new", // Use lowercase status
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
                {selectedProject && (
                  <Option value={selectedProject.id}>
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
                        {selectedProject.key.substring(0, 2)}
                      </div>
                      <span>
                        {selectedProject.name} ({selectedProject.key})
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

            {/* Column/Status */}
            <Form.Item
              label="Column"
              name="column"
              style={{ marginBottom: "12px" }}
            >
              <Select placeholder="Select column">
                {projectColumns.map((col) => (
                  <Option key={col.id} value={col.id}>
                    {col.name}
                  </Option>
                ))}
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
                <Select
                  placeholder="Select parent ticket"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={openTickets.map((ticket: any) => ({
                    value: ticket.id,
                    label: `${ticket.project_key || "TICK"}-${ticket.id}: ${
                      ticket.name
                    }`,
                  }))}
                />
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
                  mode="tags"
                  placeholder="Type to add tags (e.g., Nikora, Nokia, High Priority)"
                  allowClear
                  showSearch
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
              <div style={{ display: "flex", width: "100%" }}>
                <Select
                  placeholder="blocks"
                  defaultValue="blocks"
                  style={{
                    width: "30%",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }}
                >
                  <Option value="blocks">blocks</Option>
                  <Option value="is blocked by">is blocked by</Option>
                  <Option value="relates to">relates to</Option>
                  <Option value="duplicates">duplicates</Option>
                </Select>
                <Select
                  mode="multiple"
                  placeholder="Type, search or paste URL"
                  style={{
                    width: "70%",
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    marginLeft: -1,
                  }}
                  allowClear
                  showSearch
                />
              </div>
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
              loading={saving || creatingColumns}
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
