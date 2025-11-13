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
import { getPriorityIcon } from "./PriorityIcons";
import { useProject } from "../contexts/AppContext";
import {
  ticketService,
  projectService,
  tagService,
  companyService,
} from "../services";
import type { Ticket, CreateTicketData } from "../types/api";

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
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const { selectedProject, availableProjects, setSelectedProject } =
    useProject();
  const [actualColumnId, setActualColumnId] = useState<number | null>(null);
  const [openTickets, setOpenTickets] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [projectColumns, setProjectColumns] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);

  // Watch for project field changes
  const watchedProject = Form.useWatch("project", form);

  // Load project columns when modal opens or project changes
  useEffect(() => {
    if (open && selectedProject) {
      // Set initial project when modal opens
      form.setFieldValue("project", selectedProject.id);
    }
  }, [open, selectedProject, form]);

  // Fetch companies when modal opens
  useEffect(() => {
    if (open) {
      companyService
        .getAllCompanies()
        .then((companiesData) => {
          setCompanies(companiesData);
          console.log("Fetched companies:", companiesData.length);
        })
        .catch((error) => {
          console.error("❌ Failed to load companies:", error);
          setCompanies([]);
        });
    }
  }, [open]);

  // Load project data when project selection changes
  useEffect(() => {
    if (!open || !watchedProject) {
      // Reset state when closed or no project
      if (!open) {
        setProjectColumns([]);
        setActualColumnId(null);
        setOpenTickets([]);
        setProjectTags([]);
        setCurrentProjectId(null);
      }
      return;
    }

    // Only fetch if project actually changed
    if (watchedProject === currentProjectId) return;

    setCurrentProjectId(watchedProject);
    const project = availableProjects.find((p) => p.id === watchedProject);

    console.group("🔧 CreateTicketModal - Loading project data");
    console.log("Loading data for project ID:", watchedProject);
    console.log("Project key:", project?.key, "name:", project?.name);

    // Fetch project columns
    projectService
      .getProjectColumns(watchedProject)
      .then((columns) => {
        console.log("Fetched columns:", columns.length);
        setProjectColumns(columns);
        if (columns.length > 0) {
          const targetColumn =
            columns.find((col: any) => col.id === columnId) || columns[0];
          console.log(
            "Selected column ID:",
            targetColumn.id,
            "Name:",
            targetColumn.name
          );
          setActualColumnId(targetColumn.id);
          form.setFieldValue("column", targetColumn.id);
        } else {
          console.warn("⚠️ No columns found in project");
          setActualColumnId(null);
          message.warning(
            "This project has no columns. Please set up columns for this project first."
          );
        }
        console.groupEnd();
      })
      .catch((error) => {
        console.error("❌ Failed to load project columns:", error);
        console.groupEnd();
        message.error("Failed to load project columns");
        setProjectColumns([]);
        setActualColumnId(null);
      });

    // Fetch open tickets for parent selection
    ticketService
      .getTickets({ project: watchedProject })
      .then((response) => {
        const allTickets = response.results || [];
        const projectTickets = allTickets.filter(
          (t: any) => t.status !== "done"
        );
        setOpenTickets(projectTickets);
        console.log("Fetched open tickets:", projectTickets.length);
      })
      .catch((error) => {
        console.error("❌ Failed to load open tickets:", error);
        setOpenTickets([]);
      });

    // Fetch project tags
    tagService
      .getTags(watchedProject)
      .then((response: any) => {
        const tags = Array.isArray(response)
          ? response
          : response.results || [];
        setProjectTags(tags);
        console.log("Fetched project tags:", tags.length);
      })
      .catch((error) => {
        console.error("❌ Failed to load project tags:", error);
        setProjectTags([]);
      });
  }, [
    watchedProject,
    open,
    columnId,
    availableProjects,
    currentProjectId,
    form,
  ]);

  const handleSubmit = async (values: any) => {
    console.group("🎫 CreateTicketModal - handleSubmit");
    console.log("Form values:", JSON.stringify(values, null, 2));
    console.log(
      "Selected project ID:",
      selectedProject?.id,
      "key:",
      selectedProject?.key
    );
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
        urgency: values.urgency || "normal",
        importance: values.importance || "normal",
        column: values.column || actualColumnId, // Use selected column from form or the actual column ID
        project: selectedProject.id, // Use selected project from context
        company: values.company || undefined,
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
        handleClose(); // Use handleClose to properly reset form
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
    setCurrentProjectId(null);
    setShowDetailedForm(false);
    onClose();
  };

  const handleProjectChange = (projectId: number) => {
    // Clear related fields when project changes
    form.setFieldsValue({
      column: undefined,
      parent: undefined,
      tags: undefined,
    });
    setActualColumnId(null);
    setOpenTickets([]);
    setProjectTags([]);
    setProjectColumns([]);

    // Update the selected project in context if different
    const project = availableProjects.find((p) => p.id === projectId);
    if (project && project.id !== selectedProject?.id) {
      setSelectedProject(project);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={600}
      footer={null}
      closeIcon={null}
      style={{ top: 20, borderRadius: 8 }}
      styles={{
        body: {
          padding: 0,
          maxHeight: "calc(100vh - 80px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
        content: {
          borderRadius: 8,
          padding: 0,
        },
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 80px)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fafafa",
            position: "sticky",
            top: 0,
            zIndex: 10,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                color: "#262626",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Create {ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}
            </h1>
            <Button
              type="link"
              size="small"
              onClick={() => setShowDetailedForm(!showDetailedForm)}
              style={{
                fontSize: "12px",
                padding: "0 8px",
                height: "24px",
              }}
            >
              {showDetailedForm ? "Show simple form" : "Show detailed form"}
            </Button>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={handleClose}
            style={{ color: "#8c8c8c" }}
          />
        </div>

        {/* Form Content */}
        <div
          style={{
            padding: "16px",
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              type: "task",
              status: "new", // Use lowercase status
              priority: 3,
              reporter: 1,
            }}
            size="small"
          >
            {/* Project */}
            <Form.Item
              label="Space"
              name="project"
              required
              rules={[{ required: true, message: "Project is required" }]}
              style={{ marginBottom: "10px" }}
            >
              <Select
                placeholder="Select project"
                onChange={handleProjectChange}
                showSearch
                filterOption={(input, option) =>
                  (option?.children?.toString() ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {availableProjects.map((project) => (
                  <Option key={project.id} value={project.id}>
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
                        {project.key.substring(0, 2)}
                      </div>
                      <span>
                        {project.name} ({project.key})
                      </span>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Show detailed fields only when toggled */}
            {showDetailedForm && (
              <>
                {/* Work Type */}
                <Form.Item
                  label="Work type"
                  name="type"
                  required
                  rules={[{ required: true, message: "Work type is required" }]}
                  style={{ marginBottom: "10px" }}
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
                  style={{ marginBottom: "10px" }}
                >
                  <Select placeholder="Select column">
                    {projectColumns.map((col) => (
                      <Option key={col.id} value={col.id}>
                        {col.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            )}

            {/* Summary - Always visible */}
            <Form.Item
              label="Summary"
              name="summary"
              required
              rules={[{ required: true, message: "Summary is required" }]}
              style={{ marginBottom: "10px" }}
            >
              <Input placeholder="Enter a summary" />
            </Form.Item>

            {/* Description - Always visible */}
            <Form.Item
              label="Description"
              name="description"
              style={{ marginBottom: "10px" }}
            >
              <TextArea
                placeholder="Add description..."
                autoSize={{ minRows: 3, maxRows: 8 }}
              />
            </Form.Item>

            {/* Assignee and Due Date - Always visible in simple grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {/* Assignee */}
              <Form.Item
                label="Assignee"
                name="assignee"
                style={{ marginBottom: "10px" }}
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

              {/* Due date */}
              <Form.Item
                label="Due date"
                name="dueDate"
                style={{ marginBottom: "10px" }}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  placeholder="Add due date"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </div>

            {/* Detailed form fields */}
            {showDetailedForm && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {/* Company */}
                  <Form.Item
                    label="Company"
                    name="company"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select
                      placeholder="Select company"
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        ((option?.children ?? "") as string)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {companies.map((company) => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  {/* Parent */}
                  <Form.Item
                    label="Parent"
                    name="parent"
                    style={{ marginBottom: "10px" }}
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
                        label: `${
                          ticket.ticket_key ||
                          `${ticket.project_key || "TICK"}-${
                            ticket.project_number || ticket.id
                          }`
                        }: ${ticket.name}`,
                      }))}
                    />
                  </Form.Item>

                  {/* Priority */}
                  <Form.Item
                    label="Priority"
                    name="priority"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder="Select priority">
                      <Option value={1}>{getPriorityIcon(1)}</Option>
                      <Option value={2}>{getPriorityIcon(2)}</Option>
                      <Option value={3}>{getPriorityIcon(3)}</Option>
                      <Option value={4}>{getPriorityIcon(4)}</Option>
                    </Select>
                  </Form.Item>

                  {/* Urgency */}
                  <Form.Item
                    label="Urgency"
                    name="urgency"
                    initialValue="normal"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder="Select urgency">
                      <Option value="low">Low</Option>
                      <Option value="normal">Normal</Option>
                      <Option value="high">High</Option>
                    </Select>
                  </Form.Item>

                  {/* Importance */}
                  <Form.Item
                    label="Importance"
                    name="importance"
                    initialValue="normal"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder="Select importance">
                      <Option value="low">Low</Option>
                      <Option value="normal">Normal</Option>
                      <Option value="high">High</Option>
                      <Option value="critical">Critical</Option>
                    </Select>
                  </Form.Item>

                  {/* Due date */}
                  <Form.Item
                    label="Due date"
                    name="dueDate"
                    style={{ marginBottom: "10px" }}
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
                    style={{ marginBottom: "10px" }}
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
                    style={{ marginBottom: "10px" }}
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
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder="Select reporter" disabled>
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
              </>
            )}

            {/* Attachment - Only in detailed form */}
            {showDetailedForm && (
              <>
                <Form.Item
                  label="Attachment"
                  name="attachment"
                  style={{ marginBottom: "10px" }}
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
                  style={{ marginBottom: "10px" }}
                >
                  <div style={{ display: "flex", width: "100%" }}>
                    <Form.Item
                      name="linkedItemsType"
                      noStyle
                      initialValue="blocks"
                    >
                      <Select
                        placeholder="blocks"
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
                    </Form.Item>
                    <Form.Item name="linkedItemsValue" noStyle>
                      <Select
                        mode="multiple"
                        placeholder="Type, search or paste URL"
                        allowClear
                        showSearch
                        style={{
                          width: "70%",
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          marginLeft: -1,
                        }}
                      />
                    </Form.Item>
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
              </>
            )}
          </Form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fafafa",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
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
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={saving}
            >
              Create
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};
