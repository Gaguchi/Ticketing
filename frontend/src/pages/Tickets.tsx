import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Button, Input, Select, Table, Tag, message, Segmented } from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  RollbackOutlined,
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
import { getPriorityIcon } from "../components/PriorityIcons";
import { TicketModal } from "../components/TicketModal";
import { CreateTicketModal } from "../components/CreateTicketModal";
import { useProject } from "../contexts/AppContext";
import { ticketService, projectService } from "../services";
import type { Ticket, TicketColumn } from "../types/api";
import { debug, LogCategory, LogLevel } from "../utils/debug";
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
  const [viewMode, setViewMode] = useState<
    "list" | "kanban" | "deadline" | "archive"
  >("kanban");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { selectedProject } = useProject();

  // Real data from API
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const RECENT_UPDATE_WINDOW_MS = 2500;

  // Track ticket IDs we've received via WebSocket to prevent duplicates
  const receivedTicketIdsRef = useRef<Set<number>>(new Set());
  const recentTicketUpdatesRef = useRef<Map<number, number>>(new Map());

  // Track drag state to prevent WebSocket updates during drag operations
  const isDraggingRef = useRef(false);
  const pendingUpdatesRef = useRef<any[]>([]);

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
          "Fetch already in progress, skipping"
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
          selectedProject
        );

        // Fetch columns and tickets in parallel for better performance
        const [projectColumns, ticketsResponse] = await Promise.all([
          projectService.getProjectColumns(selectedProject.id),
          ticketService.getTickets({ project: selectedProject.id }),
        ]);

        debug.log(
          LogCategory.TICKET,
          LogLevel.INFO,
          "Project columns:",
          projectColumns
        );

        if (projectColumns.length === 0) {
          message.warning(
            `Project "${selectedProject.name}" has no columns. Please set up columns first.`
          );
        }

        setKanbanColumns(projectColumns);
        setTickets(ticketsResponse.results);

        // Track all existing ticket IDs
        receivedTicketIdsRef.current = new Set(
          ticketsResponse.results.map((t) => t.id)
        );
      } catch (error: any) {
        console.error("Failed to fetch data:", error);
        message.error("Failed to load tickets");
      } finally {
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    };

    fetchData();
  }, [selectedProject?.id]); // Only depend on project ID

  useEffect(() => {
    setArchivedTickets([]);
  }, [selectedProject?.id]);

  // Listen for real-time ticket updates via WebSocket
  useEffect(() => {
    const handleTicketUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data, projectId } = customEvent.detail;

      // Only update if it's for the current project
      if (!selectedProject || projectId !== selectedProject.id) {
        return;
      }

      console.log(`🎫 [Tickets] Received ${type} event:`, data);

      if (type === "ticket_created") {
        // Check if we've already processed this ticket ID
        if (receivedTicketIdsRef.current.has(data.ticket_id)) {
          console.log(
            `⏭️ Skipping duplicate ticket_created for ID ${data.ticket_id}`
          );
          return;
        }

        // Mark as received
        receivedTicketIdsRef.current.add(data.ticket_id);

        // Use the complete data from WebSocket instead of fetching
        console.log(`➕ Adding new ticket from WebSocket: ${data.id}`);
        try {
          // Convert WebSocket data to ticket format
          const newTicket = {
            ...data,
            ticket_key: data.ticket_key || `${selectedProject.key}-${data.id}`,
          };

          setTickets((prev) => {
            // Double-check it doesn't exist
            if (prev.some((t) => t.id === newTicket.id)) {
              console.log(`⚠️ Ticket ${newTicket.id} already exists, skipping`);
              return prev;
            }
            return [newTicket, ...prev];
          });
          message.success(
            `New ticket created: ${data.ticket_key || `#${data.id}`}`
          );
        } catch (error) {
          console.error("Failed to add new ticket:", error);
          // Remove from set so it can retry
          receivedTicketIdsRef.current.delete(data.id);
        }
      } else if (type === "ticket_updated") {
        const lastUpdatedAt = recentTicketUpdatesRef.current.get(data.id);
        if (lastUpdatedAt) {
          if (Date.now() - lastUpdatedAt < RECENT_UPDATE_WINDOW_MS) {
            debug.log(
              LogCategory.TICKET,
              LogLevel.INFO,
              `Skipping ticket ${data.id} refresh (handled optimistically)`
            );
            return;
          }
          recentTicketUpdatesRef.current.delete(data.id);
        }

        // Queue updates during drag operations to prevent position corruption
        if (isDraggingRef.current) {
          console.log(`⏸️ Queuing WebSocket update during drag: ${data.id}`);
          pendingUpdatesRef.current.push({ type, data });
          return;
        }

        // Use complete data from WebSocket instead of fetching
        console.log(`🔄 Updating ticket from WebSocket: ${data.id}`);
        const updatedTicket = {
          ...data,
          ticket_key: data.ticket_key || `${selectedProject.key}-${data.id}`,
        };

        setTickets((prev) => {
          const oldTicket = prev.find((t) => t.id === data.id);
          if (oldTicket) {
            console.log(
              `📊 Position update for ticket ${data.ticket_key || data.id}:`,
              {
                oldColumn: oldTicket.column,
                newColumn: data.column,
                oldOrder: oldTicket.column_order,
                newOrder: data.column_order,
                columnChanged: oldTicket.column !== data.column,
                orderChanged: oldTicket.column_order !== data.column_order,
              }
            );
          }
          return prev.map((t) => (t.id === data.id ? updatedTicket : t));
        });
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
      const { columnIds, projectId } = customEvent.detail;

      // Only update if it's for the current project
      if (!selectedProject || projectId !== selectedProject.id) {
        return;
      }

      console.log(`🔄 [Tickets] Column refresh for columns:`, columnIds);

      // Refetch tickets for the entire project to get updated positions
      try {
        const ticketsResponse = await ticketService.getTickets({
          project: selectedProject.id,
        });
        setTickets(ticketsResponse.results);
        console.log(
          `✅ [Tickets] Refreshed ${ticketsResponse.results.length} tickets`
        );
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
      message.error("Failed to load ticket details");
    }
  }, []);

  // Handle drag start - pause WebSocket updates
  const handleDragStart = useCallback(() => {
    console.log("🚫 Drag started - pausing WebSocket updates");
    isDraggingRef.current = true;
    pendingUpdatesRef.current = [];
  }, []);

  // Handle drag end - resume WebSocket updates and apply pending changes
  const handleDragEnd = useCallback(() => {
    console.log("✅ Drag ended - resuming WebSocket updates");
    isDraggingRef.current = false;

    // Apply pending updates
    if (pendingUpdatesRef.current.length > 0) {
      console.log(
        `📦 Applying ${pendingUpdatesRef.current.length} queued updates`
      );

      pendingUpdatesRef.current.forEach(({ type, data }) => {
        if (type === "ticket_updated") {
          const updatedTicket = {
            ...data,
            ticket_key: data.ticket_key || `${selectedProject?.key}-${data.id}`,
          };

          setTickets((prev) => {
            return prev.map((t) => (t.id === data.id ? updatedTicket : t));
          });
        }
      });

      pendingUpdatesRef.current = [];
    }
  }, [selectedProject?.key]);

  // Handle ticket move between columns in Kanban with optimistic updates
  const handleTicketMove = async (
    ticketId: number,
    newColumnId: number,
    order: number
  ) => {
    console.log("🎯 handleTicketMove called:", {
      ticketId,
      newColumnId,
      order,
    });

    const ticket = tickets.find((t) => t.id === ticketId);
    const column = kanbanColumns.find((c) => c.id === newColumnId);

    console.log("📋 Ticket info:", {
      ticket: ticket
        ? { id: ticket.id, name: ticket.name, currentColumn: ticket.column }
        : "NOT FOUND",
      targetColumn: column ? { id: column.id, name: column.name } : "NOT FOUND",
    });

    if (!ticket || !column) {
      console.error("❌ Ticket or column not found");
      message.error("Failed to update ticket");
      return;
    }

    // Store previous state for rollback
    const previousColumnId = ticket.column;
    const previousColumnName = ticket.column_name;

    // OPTIMISTIC UPDATE: Update UI immediately
    console.log("⚡ Optimistic update: Updating UI immediately");
    setTickets((prevTickets) =>
      prevTickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              column: newColumnId,
              column_name: column.name,
              column_order: order, // Update order for proper sorting
            }
          : t
      )
    );

    // Send PATCH request in the background (non-blocking)
    console.log("🚀 Queuing PATCH request:", {
      url: `/api/tickets/tickets/${ticketId}/`,
      payload: { column: newColumnId, order: order },
      previousColumn: previousColumnId,
      previousOrder: ticket.column_order,
    });

    recentTicketUpdatesRef.current.set(ticketId, Date.now());

    try {
      const response = await ticketService.updateTicket(ticketId, {
        column: newColumnId,
        order: order,
      });

      console.log("✅ PATCH response received:", {
        ticketId,
        returnedColumn: response.column,
        returnedOrder: response.column_order,
        expectedColumn: newColumnId,
        expectedOrder: order,
        match:
          response.column === newColumnId && response.column_order === order,
      });
    } catch (error: any) {
      // ROLLBACK: Revert optimistic update on error
      console.error("❌ Failed to update ticket, rolling back:", error);

      if (previousColumnId !== undefined && previousColumnName !== undefined) {
        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  column: previousColumnId,
                  column_name: previousColumnName,
                }
              : t
          )
        );
      }

      message.error("Failed to update ticket - changes reverted");
    } finally {
      recentTicketUpdatesRef.current.set(ticketId, Date.now());
    }
  };

  const handleTicketReorder = async (
    updates: Array<{ ticket_id: number; column_id: number; order: number }>
  ) => {
    console.log("📋 handleTicketReorder called:", updates);

    try {
      await ticketService.reorderTickets(updates);
      console.log("✅ Tickets reordered successfully");
    } catch (error: any) {
      console.error("❌ Failed to reorder tickets:", error);
      message.error("Failed to save ticket order");
    }
  };

  const columns: TableColumnsType<Ticket> = [
    {
      title: "Work",
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
              fontSize: "16px",
              color: getTypeIcon(record.type).color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "#0052cc",
              fontWeight: 500,
              fontSize: "14px",
              marginRight: "8px",
            }}
          >
            {formatTicketId(record)}
          </span>
          <span style={{ color: "#172b4d", fontSize: "14px" }}>
            {record.name}
          </span>
        </div>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      width: 180,
    },
    {
      title: "Status",
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
      title: "Priority",
      dataIndex: "priorityId",
      key: "priorityId",
      width: 100,
      render: (priorityId: number) => getPriorityIcon(priorityId),
    },
    {
      title: "Urgency",
      dataIndex: "urgency",
      key: "urgency",
      width: 100,
      render: (urgency: string) => {
        const colorMap: Record<string, string> = {
          High: "red",
          Normal: "blue",
          Low: "green",
        };
        return <Tag color={colorMap[urgency]}>{urgency}</Tag>;
      },
    },
    {
      title: "Importance",
      dataIndex: "importance",
      key: "importance",
      width: 120,
      render: (importance: string) => {
        const colorMap: Record<string, string> = {
          Critical: "red",
          High: "volcano",
          Normal: "blue",
          Low: "green",
        };
        return <Tag color={colorMap[importance]}>{importance}</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
    },
  ];

  const normalizedSearch = searchText.trim().toLowerCase();

  const matchesSearch = (ticket: Ticket) => {
    if (!normalizedSearch) return true;
    return (
      ticket.name.toLowerCase().includes(normalizedSearch) ||
      ticket.ticket_key?.toLowerCase().includes(normalizedSearch) ||
      ticket.tags_detail?.some((tag) =>
        tag.name.toLowerCase().includes(normalizedSearch)
      )
    );
  };

  const matchesStatus = (ticket: Ticket) =>
    !filterStatus || ticket.column_name === filterStatus;

  const filteredTickets = tickets
    .filter((ticket) => !ticket.is_archived)
    .filter((ticket) => matchesSearch(ticket) && matchesStatus(ticket));

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
      message.error("Failed to load archive");
    } finally {
      setArchiveLoading(false);
    }
  }, [selectedProject]);

  const filteredArchivedTickets = archivedTickets.filter(
    (ticket) => matchesSearch(ticket) && matchesStatus(ticket)
  );

  useEffect(() => {
    if (viewMode === "archive") {
      loadArchivedTickets();
    }
  }, [viewMode, loadArchivedTickets]);

  const handleRestoreTicket = useCallback(async (ticketId: number) => {
    try {
      const restoredTicket = await ticketService.restoreTicket(ticketId);
      message.success(`${restoredTicket.ticket_key} restored`);
      setArchivedTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setTickets((prev) => {
        const without = prev.filter((t) => t.id !== ticketId);
        return [restoredTicket, ...without];
      });
    } catch (error: any) {
      console.error("Failed to restore ticket", error);
      message.error("Failed to restore ticket");
    }
  }, []);

  const archiveColumns = useMemo<TableColumnsType<Ticket>>(
    () => [
      {
        title: "Work",
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
                fontSize: "16px",
                color: getTypeIcon(record.type).color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "#0052cc",
                fontWeight: 500,
                fontSize: "14px",
                marginRight: "8px",
              }}
            >
              {formatTicketId(record)}
            </span>
            <span style={{ color: "#172b4d", fontSize: "14px" }}>
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
    [handleRestoreTicket]
  );

  const handleTicketModalSuccess = useCallback((updatedTicket: Ticket) => {
    setTickets((prev) => {
      if (!updatedTicket) return prev;
      const existing = prev.some((t) => t.id === updatedTicket.id);
      if (updatedTicket.is_archived) {
        return prev.filter((t) => t.id !== updatedTicket.id);
      }
      if (existing) {
        return prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
      }
      return [updatedTicket, ...prev];
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
          borderBottom: "1px solid #e8e8e8",
          backgroundColor: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Board</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Input
              placeholder="Search"
              prefix={<SearchOutlined style={{ color: "#5e6c84" }} />}
              value={searchText}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setSearchText(event.target.value)
              }
              allowClear
              style={{
                width: 200,
                backgroundColor: "#f4f5f7",
                border: "1px solid #dfe1e6",
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
              setViewMode(value as "list" | "kanban" | "deadline" | "archive")
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
            onTicketClick={handleTicketClick}
            onTicketMove={handleTicketMove}
            onTicketReorder={handleTicketReorder}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onTicketCreated={(ticket) => {
              receivedTicketIdsRef.current.add(ticket.id);
              setTickets((prev) => [ticket, ...prev]);
            }}
          />
        ) : viewMode === "deadline" ? (
          <DeadlineView
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
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newTicket) => {
          console.log(`✨ Ticket created:`, newTicket);

          // Mark this ticket ID as received (it will come via WebSocket soon)
          receivedTicketIdsRef.current.add(newTicket.id);

          // Add the ticket immediately for instant feedback
          // The WebSocket duplicate check will prevent double-adding
          setTickets((prev) => [newTicket, ...prev]);
          setIsCreateModalOpen(false);

          console.log(
            `✅ Ticket ${newTicket.id} added to UI, WebSocket will be ignored`
          );
        }}
      />
    </div>
  );
};

export default Tickets;
