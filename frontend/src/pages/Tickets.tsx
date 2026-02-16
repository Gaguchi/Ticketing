import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Button,
  Input,
  Select,
  Table,
  Tag,
  message,
  Segmented,
  Avatar,
  Tooltip,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  RollbackOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { KanbanBoard } from "../components/KanbanBoard";
import { DeadlineView } from "../components/DeadlineView";
import { CalendarView } from "../components/CalendarView";
import { getPriorityIcon } from "../components/PriorityIcons";
import { TicketModal } from "../components/TicketModal";
import { CreateTicketModal } from "../components/CreateTicketModal";
import { CompanyFilterBar } from "../components/dashboard";
import { useProject } from "../contexts/AppContext";
import { useTranslation } from "react-i18next";
import { ticketService, statusService } from "../services";
import dashboardService from "../services/dashboard.service";
import type { Ticket, TicketColumn, BoardColumn } from "../types/api";
import type { CompanyHealth } from "../types/dashboard";
import { debug, LogCategory, LogLevel } from "../utils/debug";
import { rankBetween } from "../utils/lexorank";
import "./Tickets.css";

const { Option } = Select;

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

// Helper function to format ticket ID from backend data
const formatTicketId = (ticket: Ticket) => {
  // Prefer ticket_key from backend (includes project-scoped number)
  if (ticket.ticket_key) {
    return ticket.ticket_key;
  }
  // Fallback to constructing from available fields
  const key = ticket.project_key || "TICK";
  const num = ticket.project_number || ticket.id;
  return `${key}-${num}`;
};

const Tickets: React.FC = () => {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation('common');
  const [viewMode, setViewMode] = useState<
    "list" | "kanban" | "deadline" | "archive" | "calendar"
  >(() => {
    const savedMode = localStorage.getItem("ticketsViewMode");
    return (
      (savedMode as "list" | "kanban" | "deadline" | "archive" | "calendar") ||
      "kanban"
    );
  });

  useEffect(() => {
    localStorage.setItem("ticketsViewMode", viewMode);
  }, [viewMode]);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined,
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { selectedProject } = useProject();

  // Real data from API
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<TicketColumn[]>([]);
  const [boardColumns, setBoardColumns] = useState<BoardColumn[]>([]); // New status-based columns
  const [loading, setLoading] = useState(false);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Company filter state
  const [companies, setCompanies] = useState<CompanyHealth[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);

  const RECENT_UPDATE_WINDOW_MS = 10000; // Extended to handle slow backend responses

  // Track ticket IDs we've received via WebSocket to prevent duplicates
  const receivedTicketIdsRef = useRef<Set<number>>(new Set());
  const recentTicketUpdatesRef = useRef<Map<number, number>>(new Map());
  const lastMoveTimeRef = useRef<number>(0);

  // Prevent duplicate initialization
  const fetchInProgressRef = useRef(false);

  // Fetch tickets and columns when project changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProject) {
        setTickets([]);
        setKanbanColumns([]);
        receivedTicketIdsRef.current.clear();
        return;
      }

      // Prevent duplicate fetches
      if (fetchInProgressRef.current) {
        debug.log(
          LogCategory.TICKET,
          LogLevel.INFO,
          "Fetch already in progress, skipping",
        );
        return;
      }

      fetchInProgressRef.current = true;
      setLoading(true);

      try {
        debug.log(
          LogCategory.TICKET,
          LogLevel.INFO,
          "Loading data for project:",
          selectedProject,
        );

        // OPTIMIZED: Single API call with view=kanban returns tickets + columns
        // This replaces 3 parallel API calls with 1, and uses minimal serializer
        const kanbanData = await ticketService.getKanbanData(
          selectedProject.id,
        );

        debug.log(LogCategory.TICKET, LogLevel.INFO, "Kanban data loaded:", {
          tickets: kanbanData.count,
          boardColumns: kanbanData.board_columns?.length || 0,
          oldColumns: kanbanData.columns?.length || 0,
        });

        // Use new status system if board columns exist
        if (kanbanData.board_columns && kanbanData.board_columns.length > 0) {
          setBoardColumns(kanbanData.board_columns);
        } else if (!kanbanData.columns || kanbanData.columns.length === 0) {
          message.warning(t('msg.noColumnsWarning'));
        }

        setKanbanColumns(kanbanData.columns || []);
        setTickets(kanbanData.results);

        // Track all existing ticket IDs
        receivedTicketIdsRef.current = new Set(
          kanbanData.results.map((t) => t.id),
        );
      } catch (error: any) {
        console.error("Failed to fetch data:", error);
        message.error(t('msg.failedLoad'));
      } finally {
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    };

    fetchData();
  }, [selectedProject?.id]); // Only depend on project ID

  // Fetch company health data for filter
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!selectedProject) {
        setCompanies([]);
        return;
      }
      try {
        const healthData = await dashboardService.fetchCompanyHealth({ project: selectedProject.id });
        setCompanies(healthData);
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      }
    };
    fetchCompanies();
  }, [selectedProject?.id]);

  useEffect(() => {
    setArchivedTickets([]);
  }, [selectedProject?.id]);

  // Listen for real-time ticket updates via WebSocket
  useEffect(() => {
    const handleTicketUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) {
        // Event dispatched without detail (e.g. from optimistic UI updates in TicketCard)
        // The UI is already updated optimistically, so no action needed
        return;
      }
      const { type, data, projectId } = customEvent.detail;

      // Only update if it's for the current project
      if (!selectedProject || projectId !== selectedProject.id) {
        return;
      }

      if (type === "ticket_created") {
        // Check if we've already processed this ticket ID
        // Note: WebSocket may send `ticket_id` or `id`, onSuccess uses `id`
        const ticketId = data.ticket_id || data.id;
        console.log(
          `[Tickets] WebSocket ticket_created: id=${ticketId}, data=`,
          data,
        );
        if (receivedTicketIdsRef.current.has(ticketId)) {
          console.log(
            `[Tickets] WebSocket: ticket ${ticketId} already in receivedTicketIdsRef, skipping`,
          );
          return;
        }

        // Mark as received
        receivedTicketIdsRef.current.add(ticketId);
        try {
          // Convert WebSocket data to ticket format
          const newTicket = {
            ...data,
            ticket_key: data.ticket_key || `${selectedProject.key}-${data.id}`,
          };
          console.log(
            `[Tickets] WebSocket: adding ticket to state:`,
            newTicket.id,
            newTicket.ticket_status_key,
          );

          setTickets((prev) => {
            // Double-check it doesn't exist
            if (prev.some((t) => t.id === newTicket.id)) {
              console.log(
                `[Tickets] WebSocket: ticket ${newTicket.id} already exists in prev, skipping`,
              );
              return prev;
            }
            console.log(
              `[Tickets] WebSocket: adding ticket ${newTicket.id} to state, prev length: ${prev.length}`,
            );
            return [newTicket, ...prev];
          });
          // message.success(
          //   `New ticket created: ${data.ticket_key || `#${data.id}`}`
          // );
        } catch (error) {
          console.error("Failed to add new ticket:", error);
          // Remove from set so it can retry
          receivedTicketIdsRef.current.delete(ticketId);
        }
      } else if (type === "ticket_updated") {
        const lastUpdatedAt = recentTicketUpdatesRef.current.get(data.id);
        if (lastUpdatedAt) {
          if (Date.now() - lastUpdatedAt < RECENT_UPDATE_WINDOW_MS) {
            debug.log(
              LogCategory.TICKET,
              LogLevel.INFO,
              `Skipping ticket ${data.id} refresh (handled optimistically)`,
            );
            return;
          }
          recentTicketUpdatesRef.current.delete(data.id);
        }

        // Merge WebSocket data into existing ticket instead of replacing
        // This preserves fields that WebSocket may not include (e.g. full assignee objects)
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id !== data.id) return t;
            return {
              ...t,
              ...data,
              ticket_key: data.ticket_key || t.ticket_key,
              // Preserve full assignee objects if WebSocket only sends IDs
              assignees: data.assignees || t.assignees,
            };
          }),
        );
      } else if (type === "ticket_deleted") {
        // Remove ticket from list
        setTickets((prev) => prev.filter((t) => t.id !== data.id));
        message.info(`Ticket ${data.ticket_key || `#${data.id}`} was deleted`);
      }
    };

    window.addEventListener("ticketUpdate", handleTicketUpdate);

    return () => {
      window.removeEventListener("ticketUpdate", handleTicketUpdate);
    };
  }, [selectedProject?.id]);

  // Listen for column refresh events (bulk position updates)
  useEffect(() => {
    const handleColumnRefresh = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { columnIds: _columnIds, projectId } = customEvent.detail;

      // Only update if it's for the current project
      if (!selectedProject || projectId !== selectedProject.id) {
        return;
      }

      // Skip refresh if we recently moved a ticket (we already have the latest state)
      // Extended to 10 seconds to account for slow API responses
      if (Date.now() - lastMoveTimeRef.current < 10000) {
        return;
      }

      // Also skip if any tickets have pending updates
      const hasPendingUpdates = Array.from(
        recentTicketUpdatesRef.current.values(),
      ).some((timestamp) => Date.now() - timestamp < 10000);
      if (hasPendingUpdates) {
        return;
      }

      // Refetch tickets for the entire project to get updated positions
      try {
        const ticketsResponse = await ticketService.getTickets({
          project: selectedProject.id,
          page_size: 1000,
        });
        setTickets(ticketsResponse.results);
      } catch (error: any) {
        console.error("Failed to refresh tickets:", error);
      }
    };

    window.addEventListener("columnRefresh", handleColumnRefresh);

    return () => {
      window.removeEventListener("columnRefresh", handleColumnRefresh);
    };
  }, [selectedProject?.id]);

  // Fetch full ticket details before opening modal
  const handleTicketClick = useCallback(async (ticket: Ticket) => {
    try {
      const fullTicket = await ticketService.getTicket(ticket.id);
      setSelectedTicket(fullTicket);
    } catch (error: any) {
      console.error("Failed to fetch ticket details:", error);
      message.error(tCommon('msg.error.loadFailed'));
    }
  }, []);

  // Handle ticket move/reorder in Kanban with optimistic updates
  const handleTicketMove = async (
    ticketId: number,
    newColumnId: number,
    order: number,
    oldColumnId: number,
  ) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    const column = kanbanColumns.find((c) => c.id === newColumnId);

    if (!ticket || !column) {
      message.error(t('msg.failedUpdate'));
      return;
    }

    // Store previous state for rollback
    const previousColumnId = ticket.column;
    const previousColumnName = ticket.column_name;
    const previousOrder = ticket.column_order;

    const isSameColumn = oldColumnId === newColumnId;

    // OPTIMISTIC UPDATE: Update UI immediately
    setTickets((prevTickets) => {
      if (isSameColumn) {
        // Same column reorder - just update the moved ticket and shift others
        return prevTickets.map((t) => {
          if (t.id === ticketId) {
            return { ...t, column_order: order };
          }
          if (t.column === newColumnId) {
            const currentOrder = t.column_order || 0;
            const oldOrder = previousOrder || 0;
            // Shift tickets between old and new position
            if (order < oldOrder) {
              // Moving up - shift tickets down
              if (currentOrder >= order && currentOrder < oldOrder) {
                return { ...t, column_order: currentOrder + 1 };
              }
            } else {
              // Moving down - shift tickets up
              if (currentOrder > oldOrder && currentOrder <= order) {
                return { ...t, column_order: currentOrder - 1 };
              }
            }
          }
          return t;
        });
      } else {
        // Cross-column move
        return prevTickets.map((t) => {
          // The moved ticket
          if (t.id === ticketId) {
            console.log(
              `[Tickets] Moving ticket ${ticketId}: column ${t.column} -> ${newColumnId}, order ${t.column_order} -> ${order}`,
            );
            return {
              ...t,
              column: newColumnId,
              column_name: column.name,
              column_order: order,
            };
          }

          // Tickets in the OLD column: Shift down those that were below the moved ticket
          if (
            t.column === previousColumnId &&
            t.column_order > (previousOrder || 0)
          ) {
            return { ...t, column_order: t.column_order - 1 };
          }

          // Tickets in the NEW column: Shift up those that are at or below the insertion point
          if (t.column === newColumnId && t.column_order >= order) {
            return { ...t, column_order: t.column_order + 1 };
          }

          return t;
        });
      }
    });

    // Send PATCH request in the background (non-blocking)
    recentTicketUpdatesRef.current.set(ticketId, Date.now());
    lastMoveTimeRef.current = Date.now();

    try {
      await ticketService.updateTicket(ticketId, {
        column: newColumnId,
        order: order,
      });
    } catch (error: any) {
      // ROLLBACK: Revert optimistic update on error

      if (previousColumnId !== undefined && previousColumnName !== undefined) {
        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  column: previousColumnId,
                  column_name: previousColumnName,
                  column_order: previousOrder,
                }
              : t,
          ),
        );
      }

      message.error(t('msg.failedUpdateReverted'));
    } finally {
      recentTicketUpdatesRef.current.set(ticketId, Date.now());
      lastMoveTimeRef.current = Date.now();
    }
  };

  // NEW: Status-based move handler (for Jira-style status system)
  // Uses FIRE-AND-FORGET pattern: calculate rank locally, update UI immediately,
  // send API call but don't wait for response. This enables rapid successive moves
  // without any flickering or response ordering issues.
  const handleTicketMoveToStatus = (
    ticketId: number,
    statusKey: string,
    beforeTicketId?: number,
    afterTicketId?: number,
  ) => {
    console.log(
      `[Tickets] moveToStatus: ticketId=${ticketId}, status=${statusKey}, before=${beforeTicketId}, after=${afterTicketId}`,
    );

    // Use functional update to get latest tickets state
    // This is crucial for rapid moves - each move sees the result of previous moves
    setTickets((prevTickets) => {
      const ticket = prevTickets.find((t) => t.id === ticketId);
      if (!ticket) {
        console.error(`[Tickets] Ticket ${ticketId} not found`);
        return prevTickets;
      }

      // Find neighbor tickets for rank calculation
      const beforeTicket = beforeTicketId
        ? prevTickets.find((t) => t.id === beforeTicketId)
        : null;
      const afterTicket = afterTicketId
        ? prevTickets.find((t) => t.id === afterTicketId)
        : null;

      // Calculate exact LexoRank locally - same algorithm as backend
      const newRank = rankBetween(
        beforeTicket?.rank || null,
        afterTicket?.rank || null,
      );

      console.log(
        `[Tickets] Calculated rank: before=${beforeTicket?.rank}, after=${afterTicket?.rank} => ${newRank}`,
      );

      // Find the board column for this status to get the status metadata
      const targetColumn = boardColumns.find((bc) =>
        bc.statuses.some((s) => s.key === statusKey),
      );
      const targetStatus = targetColumn?.statuses.find(
        (s) => s.key === statusKey,
      );

      // Determine if we're entering a "done" status
      const isEnteringDone = targetStatus?.category === "done";
      const wasInDone = ticket.ticket_status_category === "done";

      // Update the ticket in state
      return prevTickets.map((t) => {
        if (t.id !== ticketId) return t;

        // Build the base update
        const update: Partial<Ticket> = {
          ...t,
          ticket_status_key: statusKey,
          ticket_status_name: targetStatus?.name || statusKey,
          ticket_status_category: targetStatus?.category,
          ticket_status_color: targetStatus?.category_color,
          rank: newRank,
        };

        // Handle resolution_status transitions
        // When entering Done from non-Done, set to awaiting_review (unless already accepted)
        // Only applies to tickets with companies attached
        if (
          isEnteringDone &&
          !wasInDone &&
          t.resolution_status !== "accepted" &&
          t.company
        ) {
          update.resolution_status = "awaiting_review";
        }

        return update as Ticket;
      });
    });

    // Fire-and-forget: send to server but don't await or use response
    // The local rank calculation matches the server's, so no need to update from response
    statusService
      .moveTicketToStatus(ticketId, statusKey, {
        beforeId: beforeTicketId,
        afterId: afterTicketId,
      })
      .catch((error) => {
        // Log errors but don't rollback - the user's intent is clear and
        // a page refresh will sync with server state if needed
        console.error("[Tickets] Background move failed:", error);
        // Optionally show a non-blocking notification
        message.warning(t('msg.moveRetryWarning'));
      });

    // Update tracking refs (outside setTickets to avoid stale closure)
    recentTicketUpdatesRef.current.set(ticketId, Date.now());
    lastMoveTimeRef.current = Date.now();
  };

  const columns: TableColumnsType<Ticket> = [
    {
      title: t('col.work'),
      key: "work",
      width: 400,
      render: (_: any, record: Ticket) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
          onClick={() => setSelectedTicket(record)}
        >
          <FontAwesomeIcon
            icon={getTypeIcon(record.type).icon}
            style={{
              fontSize: 'var(--fs-lg)',
              color: getTypeIcon(record.type).color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "var(--color-primary)",
              fontWeight: 500,
              fontSize: 'var(--fs-base)',
              marginRight: "8px",
            }}
          >
            {formatTicketId(record)}
          </span>
          <span style={{ color: "var(--color-text-heading)", fontSize: 'var(--fs-base)' }}>
            {record.name}
          </span>
        </div>
      ),
    },
    {
      title: t('col.customer'),
      dataIndex: "customer",
      key: "customer",
      width: 180,
    },
    {
      title: tCommon('col.status'),
      dataIndex: "column_name",
      key: "column_name",
      width: 120,
      render: (column_name: string) => {
        const colorMap: Record<string, string> = {
          "To Do": "blue",
          New: "blue",
          "In Progress": "geekblue",
          Review: "purple",
          Done: "green",
        };
        return (
          <Tag color={colorMap[column_name] || "default"}>{column_name}</Tag>
        );
      },
    },
    {
      title: tCommon('col.priority'),
      dataIndex: "priorityId",
      key: "priorityId",
      width: 100,
      render: (priorityId: number) => getPriorityIcon(priorityId),
    },
    {
      title: tCommon('col.dueDate'),
      dataIndex: "due_date",
      key: "due_date",
      width: 120,
      render: (due_date: string | null) => {
        if (!due_date) return <span style={{ color: "var(--color-text-muted)" }}>--</span>;
        const dueDate = new Date(due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOverdue = dueDate < today;
        const isToday = dueDate.toDateString() === today.toDateString();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = dueDate.toDateString() === tomorrow.toDateString();

        let color = "default";
        let text = dueDate.toLocaleDateString();

        if (isOverdue) {
          color = "red";
          text = tCommon('time.overdue');
        } else if (isToday) {
          color = "orange";
          text = tCommon('time.today');
        } else if (isTomorrow) {
          color = "gold";
          text = tCommon('time.tomorrow');
        }

        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: tCommon('col.assignees'),
      dataIndex: "assignees_detail",
      key: "assignees_detail",
      width: 150,
      render: (assignees: any[]) => {
        if (!assignees || assignees.length === 0) {
          return <span style={{ color: "var(--color-text-muted)" }}>{t('filter.unassigned')}</span>;
        }
        return (
          <Avatar.Group maxCount={3} size="small">
            {assignees.map((assignee: any) => (
              <Tooltip
                key={assignee.id}
                title={
                  assignee.first_name
                    ? `${assignee.first_name} ${assignee.last_name}`
                    : assignee.username
                }
              >
                <Avatar size="small" style={{ backgroundColor: "var(--color-primary)" }}>
                  {assignee.first_name?.[0] || assignee.username?.[0] || "?"}
                </Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        );
      },
    },
    {
      title: tCommon('col.created'),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
    },
  ];

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredTickets = useMemo(() => {
    return tickets
      .filter((ticket) => !ticket.is_archived)
      .filter((ticket) => {
        // Company filter
        if (selectedCompanyIds.length > 0) {
          if (!selectedCompanyIds.includes(ticket.company as number)) return false;
        }

        // Search filter
        if (normalizedSearch) {
          const matchesSearch =
            ticket.name.toLowerCase().includes(normalizedSearch) ||
            ticket.ticket_key?.toLowerCase().includes(normalizedSearch) ||
            ticket.tags_detail?.some((tag) =>
              tag.name.toLowerCase().includes(normalizedSearch),
            );
          if (!matchesSearch) return false;
        }

        // Status filter
        if (filterStatus) {
          if (ticket.column_name !== filterStatus) return false;
        }

        return true;
      });
  }, [tickets, normalizedSearch, filterStatus, selectedCompanyIds]);

  const loadArchivedTickets = useCallback(async () => {
    if (!selectedProject) {
      setArchivedTickets([]);
      return;
    }
    setArchiveLoading(true);
    try {
      const response = await ticketService.getArchivedTickets({
        project: selectedProject.id,
        page_size: 500,
      });
      setArchivedTickets(response.results);
    } catch (error: any) {
      console.error("Failed to load archived tickets", error);
      message.error(t('archive.failedLoad'));
    } finally {
      setArchiveLoading(false);
    }
  }, [selectedProject]);

  const filteredArchivedTickets = useMemo(() => {
    return archivedTickets.filter((ticket) => {
      // Search filter
      if (normalizedSearch) {
        const matchesSearch =
          ticket.name.toLowerCase().includes(normalizedSearch) ||
          ticket.ticket_key?.toLowerCase().includes(normalizedSearch) ||
          ticket.tags_detail?.some((tag) =>
            tag.name.toLowerCase().includes(normalizedSearch),
          );
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus) {
        if (ticket.column_name !== filterStatus) return false;
      }

      return true;
    });
  }, [archivedTickets, normalizedSearch, filterStatus]);

  useEffect(() => {
    if (viewMode === "archive") {
      loadArchivedTickets();
    }
  }, [viewMode, loadArchivedTickets]);

  const handleRestoreTicket = useCallback(async (ticketId: number) => {
    try {
      const restoredTicket = await ticketService.restoreTicket(ticketId);
      message.success(t('msg.ticketRestoredKey', { key: restoredTicket.ticket_key }));
      setArchivedTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setTickets((prev) => {
        const without = prev.filter((t) => t.id !== ticketId);
        return [restoredTicket, ...without];
      });
    } catch (error: any) {
      console.error("Failed to restore ticket", error);
      message.error(t('msg.failedRestore'));
    }
  }, []);

  const archiveColumns = useMemo<TableColumnsType<Ticket>>(
    () => [
      {
        title: t('col.work'),
        key: "work",
        width: 420,
        render: (_: any, record: Ticket) => (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTicket(record)}
          >
            <FontAwesomeIcon
              icon={getTypeIcon(record.type).icon}
              style={{
                fontSize: 'var(--fs-lg)',
                color: getTypeIcon(record.type).color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "var(--color-primary)",
                fontWeight: 500,
                fontSize: 'var(--fs-base)',
                marginRight: "8px",
              }}
            >
              {formatTicketId(record)}
            </span>
            <span style={{ color: "var(--color-text-heading)", fontSize: 'var(--fs-base)' }}>
              {record.name}
            </span>
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "column_name",
        key: "column_name",
        width: 140,
        render: (column_name: string) => {
          const colorMap: Record<string, string> = {
            "To Do": "blue",
            New: "blue",
            "In Progress": "geekblue",
            Review: "purple",
            Done: "green",
          };
          return (
            <Tag color={colorMap[column_name] || "default"}>{column_name}</Tag>
          );
        },
      },
      {
        title: "Archived",
        dataIndex: "archived_at",
        key: "archived_at",
        width: 180,
        render: (_: any, record: Ticket) => {
          const archivedAt =
            record.archived_at ||
            (record as { archivedAt?: string }).archivedAt;
          return archivedAt ? new Date(archivedAt).toLocaleString() : "-";
        },
      },
      {
        title: "Reason",
        dataIndex: "archived_reason",
        key: "archived_reason",
        width: 220,
        ellipsis: true,
        render: (reason?: string | null) => reason || "-",
      },
      {
        title: "Actions",
        key: "actions",
        width: 140,
        render: (_: any, record: Ticket) => (
          <Button
            size="small"
            icon={<RollbackOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              handleRestoreTicket(record.id);
            }}
          >
            Restore
          </Button>
        ),
      },
    ],
    [handleRestoreTicket],
  );

  // Handle quick updates from TicketCard (assignee, priority, due date changes)
  // This lifts optimistic state to the parent so it survives drag operations
  const handleTicketQuickUpdate = useCallback((ticketId: number, fields: Partial<Ticket>) => {
    recentTicketUpdatesRef.current.set(ticketId, Date.now());
    setTickets((prev) =>
      prev.map((t) => t.id === ticketId ? { ...t, ...fields } : t)
    );
  }, []);

  const handleTicketModalSuccess = useCallback((updatedTicket: Ticket) => {
    if (!updatedTicket) return;

    // Update the tickets list
    setTickets((prev) => {
      const existing = prev.some((t) => t.id === updatedTicket.id);
      if (updatedTicket.is_archived) {
        return prev.filter((t) => t.id !== updatedTicket.id);
      }
      if (existing) {
        // Merge the updated ticket to ensure all fields (including company_logo_url) are updated
        return prev.map((t) =>
          t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t,
        );
      }
      return [updatedTicket, ...prev];
    });

    // Also update selectedTicket so the modal reflects changes immediately
    setSelectedTicket((prev) => {
      if (prev && prev.id === updatedTicket.id) {
        return { ...prev, ...updatedTicket };
      }
      return prev;
    });
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Simplified Header - Jira Style */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0 }}>Board</h1>
          {/* Company Filter Pills */}
          {companies.length > 0 && (
            <CompanyFilterBar
              companies={companies}
              selectedCompanyIds={selectedCompanyIds}
              totalTickets={tickets.filter(t => !t.is_archived).length}
              onToggle={(id) => setSelectedCompanyIds((prev) =>
                prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
              )}
              onClearAll={() => setSelectedCompanyIds([])}
              compact
            />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Input
              placeholder="Search"
              prefix={<SearchOutlined style={{ color: "var(--color-text-muted)" }} />}
              value={searchText}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setSearchText(event.target.value)
              }
              allowClear
              style={{
                width: 200,
                backgroundColor: "var(--color-bg-inset)",
                border: "1px solid var(--color-border)",
                borderRadius: "3px",
              }}
              size="small"
            />
            <Select
              placeholder="Filter"
              allowClear
              value={filterStatus}
              onChange={(value) =>
                setFilterStatus(typeof value === "string" ? value : undefined)
              }
              size="small"
              style={{ width: 140 }}
              disabled={!selectedProject}
            >
              {kanbanColumns.map((col) => (
                <Option key={col.id} value={col.name}>
                  {col.name}
                </Option>
              ))}
            </Select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Segmented
            value={viewMode}
            onChange={(value) =>
              setViewMode(
                value as
                  | "list"
                  | "kanban"
                  | "deadline"
                  | "archive"
                  | "calendar",
              )
            }
            options={[
              { label: "List", value: "list", icon: <UnorderedListOutlined /> },
              { label: "Kanban", value: "kanban", icon: <AppstoreOutlined /> },
              {
                label: "Deadline",
                value: "deadline",
                icon: <ClockCircleOutlined />,
              },
              {
                label: "Calendar",
                value: "calendar",
                icon: <CalendarOutlined />,
              },
              {
                label: "Archive",
                value: "archive",
                icon: <InboxOutlined />,
              },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedProject}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            Loading tickets...
          </div>
        ) : viewMode === "list" ? (
          <Table
            columns={columns}
            dataSource={filteredTickets}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} tickets`,
            }}
            scroll={{ y: "calc(100vh - 260px)" }}
            onRow={(record) => ({
              onClick: () => handleTicketClick(record),
              style: { cursor: "pointer" },
            })}
          />
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            tickets={filteredTickets}
            columns={kanbanColumns}
            boardColumns={boardColumns}
            onTicketClick={handleTicketClick}
            onTicketMove={handleTicketMove}
            onTicketMoveToStatus={handleTicketMoveToStatus}
            onTicketUpdate={handleTicketQuickUpdate}
            onTicketCreated={(ticket) => {
              console.log(
                `[Tickets] onTicketCreated called with ticket:`,
                ticket.id,
                ticket.name,
              );
              // Add to received set FIRST to prevent WebSocket race condition
              receivedTicketIdsRef.current.add(ticket.id);
              setTickets((prev) => {
                // Check if ticket already exists to prevent duplicates
                const exists = prev.some((t) => t.id === ticket.id);
                console.log(
                  `[Tickets] Ticket ${ticket.id} exists in prev: ${exists}, prev length: ${prev.length}`,
                );
                if (exists) {
                  return prev;
                }
                return [ticket, ...prev];
              });
            }}
          />
        ) : viewMode === "deadline" ? (
          <DeadlineView
            tickets={filteredTickets}
            columns={kanbanColumns}
            onTicketClick={handleTicketClick}
          />
        ) : viewMode === "calendar" ? (
          <CalendarView
            tickets={filteredTickets}
            columns={kanbanColumns}
            onTicketClick={handleTicketClick}
          />
        ) : (
          <Table
            columns={archiveColumns}
            dataSource={filteredArchivedTickets}
            loading={archiveLoading}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} tickets`,
            }}
            scroll={{ y: "calc(100vh - 260px)" }}
            onRow={(record) => ({
              onClick: () => handleTicketClick(record),
              style: { cursor: "pointer" },
            })}
          />
        )}
      </div>

      {/* Ticket Modal */}
      <TicketModal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        onSuccess={handleTicketModalSuccess}
        boardColumns={boardColumns}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newTicket) => {
          console.log(`[Tickets] CreateTicketModal onSuccess - ticket:`, {
            id: newTicket.id,
            column: newTicket.column,
            column_order: newTicket.column_order,
            rank: newTicket.rank,
            ticket_status_key: newTicket.ticket_status_key,
          });
          // Mark this ticket ID as received (it will come via WebSocket soon)
          receivedTicketIdsRef.current.add(newTicket.id);

          // Add the ticket immediately for instant feedback
          // Use functional update with duplicate check to prevent double-adding
          setTickets((prev) => {
            // Check if ticket already exists (from WebSocket or previous add)
            if (prev.some((t) => t.id === newTicket.id)) {
              console.log(
                `[Tickets] Ticket ${newTicket.id} already exists, skipping add`,
              );
              return prev;
            }
            return [newTicket, ...prev];
          });
        }}
      />
    </div>
  );
};

export default Tickets;
