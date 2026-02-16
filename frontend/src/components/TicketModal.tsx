import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Select,
  DatePicker,
  Avatar,
  message,
  Dropdown,
  Checkbox,
  Input,
  Space,
  Divider,
  Tooltip,
  Drawer,
  Typography,
} from "antd";
import { useTranslation } from 'react-i18next';
import {
  ShareAltOutlined,
  EllipsisOutlined,
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined,
  CloseOutlined,
  UserOutlined,
  HistoryOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
  faLink,
} from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "./TicketModal.css";
import { TicketChatPanel } from "./TicketChatPanel";
import { TicketHistory } from "./TicketHistory";
import { getPriorityIcon } from "./PriorityIcons";
import {
  ticketService,
  projectService,
  companyService,
  userService,
  subtaskService,
  type Subtask,
  linkedItemService,
  LINK_TYPES,
  type IssueLink,
  type LinkedTicket,
} from "../services";
import type {
  Ticket,
  CreateTicketData,
  TicketUrgency,
  TicketImportance,
  User,
  Project,
  BoardColumn,
} from "../types/api";

const { Option } = Select;
const { Text } = Typography;

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  mode?: "create" | "edit";
  columnId?: number;
  onSuccess?: (ticket: Ticket) => void;
  boardColumns?: BoardColumn[]; // For Jira-style status dropdown
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

// Priority labels - will be replaced with translated versions in component
const PRIORITY_LABELS: Record<number, string> = {
  1: "Backlog",
  2: "Normal",
  3: "High",
  4: "Urgent",
};

// Quill editor modules configuration
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

export const TicketModal: React.FC<TicketModalProps> = ({
  open,
  onClose,
  ticket,
  mode = "edit",
  columnId,
  onSuccess,
  boardColumns = [],
}) => {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation('common');
  const isCreateMode = mode === "create";

  // Form state
  const [title, setTitle] = useState(ticket?.name || "");
  const [description, setDescription] = useState(ticket?.description || "");
  const [ticketType, setTicketType] = useState(ticket?.type || "task");
  const [selectedColumn, setSelectedColumn] = useState(
    ticket?.column || columnId || 1,
  );
  const [selectedStatusKey, setSelectedStatusKey] = useState<string | null>(
    ticket?.ticket_status_key || null,
  );
  const [priority, setPriority] = useState(ticket?.priority_id || 2); // Default: Normal
  const [urgency, _setUrgency] = useState<TicketUrgency>(
    (ticket?.urgency as TicketUrgency) || "normal",
  );
  const [importance, _setImportance] = useState<TicketImportance>(
    (ticket?.importance as TicketImportance) || "normal",
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    ticket?.project || null,
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    ticket?.company || null,
  );
  const [assignees, setAssignees] = useState<number[]>(
    ticket?.assignees?.map((a: any) => a.id) || [],
  );
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(
    ticket?.due_date ? dayjs(ticket.due_date) : null,
  );
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    ticket?.start_date ? dayjs(ticket.start_date) : null,
  );

  // UI State
  const [_saving, setSaving] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Data State
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [projectColumns, setProjectColumns] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]); // Admins who can be assigned
  const [loadingAssignableUsers, setLoadingAssignableUsers] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Subtask & Links state
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [linkedItems, setLinkedItems] = useState<IssueLink[]>([]);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkType, setNewLinkType] = useState("");
  const [selectedTargetTicket, setSelectedTargetTicket] = useState<
    number | null
  >(null);
  const [ticketSearchResults, setTicketSearchResults] = useState<
    LinkedTicket[]
  >([]);
  const [_searchingTickets, setSearchingTickets] = useState(false);
  const [_archiveActionLoading, setArchiveActionLoading] = useState(false);

  const typeInfo = getTypeIcon(ticketType);

  // --- Effects & Logic Methods ---

  const handleArchiveTicket = async () => {
    if (!ticket?.id) return;
    setArchiveActionLoading(true);
    try {
      const updatedTicket = await ticketService.archiveTicket(ticket.id);
      message.success(t('msg.ticketArchived'));
      onSuccess?.(updatedTicket);
      onClose();
    } catch (e) {
      message.error(t('msg.failedMove'));
    } finally {
      setArchiveActionLoading(false);
    }
  };

  const handleRestoreTicket = async () => {
    if (!ticket?.id) return;
    setArchiveActionLoading(true);
    try {
      const updatedTicket = await ticketService.restoreTicket(ticket.id);
      message.success(t('msg.ticketRestored'));
      onSuccess?.(updatedTicket);
    } catch (e) {
      message.error(t('msg.failedRestore'));
    } finally {
      setArchiveActionLoading(false);
    }
  };

  // 1. Init Data
  useEffect(() => {
    if (open) {
      if (availableProjects.length === 0)
        projectService
          .getAllProjects()
          .then(setAvailableProjects)
          .catch(console.error);
      // Load all users for reference (e.g., reporter display)
      if (availableUsers.length === 0)
        userService.getAllUsers().then(setAvailableUsers).catch(console.error);

      const projectData = localStorage.getItem("currentProject");
      if (projectData) setCurrentProject(JSON.parse(projectData));
    }
  }, [open]);

  // 2. Sync Props
  useEffect(() => {
    if (open && ticket) {
      setTitle(ticket.name || "");
      setDescription(ticket.description || "");
      setTicketType(ticket.type || "task");
      setSelectedColumn(ticket.column || 1);
      setSelectedStatusKey(ticket.ticket_status_key || null);
      setPriority(ticket.priority_id || 3);
      setSelectedProjectId(ticket.project || null);
      setSelectedCompanyId(ticket.company || null);
      setAssignees(ticket.assignees?.map((a: any) => a.id) || []);
      setDueDate(ticket.due_date ? dayjs(ticket.due_date) : null);
      setStartDate(ticket.start_date ? dayjs(ticket.start_date) : null);
      setIsEditingDescription(false); // Reset edit mode
    } else if (open && isCreateMode) {
      // Reset for create
      setTitle("");
      setDescription("");
      setAssignees([]);
      setDueDate(null);
      setSelectedStatusKey(null);
      setIsEditingDescription(true); // Default to edit for new tickets
    }
  }, [open, ticket, isCreateMode]);

  // 3. Load Project Data
  useEffect(() => {
    if (open && selectedProjectId) {
      projectService
        .getProjectColumns(selectedProjectId)
        .then(setProjectColumns)
        .catch(console.error);
      setLoadingCompanies(true);
      companyService
        .getAllCompanies(selectedProjectId)
        .then(setCompanies)
        .finally(() => setLoadingCompanies(false));
    }
  }, [open, selectedProjectId]);

  // 3.5. Load assignable users from backend (handles company/project logic server-side)
  useEffect(() => {
    if (open && ticket?.id && !isCreateMode) {
      // For existing tickets, use the backend endpoint that handles the logic
      setLoadingAssignableUsers(true);
      ticketService
        .getAssignableUsers(ticket.id)
        .then(setAssignableUsers)
        .catch(console.error)
        .finally(() => setLoadingAssignableUsers(false));
    } else if (open && selectedProjectId && isCreateMode) {
      // For new tickets, load project admins (company can be selected later)
      setLoadingAssignableUsers(true);
      const fetchPromise = selectedCompanyId
        ? companyService.getCompanyAdmins(selectedCompanyId)
        : projectService.getProjectAdmins(selectedProjectId);

      fetchPromise
        .then(setAssignableUsers)
        .catch(console.error)
        .finally(() => setLoadingAssignableUsers(false));
    }
  }, [
    open,
    ticket?.id,
    ticket?.company,
    selectedProjectId,
    selectedCompanyId,
    isCreateMode,
  ]);

  // 4. Load Subtasks & Links
  useEffect(() => {
    if (open && ticket?.id && !isCreateMode) {
      subtaskService
        .getSubtasks(ticket.id)
        .then(setSubtasks)
        .catch(console.error);
      linkedItemService
        .getLinkedItems(ticket.id)
        .then(setLinkedItems)
        .catch(console.error);
    } else {
      setSubtasks([]);
      setLinkedItems([]);
    }
  }, [open, ticket?.id]);

  // --- Handlers ---

  const handleSave = async () => {
    if (!title.trim()) {
      message.error(tCommon('validation.required'));
      return;
    }
    setSaving(true);
    try {
      const ticketData: CreateTicketData = {
        name: title,
        description,
        type: ticketType,
        priority_id: priority,
        urgency,
        importance,
        column: selectedColumn,
        project:
          selectedProjectId ||
          (isCreateMode ? currentProject?.id : ticket?.project),
        company: selectedCompanyId || undefined,
        due_date: dueDate ? dueDate.format("YYYY-MM-DD") : null,
        start_date: startDate ? startDate.format("YYYY-MM-DD") : null,
        assignee_ids: assignees,
      };

      let savedTicket: Ticket;
      if (isCreateMode)
        savedTicket = await ticketService.createTicket(ticketData);
      else if (ticket) {
        savedTicket = await ticketService.updateTicket(ticket.id, ticketData);
        message.success(tCommon('msg.success.saved'));
      } else return;

      onSuccess?.(savedTicket);
      if (isCreateMode) onClose();
      setIsEditingDescription(false);
    } catch (e) {
      message.error(tCommon('msg.error.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !ticket?.id) return;
    setAddingSubtask(true);
    try {
      const s = await subtaskService.createSubtask({
        ticket: ticket.id,
        title: newSubtaskTitle.trim(),
      });
      setSubtasks([...subtasks, s]);
      setNewSubtaskTitle("");
    } catch (e) {
      message.error(tCommon('msg.error.saveFailed'));
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (id: number, checked: boolean) => {
    await subtaskService.toggleComplete(id, checked);
    setSubtasks(
      subtasks.map((s) => (s.id === id ? { ...s, is_completed: checked } : s)),
    );
  };

  const handleDeleteSubtask = async (id: number) => {
    await subtaskService.deleteSubtask(id);
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSearchTickets = async (val: string) => {
    if (val.length < 2) return;
    setSearchingTickets(true);
    try {
      const res = await linkedItemService.searchTickets(val, ticket?.project);
      setTicketSearchResults(res.filter((t) => t.id !== ticket?.id));
    } finally {
      setSearchingTickets(false);
    }
  };

  const handleAddLink = async () => {
    if (!ticket?.id || !selectedTargetTicket || !newLinkType) return;
    setAddingLink(true);
    try {
      const l = await linkedItemService.createLink({
        source_ticket_id: ticket.id,
        target_ticket_id: selectedTargetTicket,
        link_type: newLinkType,
      });
      setLinkedItems([...linkedItems, l]);
      setAddingLink(false);
      setSelectedTargetTicket(null);
    } catch (e) {
      message.error(tCommon('msg.error.saveFailed'));
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (id: number) => {
    await linkedItemService.deleteLink(id);
    setLinkedItems(linkedItems.filter((l) => l.id !== id));
  };

  if (!isCreateMode && !ticket) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="90%"
      style={{ maxWidth: "1600px", minWidth: "1000px" }}
      centered
      footer={null}
      closeIcon={null}
      className="ticket-modal-overhaul"
      styles={{ body: { padding: 0, height: "85vh", overflow: "hidden" } }}
    >
      <div className="ticket-modal-container">
        {/* HEADER */}
        <div className="ticket-modal-header">
          <div className="header-left">
            <Space size={12}>
              {/* Type Icon (Subtle) */}
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "task",
                      label: tCommon('type.task'),
                      icon: (
                        <FontAwesomeIcon icon={faCheckSquare} color="#4bade8" />
                      ),
                      onClick: async () => {
                        setTicketType("task");
                        if (ticket?.id) {
                          try {
                            await ticketService.updateTicket(ticket.id, {
                              type: "task",
                            });
                            message.success(t('msg.ticketUpdated'));
                            onSuccess?.({ ...ticket, type: "task" } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      },
                    },
                    {
                      key: "bug",
                      label: tCommon('type.bug'),
                      icon: <FontAwesomeIcon icon={faBug} color="#e5493a" />,
                      onClick: async () => {
                        setTicketType("bug");
                        if (ticket?.id) {
                          try {
                            await ticketService.updateTicket(ticket.id, {
                              type: "bug",
                            });
                            message.success(t('msg.ticketUpdated'));
                            onSuccess?.({ ...ticket, type: "bug" } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      },
                    },
                    {
                      key: "story",
                      label: tCommon('type.story'),
                      icon: (
                        <FontAwesomeIcon icon={faBookmark} color="#63ba3c" />
                      ),
                      onClick: async () => {
                        setTicketType("story");
                        if (ticket?.id) {
                          try {
                            await ticketService.updateTicket(ticket.id, {
                              type: "story",
                            });
                            message.success(t('msg.ticketUpdated'));
                            onSuccess?.({ ...ticket, type: "story" } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      },
                    },
                    {
                      key: "epic",
                      label: tCommon('type.epic'),
                      icon: <FontAwesomeIcon icon={faBolt} color="#904ee2" />,
                      onClick: async () => {
                        setTicketType("epic");
                        if (ticket?.id) {
                          try {
                            await ticketService.updateTicket(ticket.id, {
                              type: "epic",
                            });
                            message.success(t('msg.ticketUpdated'));
                            onSuccess?.({ ...ticket, type: "epic" } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      },
                    },
                  ],
                }}
              >
                <div
                  className="type-icon-wrapper"
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 4,
                  }}
                >
                  <FontAwesomeIcon
                    icon={typeInfo.icon}
                    style={{ color: typeInfo.color, fontSize: 'var(--fs-lg)' }}
                  />
                </div>
              </Dropdown>

              {/* Breadcrumbs */}
              <Text type="secondary" style={{ fontSize: 'var(--fs-caption)' }}>
                {currentProject?.name} /{" "}
                <Text strong style={{ color: "var(--color-text-heading)" }}>
                  {ticket?.ticket_key || "NEW"}
                </Text>
              </Text>
            </Space>
          </div>

          <div className="header-right">
            <Space>
              {!isCreateMode && (
                <>
                  <Tooltip title={t('history.title')}>
                    <Button
                      type="text"
                      icon={<HistoryOutlined />}
                      onClick={() => setHistoryOpen(true)}
                    />
                  </Tooltip>
                  <Tooltip title={tCommon('btn.export')}>
                    <Button type="text" icon={<ShareAltOutlined />} />
                  </Tooltip>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: "archive",
                          label: ticket?.is_archived ? tCommon('btn.restore') : tCommon('btn.archive'),
                          icon: <InboxOutlined />,
                          onClick: ticket?.is_archived
                            ? handleRestoreTicket
                            : handleArchiveTicket,
                        },
                      ],
                    }}
                  >
                    <Button type="text" icon={<EllipsisOutlined />} />
                  </Dropdown>
                </>
              )}
              <Divider type="vertical" />
              <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
            </Space>
          </div>
        </div>

        {/* BODY GRID */}
        <div className="ticket-modal-body-grid">
          {/* LEFT PANEL: Content & Meta */}
          <div className="ticket-left-panel">
            <div className="left-panel-scroll">
              {/* 1. TITLE */}
              <div className="ticket-title-wrapper">
                <Input.TextArea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('form.titlePlaceholder')}
                  autoSize={{ minRows: 1, maxRows: 2 }}
                  className="v3-ticket-title"
                  onBlur={handleSave} // Auto-save on blur
                />
              </div>
              {/* 2. META INFO ROW (Consolidated) */}
              <div className="ticket-meta-row">
                {/* Reporter */}
                <div className="meta-item">
                  <span className="meta-label">{t('form.reporter')}</span>
                  <div className="meta-value">
                    <Space size={4}>
                      <Avatar
                        size="small"
                        icon={<UserOutlined />}
                        src={ticket?.reporter?.first_name ? undefined : null}
                      >
                        {ticket?.reporter?.first_name?.[0]}
                      </Avatar>
                      <Text>
                        {ticket?.reporter?.first_name ||
                          ticket?.reporter?.username ||
                          "Unknown"}
                      </Text>
                    </Space>
                  </div>
                </div>

                {/* Assignees - Only project admins, or company admins if company is attached */}
                <div className="meta-item">
                  <span className="meta-label">{tCommon('col.assignees')}</span>
                  <div className="meta-value">
                    <Select
                      mode="multiple"
                      value={assignees}
                      onChange={async (ids) => {
                        setAssignees(ids);
                        if (ticket?.id) {
                          try {
                            const updatedTicket =
                              await ticketService.updateTicket(ticket.id, {
                                assignee_ids: ids,
                              });
                            message.success(t('msg.ticketUpdated'));
                            // Build assignees array from assignableUsers for Kanban display
                            const assigneesArray = assignableUsers.filter((u) =>
                              ids.includes(u.id),
                            );
                            onSuccess?.({
                              ...ticket,
                              ...updatedTicket,
                              assignees: assigneesArray,
                            } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      }}
                      placeholder={
                        ticket?.company
                          ? t('form.assigneesCompanyAdmins')
                          : t('form.assigneesProjectAdmins')
                      }
                      style={{ minWidth: 100, maxWidth: 200 }}
                      variant="borderless"
                      size="small"
                      maxTagCount={1}
                      maxTagPlaceholder={(omitted) => `+${omitted.length}`}
                      loading={loadingAssignableUsers}
                      optionFilterProp="label"
                      options={(() => {
                        // Build options from assignableUsers, but also include current ticket assignees
                        // to prevent showing IDs when data is loading
                        const optionsMap = new Map<
                          number,
                          { value: number; label: string }
                        >();

                        // Add current ticket assignees first (so they display correctly during loading)
                        ticket?.assignees?.forEach((a) => {
                          optionsMap.set(a.id, {
                            value: a.id,
                            label: a.first_name
                              ? `${a.first_name} ${a.last_name || ""}`.trim()
                              : a.username,
                          });
                        });

                        // Add/overwrite with assignable users
                        assignableUsers.forEach((u) => {
                          optionsMap.set(u.id, {
                            value: u.id,
                            label: u.first_name
                              ? `${u.first_name} ${u.last_name || ""}`.trim()
                              : u.username,
                          });
                        });

                        return Array.from(optionsMap.values());
                      })()}
                    />
                  </div>
                </div>

                {/* Status - Use board columns if available, else fall back to legacy columns */}
                <div className="meta-item">
                  <span className="meta-label">{tCommon('col.status')}</span>
                  <div className="meta-value">
                    {boardColumns.length > 0 ? (
                      // Board column-based status - show column names (To Do, In Progress, Review, Done)
                      <Select
                        value={(() => {
                          // Find which board column contains the current status
                          const currentColumn = boardColumns.find((bc) =>
                            bc.statuses.some(
                              (s) => s.key === selectedStatusKey,
                            ),
                          );
                          return currentColumn?.id;
                        })()}
                        onChange={async (columnId: number) => {
                          const targetColumn = boardColumns.find(
                            (bc) => bc.id === columnId,
                          );
                          if (
                            !targetColumn ||
                            targetColumn.statuses.length === 0
                          )
                            return;

                          // Check if moving to a "Done" column without due date
                          const isDoneColumn = targetColumn.name.toLowerCase().includes("done") ||
                            targetColumn.name.toLowerCase().includes("completed");
                          if (isDoneColumn && !dueDate && !ticket?.due_date) {
                            message.warning(t('form.dueDate'));
                            return;
                          }

                          // Use the first status of the target column
                          const targetStatus = targetColumn.statuses[0];
                          setSelectedStatusKey(targetStatus.key);

                          if (ticket?.id) {
                            try {
                              const updatedTicket =
                                await ticketService.updateTicket(ticket.id, {
                                  ticket_status_key: targetStatus.key,
                                });
                              message.success(t('msg.ticketUpdated'));
                              onSuccess?.({
                                ...ticket,
                                ...updatedTicket,
                                ticket_status_key: targetStatus.key,
                                ticket_status_name: targetStatus.name,
                                ticket_status_category: targetStatus.category,
                                ticket_status_color:
                                  targetStatus.category_color,
                              } as Ticket);
                            } catch (e) {
                              message.error(t('msg.failedUpdate'));
                            }
                          }
                        }}
                        style={{ width: 140 }}
                        size="small"
                        variant="borderless"
                        className="status-select"
                        popupMatchSelectWidth={false}
                      >
                        {/* Show board column names - the actual project workflow states */}
                        {boardColumns.map((bc) => (
                          <Option key={bc.id} value={bc.id}>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: "3px",
                                backgroundColor:
                                  bc.statuses[0]?.category_color || "#e0e0e0",
                                color: "#fff",
                                fontSize: 'var(--fs-xs)',
                                fontWeight: 500,
                              }}
                            >
                              {bc.name}
                            </span>
                          </Option>
                        ))}
                      </Select>
                    ) : (
                      // Legacy column system fallback
                      <Select
                        value={selectedColumn}
                        onChange={async (c) => {
                          // Check if moving to a "Done" column without due date
                          const targetColumn = projectColumns.find((col) => col.id === c);
                          const isDoneColumn = targetColumn?.name?.toLowerCase().includes("done") ||
                            targetColumn?.name?.toLowerCase().includes("completed");
                          if (isDoneColumn && !dueDate && !ticket?.due_date) {
                            message.warning(t('form.dueDate'));
                            return;
                          }

                          setSelectedColumn(c);
                          if (ticket?.id) {
                            try {
                              const updatedTicket =
                                await ticketService.updateTicket(ticket.id, {
                                  column: c,
                                });
                              message.success(t('msg.ticketUpdated'));
                              onSuccess?.({
                                ...ticket,
                                ...updatedTicket,
                              } as Ticket);
                            } catch (e) {
                              message.error(t('msg.failedUpdate'));
                            }
                          }
                        }}
                        style={{ width: 120 }}
                        size="small"
                        variant="borderless"
                        className="status-select"
                      >
                        {projectColumns.map((col) => (
                          <Option key={col.id} value={col.id}>
                            {col.name}
                          </Option>
                        ))}
                      </Select>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div className="meta-item">
                  <span className="meta-label">{tCommon('col.priority')}</span>
                  <div className="meta-value">
                    <Select
                      value={priority}
                      onChange={async (p) => {
                        setPriority(p);
                        if (ticket?.id) {
                          try {
                            await ticketService.updateTicket(ticket.id, {
                              priority_id: p,
                            });
                            message.success(t('msg.ticketUpdated'));
                            onSuccess?.({
                              ...ticket,
                              priority_id: p,
                            } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      }}
                      style={{ width: 120 }}
                      size="small"
                      variant="borderless"
                      popupMatchSelectWidth={false}
                    >
                      {[1, 2, 3, 4].map((p) => (
                        <Option key={p} value={p}>
                          <Space size={4}>
                            {getPriorityIcon(p)} {PRIORITY_LABELS[p]}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Company */}
                <div className="meta-item">
                  <span className="meta-label">{tCommon('field.company')}</span>
                  <div className="meta-value">
                    <Select
                      value={selectedCompanyId}
                      onChange={async (id) => {
                        setSelectedCompanyId(id);
                        if (ticket?.id) {
                          try {
                            await ticketService.updateTicket(ticket.id, {
                              company: id || null,
                            });
                            message.success(t('msg.ticketUpdated'));
                            onSuccess?.({ ...ticket, company: id } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      }}
                      placeholder={tCommon('empty.noData')}
                      allowClear
                      style={{ width: 130 }}
                      size="small"
                      variant="borderless"
                      loading={loadingCompanies}
                    >
                      {companies.map((c) => (
                        <Option key={c.id} value={c.id}>
                          <Space>
                            {c.logo && <Avatar size={16} src={c.logo} />}
                            {c.name}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Dates */}
                <div className="meta-item">
                  <span className="meta-label">{t('form.dueDate')}</span>
                  <div className="meta-value">
                    <DatePicker
                      value={dueDate}
                      onChange={async (date) => {
                        setDueDate(date);
                        if (ticket?.id) {
                          try {
                            await ticketService.updateTicket(ticket.id, {
                              due_date: date ? date.format("YYYY-MM-DD") : null,
                            });
                            message.success(t('msg.ticketUpdated'));
                            onSuccess?.({
                              ...ticket,
                              due_date: date ? date.format("YYYY-MM-DD") : null,
                            } as Ticket);
                          } catch (e) {
                            message.error(t('msg.failedUpdate'));
                          }
                        }
                      }}
                      variant="borderless"
                      size="small"
                      format="MMM D"
                      placeholder={t('form.dueDate')}
                      style={{ width: 100 }}
                    />
                  </div>
                </div>
              </div>{" "}
              {/* End Meta Row */}
              <Divider style={{ margin: "24px 0" }} />
              {/* 3. DESCRIPTION */}
              <div className="ticket-description-section">
                <div className="section-header-row">
                  <Text strong>{t('form.description')}</Text>
                  {!isEditingDescription && !isCreateMode && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => setIsEditingDescription(true)}
                    />
                  )}
                </div>

                {isEditingDescription ? (
                  <div className="description-editor">
                    <ReactQuill
                      theme="snow"
                      value={description}
                      onChange={setDescription}
                      modules={quillModules}
                    />
                    <div
                      className="editor-actions"
                      style={{ marginTop: 8, textAlign: "right" }}
                    >
                      <Space>
                        <Button
                          size="small"
                          onClick={() => setIsEditingDescription(false)}
                        >
                          {tCommon('btn.cancel')}
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => {
                            handleSave();
                            setIsEditingDescription(false);
                          }}
                        >
                          {tCommon('btn.save')}
                        </Button>
                      </Space>
                    </div>
                  </div>
                ) : (
                  <div
                    className="description-view"
                    onClick={() => setIsEditingDescription(true)}
                    dangerouslySetInnerHTML={{
                      __html:
                        description ||
                        `<p class='placeholder'>${t('form.descriptionPlaceholder')}</p>`,
                    }}
                  />
                )}
              </div>
              <Divider style={{ margin: "24px 0" }} />
              {/* 4. SUBTASKS */}
              <div className="ticket-section">
                <div style={{ marginBottom: 16 }}>
                  <Text strong>{tCommon('field.subtasks')}</Text>
                </div>
                <div className="subtask-list">
                  {subtasks.map((s) => (
                    <div key={s.id} className="subtask-item">
                      <Checkbox
                        checked={s.is_complete}
                        onChange={(e) =>
                          handleToggleSubtask(s.id, e.target.checked)
                        }
                      />
                      <span
                        style={{
                          textDecoration: s.is_complete
                            ? "line-through"
                            : "none",
                          color: s.is_complete ? "#999" : "inherit",
                          flex: 1,
                          marginLeft: 8,
                        }}
                      >
                        {s.title}
                      </span>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteSubtask(s.id)}
                      />
                    </div>
                  ))}
                  {addingSubtask ? (
                    <Input
                      autoFocus
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onPressEnter={handleAddSubtask}
                      onBlur={() => !newSubtaskTitle && setAddingSubtask(false)}
                      placeholder={t('subtasks.placeholder')}
                    />
                  ) : (
                    <Button
                      type="dashed"
                      block
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setAddingSubtask(true)}
                      style={{ marginTop: 8 }}
                    >
                      {t('subtasks.add')}
                    </Button>
                  )}
                </div>
              </div>
              {/* 5. LINKS */}
              <div className="ticket-section" style={{ marginTop: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>{t('links.title')}</Text>
                </div>
                {linkedItems.map((l) => (
                  <div key={l.id} className="linked-item-row">
                    <FontAwesomeIcon icon={faLink} color="#666" />
                    <Space style={{ marginLeft: 8 }}>
                      <Text code>{l.target_ticket?.ticket_key}</Text>
                      <Text>{l.target_ticket?.name}</Text>
                      <Text type="secondary">
                        (
                        {LINK_TYPES.find((t) => t.value === l.link_type)
                          ?.label || l.link_type}
                        )
                      </Text>
                    </Space>
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteLink(l.id)}
                      style={{ marginLeft: "auto" }}
                    />
                  </div>
                ))}
                {/* Link adding logic same as before, simplified for brevity in this turn */}
                {!addingLink && (
                  <Button
                    type="dashed"
                    block
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setAddingLink(true)}
                    style={{ marginTop: 8 }}
                  >
                    {t('links.add')}
                  </Button>
                )}
                {addingLink && (
                  <div
                    className="add-link-form"
                    style={{ marginTop: 8, display: "flex", gap: 8 }}
                  >
                    <Select
                      size="small"
                      style={{ width: 120 }}
                      value={newLinkType}
                      onChange={setNewLinkType}
                      placeholder={t('links.typePlaceholder')}
                    >
                      {LINK_TYPES.map((lt) => (
                        <Option key={lt.value} value={lt.value}>
                          {lt.label}
                        </Option>
                      ))}
                    </Select>
                    <Select
                      size="small"
                      showSearch
                      style={{ flex: 1 }}
                      placeholder={t('links.searchPlaceholder')}
                      onSearch={handleSearchTickets}
                      onChange={setSelectedTargetTicket}
                    >
                      {ticketSearchResults.map((t) => (
                        <Option key={t.id} value={t.id}>
                          {t.ticket_key} {t.name}
                        </Option>
                      ))}
                    </Select>
                    <Button size="small" type="primary" onClick={handleAddLink}>
                      {tCommon('btn.add')}
                    </Button>
                    <Button size="small" onClick={() => setAddingLink(false)}>
                      X
                    </Button>
                  </div>
                )}
              </div>
              <div style={{ height: 40 }} /> {/* Bottom padding */}
            </div>
          </div>

          {/* RIGHT PANEL: CHAT */}
          <div className="ticket-right-panel">
            {!isCreateMode && ticket ? (
              <TicketChatPanel ticket={ticket} />
            ) : (
              <div className="chat-placeholder">
                <InboxOutlined style={{ fontSize: 48, color: "var(--color-border)" }} />
                <Text type="secondary" style={{ marginTop: 16 }}>
                  {t('chat.createToStart')}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* DETAILS DRAWER (HISTORY) */}
        <Drawer
          title={t('history.activityHistory')}
          placement="right"
          onClose={() => setHistoryOpen(false)}
          open={historyOpen}
          width={400}
        >
          {ticket && <TicketHistory ticketId={ticket.id} />}
        </Drawer>
      </div>
    </Modal>
  );
};
