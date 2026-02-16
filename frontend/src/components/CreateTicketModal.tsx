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
import { useTranslation } from 'react-i18next';
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
  initialCompanyId?: number;
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
  initialCompanyId,
}) => {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation('common');
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [, setTicketType] = useState("task");
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const { selectedProject, availableProjects, setSelectedProject } =
    useProject();
  const [actualColumnId, setActualColumnId] = useState<number | null>(null);
  const [openTickets, setOpenTickets] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [projectColumns, setProjectColumns] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Watch for project and company field changes
  const watchedProject = Form.useWatch("project", form);
  const watchedCompany = Form.useWatch("company", form);

  // Load project columns when modal opens or project changes
  useEffect(() => {
    if (open && selectedProject) {
      // Set initial project when modal opens
      form.setFieldValue("project", selectedProject.id);
      // Set initial project when modal opens
      form.setFieldValue("project", selectedProject.id);
    }
    if (open && initialCompanyId) {
      form.setFieldValue("company", initialCompanyId);
    }
  }, [open, selectedProject, form, initialCompanyId]);

  // Fetch companies scoped to current project when modal opens/project changes
  useEffect(() => {
    if (!open) {
      setCompanies([]);
      return;
    }

    const activeProjectId = watchedProject || selectedProject?.id;

    if (!activeProjectId) {
      setCompanies([]);
      return;
    }

    companyService
      .getAllCompanies(activeProjectId)
      .then((companiesData) => {
        setCompanies(companiesData);
      })
      .catch((error) => {
        console.error("❌ Failed to load companies:", error);
        setCompanies([]);
      });
  }, [open, watchedProject, selectedProject?.id]);

  // Fetch admins when project or company changes
  useEffect(() => {
    if (!open) {
      setAdmins([]);
      return;
    }

    const projectId = watchedProject || selectedProject?.id;
    if (!projectId) return;

    setLoadingAdmins(true);

    // If company is selected, fetch company admins
    // Otherwise fetch project admins
    const fetchPromise = watchedCompany
      ? companyService.getCompanyAdmins(watchedCompany)
      : projectService.getProjectAdmins(projectId);

    fetchPromise
      .then((users) => {
        setAdmins(users);
        // If current assignee is not in new list, clear it
        const currentAssignee = form.getFieldValue("assignee");
        if (
          currentAssignee &&
          !users.find((u: any) => u.id === currentAssignee)
        ) {
          form.setFieldValue("assignee", undefined);
        }
      })
      .catch((err) => {
        console.error("Failed to load admins:", err);
        setAdmins([]);
      })
      .finally(() => {
        setLoadingAdmins(false);
      });
  }, [open, watchedProject, watchedCompany, selectedProject?.id, form]);

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

    // Fetch project columns
    projectService
      .getProjectColumns(watchedProject)
      .then((columns) => {
        setProjectColumns(columns);
        if (columns.length > 0) {
          const targetColumn =
            columns.find((col: any) => col.id === columnId) || columns[0];
          setActualColumnId(targetColumn.id);
          form.setFieldValue("column", targetColumn.id);
        } else {
          setActualColumnId(null);
          message.warning(
            t('msg.noColumnsWarning')
          );
        }
      })
      .catch((error) => {
        console.error("❌ Failed to load project columns:", error);
        message.error(t('msg.failedLoad'));
        setProjectColumns([]);
        setActualColumnId(null);
      });

    // Fetch open tickets for parent selection
    ticketService
      .getTickets({ project: watchedProject, page_size: 1000 })
      .then((response) => {
        const allTickets = response.results || [];
        const projectTickets = allTickets.filter(
          (t: any) => t.status !== "done"
        );
        setOpenTickets(projectTickets);
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
    if (!selectedProject) {
      message.error(t('msg.noColumnsWarning'));
      return;
    }

    if (!actualColumnId) {
      message.error({
        content: t('msg.noColumnsWarning'),
        duration: 8,
      });
      return;
    }

    setSaving(true);
    try {
      // Handle tags: create new tags if needed and get tag IDs
      let tagIds: number[] = [];
      if (values.tags && values.tags.length > 0) {
        for (const tagName of values.tags) {
          // Check if tag exists in projectTags
          let existingTag = projectTags.find(
            (t: any) => t.name.toLowerCase() === tagName.toLowerCase()
          );

          if (!existingTag) {
            // Create new tag
            try {
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
      }

      const ticketData: CreateTicketData = {
        name: values.summary,
        description: values.description || "",
        type: values.type,
        priority_id: values.priority || 3,
        urgency: values.urgency || "normal",
        importance: values.importance || "normal",
        // Only include column if we have a valid one, otherwise use the new status system
        ...(actualColumnId ? { column: values.column || actualColumnId } : {}),
        // Default to 'open' status for new tickets in the Jira-style system
        ticket_status_key: "open",
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

      const newTicket = await ticketService.createTicket(ticketData);
      // message.success("Ticket created successfully!");

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
      message.error(error.message || t('msg.failedCreate'));
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
      company: undefined,
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
            borderBottom: "1px solid var(--color-border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--color-bg-sidebar)",
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
                fontSize: 'var(--fs-md)',
                fontWeight: 600,
                color: "var(--color-text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {t('createTicket')}
            </h1>
            <Button
              type="link"
              size="small"
              onClick={() => setShowDetailedForm(!showDetailedForm)}
              style={{
                fontSize: 'var(--fs-sm)',
                padding: "0 8px",
                height: "24px",
              }}
            >
              {showDetailedForm ? t('form.summary') : t('form.description')}
            </Button>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={handleClose}
            style={{ color: "var(--color-text-muted)" }}
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
              label={tCommon('field.project')}
              name="project"
              required
              rules={[{ required: true, message: tCommon('validation.required') }]}
              style={{ marginBottom: "10px" }}
            >
              <Select
                placeholder={tCommon('validation.pleaseSelect', { field: tCommon('field.project') })}
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
                          backgroundColor: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 'var(--fs-sm)',
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
                  label={t('form.type')}
                  name="type"
                  required
                  rules={[{ required: true, message: tCommon('validation.required') }]}
                  style={{ marginBottom: "10px" }}
                >
                  <Select
                    placeholder={t('form.typePlaceholder')}
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
                            fontSize: 'var(--fs-lg)',
                            color: getTypeIcon("task").color,
                          }}
                        />
                        <span>{tCommon('type.task')}</span>
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
                            fontSize: 'var(--fs-lg)',
                            color: getTypeIcon("bug").color,
                          }}
                        />
                        <span>{tCommon('type.bug')}</span>
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
                            fontSize: 'var(--fs-lg)',
                            color: getTypeIcon("story").color,
                          }}
                        />
                        <span>{tCommon('type.story')}</span>
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
                            fontSize: 'var(--fs-lg)',
                            color: getTypeIcon("epic").color,
                          }}
                        />
                        <span>{tCommon('type.epic')}</span>
                      </div>
                    </Option>
                  </Select>
                </Form.Item>

                {/* Column/Status */}
                <Form.Item
                  label={t('form.column')}
                  name="column"
                  style={{ marginBottom: "10px" }}
                >
                  <Select placeholder={t('form.columnPlaceholder')}>
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
              label={t('form.summary')}
              name="summary"
              required
              rules={[{ required: true, message: tCommon('validation.required') }]}
              style={{ marginBottom: "10px" }}
            >
              <Input placeholder={t('form.summaryPlaceholder')} />
            </Form.Item>

            {/* Description - Always visible */}
            <Form.Item
              label={t('form.description')}
              name="description"
              style={{ marginBottom: "10px" }}
            >
              <TextArea
                placeholder={t('form.descriptionPlaceholder')}
                autoSize={{ minRows: 3, maxRows: 8 }}
              />
            </Form.Item>

            {/* Company - moved here from detailed form */}
            <Form.Item
              label={t('form.company')}
              name="company"
              style={{ marginBottom: "10px" }}
            >
              <Select
                placeholder={t('form.companyPlaceholder')}
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

            {/* Assignee and Due Date - Always visible in simple grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {/* Assignee */}
              {/* Assignee */}
              <Form.Item
                label={t('form.assignee')}
                name="assignee"
                style={{ marginBottom: "10px" }}
              >
                <Select
                  placeholder={t('form.assigneePlaceholder')}
                  allowClear
                  showSearch
                  loading={loadingAdmins}
                  filterOption={(input, option) =>
                    (option?.children as any)?.props?.children[1]?.props?.children
                      ?.toLowerCase()
                      ?.includes(input.toLowerCase())
                  }
                >
                  {admins.map((user) => (
                    <Option key={user.id} value={user.id}>
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
                            backgroundColor: "var(--color-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 'var(--fs-sm)',
                            fontWeight: 600,
                          }}
                        >
                          {user.first_name?.[0] || user.username[0].toUpperCase()}
                        </div>
                        <span>
                          {user.first_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.username}
                        </span>
                      </div>
                    </Option>
                  ))}
                </Select>
                {/* Only show "Assign to me" if current user is an admin for this project/company */}
                {(() => {
                  const currentUser = localStorage.getItem("user");
                  if (!currentUser) return null;
                  try {
                    const user = JSON.parse(currentUser);
                    const isEligible = admins.some((admin) => admin.id === user.id);
                    
                    if (!isEligible) return null;

                    return (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          const currentAssignee = form.getFieldValue("assignee");
                          if (user.id && currentAssignee !== user.id) {
                             form.setFieldValue("assignee", user.id);
                          }
                        }}
                        style={{
                          padding: "4px 0",
                          height: "auto",
                          fontSize: 'var(--fs-sm)',
                        }}
                      >
                        {t('form.assignee')}
                      </Button>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
              </Form.Item>

              {/* Due date */}
              <Form.Item
                label={t('form.dueDate')}
                name="dueDate"
                required
                rules={[{ required: true, message: tCommon('validation.required') }]}
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
                  {/* Company was here - moved up */}

                  {/* Parent */}
                  <Form.Item
                    label={t('form.parent')}
                    name="parent"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select
                      placeholder={t('form.parentPlaceholder')}
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
                    label={t('form.priority')}
                    name="priority"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder={t('form.priorityPlaceholder')}>
                      <Option value={1}>{getPriorityIcon(1)}</Option>
                      <Option value={2}>{getPriorityIcon(2)}</Option>
                      <Option value={3}>{getPriorityIcon(3)}</Option>
                      <Option value={4}>{getPriorityIcon(4)}</Option>
                    </Select>
                  </Form.Item>

                  {/* Urgency */}
                  <Form.Item
                    label={tCommon('priority.urgent')}
                    name="urgency"
                    initialValue="normal"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder={tCommon('validation.pleaseSelect', { field: tCommon('priority.urgent') })}>
                      <Option value="low">{tCommon('priority.low')}</Option>
                      <Option value="normal">{tCommon('priority.normal')}</Option>
                      <Option value="high">{tCommon('priority.high')}</Option>
                    </Select>
                  </Form.Item>

                  {/* Importance */}
                  <Form.Item
                    label={tCommon('priority.critical')}
                    name="importance"
                    initialValue="normal"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder={tCommon('validation.pleaseSelect', { field: tCommon('priority.critical') })}>
                      <Option value="low">{tCommon('priority.low')}</Option>
                      <Option value="normal">{tCommon('priority.normal')}</Option>
                      <Option value="high">{tCommon('priority.high')}</Option>
                      <Option value="critical">{tCommon('priority.critical')}</Option>
                    </Select>
                  </Form.Item>

                  {/* Due date */}
                  <Form.Item
                    label={t('form.dueDate')}
                    name="dueDate"
                    style={{ marginBottom: "10px" }}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      placeholder={t('form.dueDate')}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>



                  {/* Start date */}
                  <Form.Item
                    label={t('form.dueDate')}
                    name="startDate"
                    style={{ marginBottom: "10px" }}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      placeholder={t('form.dueDate')}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>

                  {/* Reporter */}
                  <Form.Item
                    label={t('form.reporter')}
                    name="reporter"
                    style={{ marginBottom: "10px" }}
                  >
                    <Select placeholder={t('form.reporter')} disabled>
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
                              backgroundColor: "var(--color-primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 'var(--fs-sm)',
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
                  label={t('form.attachments')}
                  name="attachment"
                  style={{ marginBottom: "10px" }}
                >
                  <div
                    style={{
                      border: "2px dashed var(--color-border)",
                      borderRadius: "3px",
                      padding: "12px",
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      backgroundColor: "var(--color-bg-sidebar)",
                      fontSize: 'var(--fs-caption)',
                    }}
                  >
                    {t('form.attachments')}{" "}
                    <Button type="link" size="small" style={{ padding: 0 }}>
                      {tCommon('btn.upload')}
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
                    <span style={{ color: "var(--color-text-heading)", fontSize: 'var(--fs-caption)' }}>
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
            borderTop: "1px solid var(--color-border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--color-bg-sidebar)",
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
            style={{ fontSize: 'var(--fs-caption)' }}
          >
            {t('createTicket')}
          </Checkbox>
          <Space size="small">
            <Button onClick={handleClose}>{tCommon('btn.cancel')}</Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={saving}
            >
              {tCommon('btn.create')}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};
