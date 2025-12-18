import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Select,
  DatePicker,
  Avatar,
  Tabs,
  message,
  Dropdown,
  Checkbox,
  Popconfirm,
  Spin,
  Tag,
  Input,
  Rate,
} from "antd";
import type { MenuProps } from "antd";
import {
  FullscreenOutlined,
  ShareAltOutlined,
  EllipsisOutlined,
  PlusOutlined,
  DownOutlined,
  DeleteOutlined,
  InboxOutlined,
  RollbackOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
  faCheckCircle,
  faLink,
} from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "./TicketModal.css";
import { getPriorityIcon } from "./PriorityIcons";
import { TicketComments } from "./TicketComments";
import {
  ticketService,
  projectService,
  tagService,
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
  TicketActivityItem,
  CreateTicketData,
  TicketUrgency,
  TicketImportance,
  User,
  Project,
} from "../types/api";

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

// Quill editor modules configuration
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    [{ color: [] }, { background: [] }],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "blockquote",
  "code-block",
  "link",
  "image",
  "color",
  "background",
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
  const [selectedColumn, setSelectedColumn] = useState(
    ticket?.column || columnId || 1
  );
  const [priority, setPriority] = useState(ticket?.priority_id || 3);
  const [urgency, setUrgency] = useState<TicketUrgency>(
    (ticket?.urgency as TicketUrgency) || "normal"
  );
  const [importance, setImportance] = useState<TicketImportance>(
    (ticket?.importance as TicketImportance) || "normal"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    ticket?.project || null
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    ticket?.company || null
  );
  const [tags, setTags] = useState<number[]>(ticket?.tags || []);
  const [assignees, setAssignees] = useState<number[]>(
    ticket?.assignees?.map((a: any) => a.id) || []
  );
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(
    ticket?.due_date ? dayjs(ticket.due_date) : null
  );
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    ticket?.start_date ? dayjs(ticket.start_date) : null
  );
  const [activeTab, setActiveTab] = useState("comments");
  const [saving, setSaving] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [_actualColumnId, setActualColumnId] = useState<number | null>(null);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [projectColumns, setProjectColumns] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Subtask state
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);

  // Linked items state
  const [linkedItems, setLinkedItems] = useState<IssueLink[]>([]);
  const [loadingLinkedItems, setLoadingLinkedItems] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkType, setNewLinkType] = useState("");
  const [selectedTargetTicket, setSelectedTargetTicket] = useState<
    number | null
  >(null);
  const [searchingTickets, setSearchingTickets] = useState(false);
  const [ticketSearchResults, setTicketSearchResults] = useState<
    LinkedTicket[]
  >([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [archiveActionLoading, setArchiveActionLoading] = useState(false);
  const [history, setHistory] = useState<TicketActivityItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const archiveMenuItems =
    React.useMemo<MenuProps["items"]>(() => {
      if (isCreateMode) {
        return [] as MenuProps["items"];
      }
      return [
        {
          key: "archive",
          label: "Move to archive",
          icon: <InboxOutlined />,
          disabled: !ticket || ticket.is_archived,
        },
        {
          key: "restore",
          label: "Restore ticket",
          icon: <RollbackOutlined />,
          disabled: !ticket || !ticket.is_archived,
        },
      ];
    }, [isCreateMode, ticket]) || [];

  const handleArchiveActionClick: MenuProps["onClick"] = async ({ key }) => {
    if (key === "archive") {
      await handleArchiveTicket();
    } else if (key === "restore") {
      await handleRestoreTicket();
    }
  };

  const handleArchiveTicket = async () => {
    if (!ticket?.id) return;
    setArchiveActionLoading(true);
    try {
      const updatedTicket = await ticketService.archiveTicket(ticket.id);
      message.success("Ticket moved to archive");
      onSuccess?.(updatedTicket);
      onClose();
    } catch (error) {
      console.error("Failed to archive ticket", error);
      message.error("Failed to archive ticket");
    } finally {
      setArchiveActionLoading(false);
    }
  };

  const handleRestoreTicket = async () => {
    if (!ticket?.id) return;
    setArchiveActionLoading(true);
    try {
      const updatedTicket = await ticketService.restoreTicket(ticket.id);
      message.success("Ticket restored");
      onSuccess?.(updatedTicket);
    } catch (error) {
      console.error("Failed to restore ticket", error);
      message.error("Failed to restore ticket");
    } finally {
      setArchiveActionLoading(false);
    }
  };

  // Load current project from localStorage when modal opens
  useEffect(() => {
    if (open) {
      // Load all available projects if not already loaded
      if (availableProjects.length === 0) {
        projectService
          .getAllProjects()
          .then((projects) => {
            setAvailableProjects(projects);
          })
          .catch((error) => {
            console.error("Failed to load projects:", error);
          });
      }

      // Load all users for assignee dropdown if not already loaded
      if (availableUsers.length === 0) {
        userService
          .getAllUsers()
          .then((users) => {
            setAvailableUsers(users);
          })
          .catch((error) => {
            console.error("Failed to load users:", error);
          });
      }

      // Load companies if project selected
      if (selectedProjectId) {
        setLoadingCompanies(true);
        companyService
          .getAllCompanies(selectedProjectId)
          .then(setCompanies)
          .catch((err) => console.error("Failed to load companies", err))
          .finally(() => setLoadingCompanies(false));
      }

      // Load current project info for context
      const projectData = localStorage.getItem("currentProject");
      if (projectData) {
        try {
          const project = JSON.parse(projectData);
          setCurrentProject(project);
        } catch (error) {
          console.error("Failed to parse project data:", error);
        }
      }
    }
  }, [open]);

  // Handle create mode initialization
  useEffect(() => {
    if (open && isCreateMode) {
      const projectData = localStorage.getItem("currentProject");

      if (projectData) {
        try {
          const project = JSON.parse(projectData);
          setCurrentProject(project);

          // Ensure project.id is a number
          const projectId =
            typeof project.id === "number"
              ? project.id
              : parseInt(project.id, 10);
          setSelectedProjectId(projectId);

          // Fetch project columns to get the actual column ID
          projectService
            .getProjectColumns(projectId)
            .then((columns) => {
              setProjectColumns(columns);
              if (columns.length > 0) {
                const targetColumn =
                  columns.find((col: any) => col.id === columnId) || columns[0];
                setActualColumnId(targetColumn.id);
                setSelectedColumn(targetColumn.id);
              }
            })
            .catch((error) => {
              console.error("❌ Failed to load project columns:", error);
            });
        } catch (error) {
          console.error("❌ Failed to parse project data:", error);
        }
      }
    }
  }, [open, isCreateMode, columnId]);

  // Sync form state when ticket changes
  useEffect(() => {
    if (open && ticket) {
      // Only update if ticket ID changed or if it's the first load
      // This prevents overwriting user input if ticket updates in background

      setTitle(ticket.name || "");
      setDescription(ticket.description || "");
      setTicketType(ticket.type || "task");
      setSelectedColumn(ticket.column || 1);
      setPriority(ticket.priority_id || 3);
      setUrgency((ticket.urgency as TicketUrgency) || "medium");
      setImportance((ticket.importance as TicketImportance) || "medium");
      setImportance((ticket.importance as TicketImportance) || "medium");
      setSelectedProjectId(ticket.project || null);
      setSelectedCompanyId(ticket.company || null);
      setTags(ticket.tags || []);
      setAssignees(ticket.assignees?.map((a: any) => a.id) || []);
      setDueDate(ticket.due_date ? dayjs(ticket.due_date) : null);
      setStartDate(ticket.start_date ? dayjs(ticket.start_date) : null);
    }
  }, [open, ticket]); // Still depends on ticket, but separated from project data fetching

  // Load project data (columns, tags) when project changes
  useEffect(() => {
    if (open && selectedProjectId) {
      // Load columns
      projectService
        .getProjectColumns(selectedProjectId)
        .then((columns) => {
          setProjectColumns(columns);
        })
        .catch((error) => {
          console.error("Failed to load columns:", error);
        });

      // Load tags
      tagService
        .getTags(selectedProjectId)
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

      // Load companies
      setLoadingCompanies(true);
      companyService
        .getAllCompanies(selectedProjectId)
        .then(setCompanies)
        .catch((err) => console.error("Failed to load companies", err))
        .finally(() => setLoadingCompanies(false));
    }
  }, [open, selectedProjectId]); // Only runs when selectedProjectId changes

  // Fetch admins when project or company changes
  useEffect(() => {
    if (!open) return;

    const projectId = selectedProjectId;
    if (!projectId) return;

    setLoadingAdmins(true);

    // If company is selected, fetch company admins
    // Otherwise fetch project admins
    const fetchPromise = selectedCompanyId
      ? companyService.getCompanyAdmins(selectedCompanyId)
      : projectService.getProjectAdmins(projectId);

    fetchPromise
      .then((users) => {
        setAdmins(users);
        // We don't auto-clear assignees in Edit mode to avoid accidental data loss,
        // but user will see warnings if current assignee is not in list (implied)
      })
      .catch((err) => {
        console.error("Failed to load admins:", err);
        setAdmins([]);
      })
      .finally(() => {
        setLoadingAdmins(false);
      });
  }, [open, selectedProjectId, selectedCompanyId]);

  // Load subtasks when ticket is opened in edit mode
  useEffect(() => {
    const loadSubtasks = async () => {
      if (!isCreateMode && ticket?.id) {
        setLoadingSubtasks(true);
        try {
          const fetchedSubtasks = await subtaskService.getSubtasks(ticket.id);
          setSubtasks(fetchedSubtasks);
        } catch (error) {
          console.error("Failed to load subtasks:", error);
          message.error("Failed to load subtasks");
        } finally {
          setLoadingSubtasks(false);
        }
      } else {
        setSubtasks([]);
      }
    };

    if (open) {
      loadSubtasks();
    }
  }, [open, ticket?.id, isCreateMode]);

  // Load linked items when ticket is opened in edit mode
  useEffect(() => {
    const loadLinkedItems = async () => {
      if (!isCreateMode && ticket?.id) {
        setLoadingLinkedItems(true);
        try {
          const fetchedLinks = await linkedItemService.getLinkedItems(
            ticket.id
          );
          setLinkedItems(fetchedLinks);
        } catch (error) {
          console.error("Failed to load linked items:", error);
          message.error("Failed to load linked items");
        } finally {
          setLoadingLinkedItems(false);
        }
      } else {
        setLinkedItems([]);
      }
    };

    if (open) {
      loadLinkedItems();
    }
  }, [open, ticket?.id, isCreateMode]);

  // Load history when tab is active
  useEffect(() => {
    if (activeTab === "history" && ticket?.id && !isCreateMode) {
      setLoadingHistory(true);
      ticketService
        .getTicketHistory(ticket.id)
        .then((data) => setHistory(data))
        .catch((err) => {
          console.error("Failed to load history:", err);
          message.error("Failed to load history");
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, ticket?.id, isCreateMode]);

  const handleProjectChange = async (projectId: number) => {
    setSelectedProjectId(projectId);

    // Load columns for the new project
    try {
      const columns = await projectService.getProjectColumns(projectId);
      setProjectColumns(columns);
      if (columns.length > 0) {
        setSelectedColumn(columns[0].id);
      }

      // Load tags for the new project
      const tagsResponse = await tagService.getTags(projectId);
      const tags = Array.isArray(tagsResponse)
        ? tagsResponse
        : tagsResponse.results || [];
      setProjectTags(tags);
    } catch (error) {
      console.error("Failed to load project data:", error);
      message.error("Failed to load project columns and tags");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      message.error("Please enter a ticket title");
      return;
    }

    if (isCreateMode && !columnId) {
      message.error("Column ID is required for creating tickets");
      return;
    }

    if (isCreateMode && !currentProject) {
      message.error("No project selected. Please create a project first.");
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
          (isCreateMode
            ? currentProject.id
            : ticket?.project || currentProject?.id || 1),
        company: selectedCompanyId || undefined,
        due_date: dueDate ? dueDate.format("YYYY-MM-DD") : null,
        start_date: startDate ? startDate.format("YYYY-MM-DD") : null,
        assignee_ids: assignees,
        tags: tags,
      };

      let savedTicket: Ticket;
      if (isCreateMode) {
        savedTicket = await ticketService.createTicket(ticketData);
        // message.success("Ticket created successfully!");
      } else if (ticket) {
        savedTicket = await ticketService.updateTicket(ticket.id, ticketData);
        message.success("Ticket updated successfully!");
      } else {
        return;
      }

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

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      message.warning("Please enter a subtask title");
      return;
    }

    if (!ticket?.id) {
      message.warning("Save the ticket first before adding subtasks");
      return;
    }

    setAddingSubtask(true);
    try {
      const newSubtask = await subtaskService.createSubtask({
        ticket: ticket.id,
        title: newSubtaskTitle.trim(),
      });
      setSubtasks([...subtasks, newSubtask]);
      setNewSubtaskTitle("");
      setShowSubtaskForm(false);
      message.success("Subtask added successfully!");
    } catch (error) {
      console.error("Failed to add subtask:", error);
      message.error("Failed to add subtask");
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (
    subtaskId: number,
    isComplete: boolean
  ) => {
    try {
      const updatedSubtask = await subtaskService.toggleComplete(
        subtaskId,
        isComplete
      );
      setSubtasks(
        subtasks.map((s) => (s.id === subtaskId ? updatedSubtask : s))
      );
    } catch (error) {
      console.error("Failed to toggle subtask:", error);
      message.error("Failed to update subtask");
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      await subtaskService.deleteSubtask(subtaskId);
      setSubtasks(subtasks.filter((s) => s.id !== subtaskId));
      message.success("Subtask deleted successfully!");
    } catch (error) {
      console.error("Failed to delete subtask:", error);
      message.error("Failed to delete subtask");
    }
  };

  const handleAssigneeChange = async (
    subtaskId: number,
    assigneeId: number | null
  ) => {
    try {
      const updatedSubtask = await subtaskService.updateSubtask(subtaskId, {
        assignee_id: assigneeId,
      });
      setSubtasks(
        subtasks.map((s) => (s.id === subtaskId ? updatedSubtask : s))
      );
      message.success("Assignee updated successfully!");
    } catch (error) {
      console.error("Failed to update assignee:", error);
      message.error("Failed to update assignee");
    }
  };

  const handleSearchTickets = async (searchValue: string) => {
    if (!searchValue || searchValue.length < 2) {
      setTicketSearchResults([]);
      return;
    }

    setSearchingTickets(true);
    try {
      const results = await linkedItemService.searchTickets(
        searchValue,
        ticket?.project
      );
      // Filter out the current ticket from results
      const filtered = results.filter((t) => t.id !== ticket?.id);
      setTicketSearchResults(filtered);
    } catch (error) {
      console.error("Failed to search tickets:", error);
      message.error("Failed to search tickets");
    } finally {
      setSearchingTickets(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLinkType || !selectedTargetTicket) {
      message.warning("Please select a link type and target ticket");
      return;
    }

    if (!ticket?.id) {
      message.warning("Save the ticket first before adding links");
      return;
    }

    setAddingLink(true);
    try {
      const newLink = await linkedItemService.createLink({
        source_ticket_id: ticket.id,
        target_ticket_id: selectedTargetTicket,
        link_type: newLinkType,
      });
      setLinkedItems([...linkedItems, newLink]);
      setNewLinkType("");
      setSelectedTargetTicket(null);
      setTicketSearchResults([]);
      setShowLinkForm(false);
      message.success("Link added successfully!");
    } catch (error) {
      console.error("Failed to add link:", error);
      message.error("Failed to add link");
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    try {
      await linkedItemService.deleteLink(linkId);
      setLinkedItems(linkedItems.filter((l) => l.id !== linkId));
      message.success("Link deleted successfully!");
    } catch (error) {
      console.error("Failed to delete link:", error);
      message.error("Failed to delete link");
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                color: "#9E9E9E",
              }}
            >
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "task",
                      label: "Task",
                      icon: (
                        <FontAwesomeIcon
                          icon={faCheckSquare}
                          style={{ fontSize: "14px", color: "#4bade8" }}
                        />
                      ),
                      onClick: () => setTicketType("task"),
                    },
                    {
                      key: "bug",
                      label: "Bug",
                      icon: (
                        <FontAwesomeIcon
                          icon={faBug}
                          style={{ fontSize: "14px", color: "#e5493a" }}
                        />
                      ),
                      onClick: () => setTicketType("bug"),
                    },
                    {
                      key: "story",
                      label: "Story",
                      icon: (
                        <FontAwesomeIcon
                          icon={faBookmark}
                          style={{ fontSize: "14px", color: "#63ba3c" }}
                        />
                      ),
                      onClick: () => setTicketType("story"),
                    },
                    {
                      key: "epic",
                      label: "Epic",
                      icon: (
                        <FontAwesomeIcon
                          icon={faBolt}
                          style={{ fontSize: "14px", color: "#904ee2" }}
                        />
                      ),
                      onClick: () => setTicketType("epic"),
                    },
                  ],
                  selectedKeys: [ticketType],
                }}
                trigger={["click"]}
              >
                <Button
                  type="text"
                  size="small"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    height: "auto",
                  }}
                >
                  <FontAwesomeIcon
                    icon={typeInfo.icon}
                    style={{ fontSize: "16px", color: typeInfo.color }}
                  />
                  <DownOutlined
                    style={{ fontSize: "10px", color: "#9E9E9E" }}
                  />
                </Button>
              </Dropdown>
              <span style={{ color: "#2C3E50", fontWeight: 500 }}>
                {isCreateMode
                  ? "NEW TICKET"
                  : ticket?.ticket_key ||
                    `${ticket?.project_key || "TICK"}-${
                      ticket?.project_number || ticket?.id
                    }`}
              </span>
              {ticket?.is_archived && (
                <Tag color="default" style={{ marginLeft: 8 }}>
                  Archived
                </Tag>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!isCreateMode && (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<ShareAltOutlined />}
                  style={{ color: "#9E9E9E" }}
                />
                <Dropdown
                  menu={{
                    items: archiveMenuItems,
                    onClick: handleArchiveActionClick,
                  }}
                  trigger={["click"]}
                  disabled={
                    archiveActionLoading || archiveMenuItems.length === 0
                  }
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<EllipsisOutlined />}
                    style={{ color: "#9E9E9E" }}
                    loading={archiveActionLoading}
                  />
                </Dropdown>
                <Button
                  type="text"
                  size="small"
                  icon={<FullscreenOutlined />}
                  style={{ color: "#9E9E9E" }}
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
              style={{ color: "#9E9E9E" }}
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
                  color: "#9E9E9E",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Description
              </h3>
              <div className="ticket-modal-editor">
                <ReactQuill
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Add a description..."
                />
              </div>
            </div>

            {/* Subtasks */}
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Subtasks
              </h3>

              {/* Add subtask button or form */}
              {!isCreateMode && (
                <>
                  {!showSubtaskForm ? (
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setShowSubtaskForm(true)}
                      style={{
                        padding: "4px 8px",
                        color: "#5E6C84",
                        height: "auto",
                        marginBottom: "8px",
                      }}
                    >
                      Add subtask
                    </Button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <Input
                        placeholder="Type to create or search for existing task..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onPressEnter={handleAddSubtask}
                        disabled={addingSubtask}
                        style={{ flex: 1 }}
                        autoFocus
                        onBlur={() => {
                          if (!newSubtaskTitle.trim()) {
                            setShowSubtaskForm(false);
                          }
                        }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        onClick={handleAddSubtask}
                        loading={addingSubtask}
                        disabled={!newSubtaskTitle.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setNewSubtaskTitle("");
                          setShowSubtaskForm(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Subtasks list */}
              {loadingSubtasks ? (
                <div style={{ textAlign: "center", padding: "16px" }}>
                  <Spin size="small" />
                </div>
              ) : subtasks.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px",
                        border: "1px solid #dfe1e6",
                        borderRadius: "4px",
                        backgroundColor: subtask.is_complete
                          ? "#f7f8f9"
                          : "#fff",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        style={{
                          fontSize: "16px",
                          color: subtask.is_complete ? "#4bade8" : "#DFE1E6",
                        }}
                      />
                      <Checkbox
                        checked={subtask.is_complete}
                        onChange={(e) =>
                          handleToggleSubtask(subtask.id, e.target.checked)
                        }
                      />
                      <span
                        style={{
                          flex: 1,
                          textDecoration: subtask.is_complete
                            ? "line-through"
                            : "none",
                          color: subtask.is_complete ? "#9E9E9E" : "#2C3E50",
                        }}
                      >
                        {subtask.title}
                      </span>

                      {/* Assignee selector */}
                      <Select
                        placeholder="Assignee"
                        value={subtask.assignee?.id || null}
                        onChange={(value) =>
                          handleAssigneeChange(subtask.id, value)
                        }
                        allowClear
                        style={{ width: 150 }}
                        size="small"
                      >
                        {availableUsers.map((user) => (
                          <Select.Option key={user.id} value={user.id}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Avatar size={16}>
                                {user.first_name?.[0] ||
                                  user.username?.[0]?.toUpperCase()}
                              </Avatar>
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username}
                            </div>
                          </Select.Option>
                        ))}
                      </Select>

                      <Popconfirm
                        title="Delete subtask?"
                        description="Are you sure you want to delete this subtask?"
                        onConfirm={() => handleDeleteSubtask(subtask.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          style={{ color: "#e5493a" }}
                        />
                      </Popconfirm>
                    </div>
                  ))}
                </div>
              ) : isCreateMode ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    color: "#9E9E9E",
                    fontSize: "14px",
                  }}
                >
                  Save the ticket first to add subtasks.
                </div>
              ) : null}
            </div>

            {/* Linked work items */}
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Linked work items
              </h3>

              {/* Add link button or form */}
              {!isCreateMode && (
                <>
                  {!showLinkForm ? (
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setShowLinkForm(true)}
                      style={{
                        padding: "4px 8px",
                        color: "#5E6C84",
                        height: "auto",
                        marginBottom: "8px",
                      }}
                    >
                      Add linked work item
                    </Button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <Select
                        placeholder="Link type"
                        value={newLinkType || undefined}
                        onChange={(value) => setNewLinkType(value)}
                        style={{ width: 150 }}
                        size="small"
                        options={LINK_TYPES}
                      />
                      <Select
                        showSearch
                        placeholder="Type to search for ticket..."
                        value={selectedTargetTicket || undefined}
                        onChange={(value) => setSelectedTargetTicket(value)}
                        onSearch={handleSearchTickets}
                        loading={searchingTickets}
                        filterOption={false}
                        style={{ flex: 1 }}
                        size="small"
                        autoFocus
                        notFoundContent={
                          searchingTickets ? (
                            <Spin size="small" />
                          ) : (
                            "Type to search..."
                          )
                        }
                      >
                        {ticketSearchResults.map((ticket) => (
                          <Select.Option key={ticket.id} value={ticket.id}>
                            {ticket.ticket_key ||
                              `${ticket.project_key}-${
                                ticket.project_number || ticket.id
                              }`}{" "}
                            {ticket.name}
                          </Select.Option>
                        ))}
                      </Select>
                      <Button
                        type="primary"
                        size="small"
                        onClick={handleAddLink}
                        loading={addingLink}
                        disabled={!newLinkType || !selectedTargetTicket}
                      >
                        Add
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setNewLinkType("");
                          setSelectedTargetTicket(null);
                          setTicketSearchResults([]);
                          setShowLinkForm(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Linked items list */}
              {loadingLinkedItems ? (
                <div style={{ textAlign: "center", padding: "16px" }}>
                  <Spin size="small" />
                </div>
              ) : linkedItems.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {linkedItems.map((link) => {
                    // Determine if current ticket is source or target
                    const isSource = link.source_ticket.id === ticket?.id;
                    const relatedTicket = isSource
                      ? link.target_ticket
                      : link.source_ticket;
                    const displayLinkType =
                      LINK_TYPES.find((t) => t.value === link.link_type)
                        ?.label || link.link_type;

                    return (
                      <div
                        key={link.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px",
                          border: "1px solid #dfe1e6",
                          borderRadius: "4px",
                          backgroundColor: "#fff",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faLink}
                          style={{
                            fontSize: "16px",
                            color: "#5E6C84",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#9E9E9E",
                                textTransform: "uppercase",
                              }}
                            >
                              {displayLinkType}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#2C3E50",
                              }}
                            >
                              {relatedTicket.ticket_key ||
                                `${relatedTicket.project_key}-${
                                  relatedTicket.project_number ||
                                  relatedTicket.id
                                }`}
                            </span>
                            <span
                              style={{ fontSize: "14px", color: "#2C3E50" }}
                            >
                              {relatedTicket.name}
                            </span>
                          </div>
                        </div>

                        <Popconfirm
                          title="Delete link?"
                          description="Are you sure you want to remove this link?"
                          onConfirm={() => handleDeleteLink(link.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                            style={{ color: "#e5493a" }}
                          />
                        </Popconfirm>
                      </div>
                    );
                  })}
                </div>
              ) : isCreateMode ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    color: "#9E9E9E",
                    fontSize: "14px",
                  }}
                >
                  Save the ticket first to add linked items.
                </div>
              ) : null}
            </div>

            {/* Resolution Feedback History Section */}
            {!isCreateMode &&
              ticket?.resolution_feedbacks &&
              ticket.resolution_feedbacks.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#9E9E9E",
                      textTransform: "uppercase",
                      marginBottom: "12px",
                    }}
                  >
                    Resolution Feedback History
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {ticket.resolution_feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        style={{
                          padding: "12px",
                          border: "1px solid",
                          borderColor:
                            fb.feedback_type === "rejected"
                              ? "#FFCCC7"
                              : "#B7EB8F",
                          borderRadius: "6px",
                          backgroundColor:
                            fb.feedback_type === "rejected"
                              ? "#FFF1F0"
                              : "#F6FFED",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <Tag
                            color={
                              fb.feedback_type === "rejected"
                                ? "error"
                                : "success"
                            }
                          >
                            {fb.feedback_type === "rejected"
                              ? "Rejected"
                              : "Accepted"}
                          </Tag>
                          <span style={{ fontSize: "11px", color: "#9E9E9E" }}>
                            {new Date(fb.created_at).toLocaleDateString()}{" "}
                            {new Date(fb.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {fb.rating && (
                          <div style={{ marginBottom: "8px" }}>
                            <Rate
                              disabled
                              value={fb.rating}
                              style={{ fontSize: "14px" }}
                            />
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#2C3E50",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {fb.feedback || (
                            <span
                              style={{ color: "#9E9E9E", fontStyle: "italic" }}
                            >
                              No feedback provided
                            </span>
                          )}
                        </div>
                        {fb.created_by && (
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "11px",
                              color: "#9E9E9E",
                            }}
                          >
                            —{" "}
                            {fb.created_by.first_name
                              ? `${fb.created_by.first_name} ${fb.created_by.last_name}`
                              : fb.created_by.username}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Activity Section */}
            <div style={{ marginTop: "32px" }}>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
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
                  { key: "comments", label: "Comments" },
                  { key: "history", label: "History" },
                ]}
                style={{ marginBottom: "16px" }}
              />

              {/* Comments Tab */}
              {activeTab === "comments" && !isCreateMode && ticket?.id && (
                <TicketComments
                  ticketId={ticket.id}
                  projectId={ticket.project}
                />
              )}

              {/* History Tab - Placeholder */}
              {activeTab === "history" && (
                <div style={{ padding: "0 8px" }}>
                  {loadingHistory ? (
                    <div style={{ textAlign: "center", padding: "24px" }}>
                      <Spin />
                    </div>
                  ) : history.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "#9E9E9E",
                      }}
                    >
                      No history available
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      {history.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          style={{
                            display: "flex",
                            gap: "12px",
                            fontSize: "14px",
                          }}
                        >
                          <Avatar size="small" style={{ marginTop: "2px" }}>
                            {item.user.first_name?.[0] || item.user.username[0]}
                          </Avatar>
                          <div>
                            <div style={{ marginBottom: "4px" }}>
                              <span
                                style={{ fontWeight: 500, marginRight: "4px" }}
                              >
                                {item.user.first_name
                                  ? `${item.user.first_name} ${item.user.last_name}`
                                  : item.user.username}
                              </span>

                              {item.type === "comment" ? (
                                <span style={{ color: "#5E6C84" }}>
                                  commented
                                </span>
                              ) : (
                                <span style={{ color: "#5E6C84" }}>
                                  changed {item.field.replace("_", " ")}
                                </span>
                              )}

                              <span
                                style={{
                                  color: "#9E9E9E",
                                  marginLeft: "8px",
                                  fontSize: "12px",
                                }}
                              >
                                {dayjs(item.created_at).format(
                                  "MMM D, YYYY [at] h:mm A"
                                )}
                              </span>
                            </div>

                            {item.type === "comment" ? (
                              <div
                                style={{
                                  color: "#172b4d",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {item.content}
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  color: "#172b4d",
                                }}
                              >
                                <span
                                  style={{
                                    textDecoration: "line-through",
                                    color: "#9E9E9E",
                                  }}
                                >
                                  {item.old_value || "(empty)"}
                                </span>
                                <span style={{ color: "#5E6C84" }}>→</span>
                                <span style={{ fontWeight: 500 }}>
                                  {item.new_value || "(empty)"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Create mode message */}
              {isCreateMode && (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#9E9E9E",
                  }}
                >
                  Save the ticket first to add comments.
                </div>
              )}
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
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Details
              </h3>
            </div>

            {/* Project Selection */}
            {isCreateMode && (
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#9E9E9E",
                    marginBottom: "4px",
                  }}
                >
                  Project
                </div>
                <Select
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  style={{ width: "100%" }}
                  size="small"
                  placeholder="Select project"
                >
                  {availableProjects.map((proj) => (
                    <Option key={proj.id} value={proj.id}>
                      {proj.key} - {proj.name}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            {/* Status */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  marginBottom: "4px",
                }}
              >
                Status
              </div>
              <Select
                value={selectedColumn}
                onChange={setSelectedColumn}
                style={{ width: "100%" }}
                size="small"
              >
                {projectColumns.map((col) => (
                  <Option key={col.id} value={col.id}>
                    {col.name}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Assignee */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  marginBottom: "4px",
                }}
              >
                Assignee
              </div>
              <Select
                mode="multiple"
                value={assignees}
                onChange={setAssignees}
                loading={loadingAdmins}
                placeholder="Select assignees"
                style={{ width: "100%" }}
                size="small"
                allowClear
                showSearch
                filterOption={(input, option) => {
                  // The children prop of Option is intricate, so we access text content safely
                  const content = (option?.children as any)?.props?.children;
                  // If content is an array (avatar + text), get the text part
                  const text = Array.isArray(content)
                    ? content[1]?.props?.children
                    : content;

                  if (!text) return false;
                  return String(text)
                    .toLowerCase()
                    .includes(input.toLowerCase());
                }}
              >
                {admins.length > 0
                  ? admins.map((user) => (
                      <Select.Option key={user.id} value={user.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Avatar
                            size={16}
                            style={{
                              backgroundColor: user.first_name
                                ? "#1890ff"
                                : "#f56a00",
                              fontSize: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {user.first_name?.[0]?.toUpperCase() ||
                              user.username?.[0]?.toUpperCase()}
                          </Avatar>
                          <span>
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.username}
                          </span>
                        </div>
                      </Select.Option>
                    ))
                  : // Fallback to currently selected assignees if admins not loaded yet
                    assignees.map((id) => {
                      const user = availableUsers.find((u) => u.id === id);
                      if (!user) return null;
                      return (
                        <Select.Option key={user.id} value={user.id}>
                          {user.username}
                        </Select.Option>
                      );
                    })}
              </Select>
              {/* Only show "Assign to me" if current user is an admin for this project/company */}
              {(() => {
                const currentUser = localStorage.getItem("user");
                if (!currentUser) return null;
                try {
                  const user = JSON.parse(currentUser);
                  const isEligible = admins.some(
                    (admin) => admin.id === user.id
                  );

                  if (!isEligible) return null;

                  return (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        if (user.id && !assignees.includes(user.id)) {
                          setAssignees([...assignees, user.id]);
                        }
                      }}
                      style={{
                        padding: "4px 0",
                        height: "auto",
                        fontSize: "12px",
                      }}
                    >
                      Assign to me
                    </Button>
                  );
                } catch (e) {
                  return null;
                }
              })()}
            </div>

            {/* Company */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  marginBottom: "4px",
                }}
              >
                Company
              </div>
              <Select
                placeholder="Select company"
                allowClear
                showSearch
                loading={loadingCompanies}
                value={selectedCompanyId}
                onChange={setSelectedCompanyId}
                style={{ width: "100%" }}
                size="small"
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
            </div>

            {/* Parent */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  marginBottom: "4px",
                }}
              >
                Parent
              </div>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "4px 8px",
                  height: "auto",
                  color: "#9E9E9E",
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
                  color: "#9E9E9E",
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

            {/* Urgency */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  marginBottom: "4px",
                }}
              >
                Urgency
              </div>
              <Select
                value={urgency}
                onChange={setUrgency}
                style={{ width: "100%" }}
                size="small"
              >
                <Option value="low">Low</Option>
                <Option value="normal">Normal</Option>
                <Option value="high">High</Option>
              </Select>
            </div>

            {/* Importance */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
                  marginBottom: "4px",
                }}
              >
                Importance
              </div>
              <Select
                value={importance}
                onChange={setImportance}
                style={{ width: "100%" }}
                size="small"
              >
                <Option value="low">Low</Option>
                <Option value="normal">Normal</Option>
                <Option value="high">High</Option>
              </Select>
            </div>

            {/* Due date */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
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
                  color: "#9E9E9E",
                  marginBottom: "4px",
                }}
              >
                Tags
              </div>
              <Select
                mode="multiple"
                value={tags}
                onChange={(value) => setTags(value)}
                size="small"
                placeholder="Select tags"
                style={{ width: "100%" }}
                showSearch
                allowClear
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={
                  Array.isArray(projectTags)
                    ? projectTags.map((tag) => ({
                        value: tag.id,
                        label: tag.name,
                      }))
                    : []
                }
              />
            </div>

            {/* Start date */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9E9E9E",
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
            {!isCreateMode && ticket?.reporter && (
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#9E9E9E",
                    marginBottom: "4px",
                  }}
                >
                  Reporter
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Avatar size={24} style={{ backgroundColor: "#2C3E50" }}>
                    {ticket.reporter.first_name?.[0]?.toUpperCase() ||
                      ticket.reporter.username?.[0]?.toUpperCase() ||
                      "?"}
                    {ticket.reporter.last_name?.[0]?.toUpperCase() ||
                      ticket.reporter.username?.[1]?.toUpperCase() ||
                      ""}
                  </Avatar>
                  <span style={{ fontSize: "14px", color: "#172b4d" }}>
                    {ticket.reporter.first_name && ticket.reporter.last_name
                      ? `${ticket.reporter.first_name} ${ticket.reporter.last_name}`
                      : ticket.reporter.username}
                  </span>
                </div>
              </div>
            )}

            {/* Created/Updated Dates */}
            {!isCreateMode && ticket && (
              <div
                style={{
                  marginTop: "24px",
                  fontSize: "11px",
                  color: "#9E9E9E",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div>
                  Created{" "}
                  {ticket.created_at
                    ? dayjs(ticket.created_at).format("MMM D, YYYY [at] h:mm A")
                    : "Unknown"}
                </div>
                <div>
                  Updated{" "}
                  {ticket.updated_at
                    ? dayjs(ticket.updated_at).format("MMM D, YYYY [at] h:mm A")
                    : "Unknown"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
