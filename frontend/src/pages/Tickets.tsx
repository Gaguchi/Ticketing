import React, { useState, useEffect, useRef } from "react";
import { Button, Input, Select, Table, Tag, message, Segmented } from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
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
import { debug, LogLevel, LogCategory } from "../utils/debug";
import "./Tickets.css";

const { Option } = Select;

// Helper function for issue type icons
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
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "deadline">(
    "kanban"
  );
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

  // Track pending API requests for optimistic updates (used internally, no visual indicator)
  const [, setPendingUpdates] = useState<Set<number>>(new Set());

  // Track ticket IDs we've received via WebSocket to prevent duplicates
  const receivedTicketIdsRef = useRef<Set<number>>(new Set());

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

        // Fetch columns for the project
        const projectColumns = await projectService.getProjectColumns(
          selectedProject.id
        );
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

        // Fetch tickets for the project
        const response = await ticketService.getTickets({
          project: selectedProject.id,
        });
        setTickets(response.results);

        // Track all existing ticket IDs
        receivedTicketIdsRef.current = new Set(
          response.results.map((t) => t.id)
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

        // Fetch and add the new ticket
        console.log(`➕ Adding new ticket from WebSocket: ${data.ticket_id}`);
        try {
          const newTicket = await ticketService.getTicket(data.ticket_id);
          setTickets((prev) => {
            // Double-check it doesn't exist
            if (prev.some((t) => t.id === newTicket.id)) {
              console.log(`⚠️ Ticket ${newTicket.id} already exists, skipping`);
              return prev;
            }
            return [newTicket, ...prev];
          });
          message.success(
            `New ticket created: ${data.key || `#${data.ticket_id}`}`
          );
        } catch (error) {
          console.error("Failed to fetch new ticket:", error);
          // Remove from set so it can retry
          receivedTicketIdsRef.current.delete(data.ticket_id);
        }
      } else if (type === "ticket_updated") {
        // Update existing ticket in list
        try {
          const updatedTicket = await ticketService.getTicket(data.ticket_id);
          setTickets((prev) =>
            prev.map((t) => (t.id === data.ticket_id ? updatedTicket : t))
          );
        } catch (error) {
          console.error("Failed to fetch updated ticket:", error);
        }
      } else if (type === "ticket_deleted") {
        // Remove ticket from list
        setTickets((prev) => prev.filter((t) => t.id !== data.ticket_id));
        message.info(
          `Ticket ${data.ticket_key || `#${data.ticket_id}`} was deleted`
        );
      }
    };

    window.addEventListener("ticketUpdate", handleTicketUpdate);

    return () => {
      window.removeEventListener("ticketUpdate", handleTicketUpdate);
    };
  }, [selectedProject?.id]);

  // Fetch full ticket details before opening modal
  const handleTicketClick = async (ticket: Ticket) => {
    try {
      const fullTicket = await ticketService.getTicket(ticket.id);
      setSelectedTicket(fullTicket);
    } catch (error: any) {
      console.error("Failed to fetch ticket details:", error);
      message.error("Failed to load ticket details");
    }
  };

  // Handle ticket move between columns in Kanban with optimistic updates
  const handleTicketMove = async (ticketId: number, newColumnId: number) => {
    console.log("🎯 handleTicketMove called:", { ticketId, newColumnId });

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

    // Mark as pending
    setPendingUpdates((prev) => new Set(prev).add(ticketId));

    // OPTIMISTIC UPDATE: Update UI immediately
    console.log("⚡ Optimistic update: Updating UI immediately");
    setTickets((prevTickets) =>
      prevTickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              column: newColumnId,
              column_name: column.name,
            }
          : t
      )
    );

    // Send PATCH request in the background (non-blocking)
    console.log("🚀 Queuing PATCH request:", {
      url: `/api/tickets/tickets/${ticketId}/`,
      payload: { column: newColumnId },
    });

    try {
      const response = await ticketService.updateTicket(ticketId, {
        column: newColumnId,
      });

      console.log("✅ PATCH response received:", response);
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
      // Remove from pending
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
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

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.name.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.tags_detail?.some((tag) =>
        tag.name.toLowerCase().includes(searchText.toLowerCase())
      );
    const matchesStatus = !filterStatus || ticket.column_name === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
              onChange={(e) => setSearchText(e.target.value)}
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
              onChange={setFilterStatus}
              size="small"
              style={{
                width: 140,
              }}
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
              setViewMode(value as "list" | "kanban" | "deadline")
            }
            options={[
              { label: "List", value: "list", icon: <UnorderedListOutlined /> },
              { label: "Kanban", value: "kanban", icon: <AppstoreOutlined /> },
              {
                label: "Deadline",
                value: "deadline",
                icon: <ClockCircleOutlined />,
              },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create
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
            onTicketCreated={(ticket) => {
              receivedTicketIdsRef.current.add(ticket.id);
              setTickets((prev) => [ticket, ...prev]);
            }}
          />
        ) : (
          <DeadlineView
            tickets={filteredTickets}
            columns={kanbanColumns}
            onTicketClick={handleTicketClick}
          />
        )}
      </div>

      {/* Ticket Modal */}
      <TicketModal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
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
