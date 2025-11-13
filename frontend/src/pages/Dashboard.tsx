import React, { useState, useEffect, useRef } from "react";
import { Input, Table, Tag, Badge, Button, message } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getPriorityIcon } from "../components/PriorityIcons";
import { TicketModal } from "../components/TicketModal";
import { CreateTicketModal } from "../components/CreateTicketModal";
import { useProject } from "../contexts/AppContext";
import type { Ticket } from "../types/api";
import type { TableColumnsType } from "antd";
import { ticketService } from "../services";

interface FilterBox {
  id: string;
  title: string;
  filter: (ticket: Ticket) => boolean;
  color: string;
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

// Sortable Filter Box Component
const SortableFilterBox: React.FC<{
  box: FilterBox;
  filteredCount: number;
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}> = ({ box, filteredCount, tickets, onTicketClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: box.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: "#fff",
        border: "1px solid #dfe1e6",
        borderRadius: "3px",
        padding: "12px",
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? transition : "all 0.2s",
        height: "150px", // Reduced height for tighter spacing
        display: "flex",
        flexDirection: "column",
      }}
      {...attributes}
      {...listeners}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = box.color;
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "#dfe1e6";
          e.currentTarget.style.boxShadow = "none";
        }
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Badge
            count={filteredCount}
            style={{
              backgroundColor: box.color,
              fontSize: "12px",
              fontWeight: 600,
              minWidth: "24px",
              height: "24px",
              lineHeight: "24px",
            }}
          />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#172b4d" }}>
            {box.title}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {tickets
          .filter(box.filter)
          .slice(0, 3)
          .map((ticket) => (
            <div
              key={ticket.id}
              onClick={(e) => {
                e.stopPropagation();
                onTicketClick(ticket);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 0",
                fontSize: "12px",
                color: "#5e6c84",
                cursor: "pointer",
              }}
            >
              <FontAwesomeIcon
                icon={getTypeIcon(ticket.type).icon}
                style={{
                  fontSize: "12px",
                  color: getTypeIcon(ticket.type).color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{ color: "#0052cc", fontWeight: 500, flexShrink: 0 }}
              >
                {formatTicketId(ticket)}
              </span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "#172b4d",
                }}
              >
                {ticket.name}
              </span>
            </div>
          ))}
        {filteredCount > 3 && (
          <div
            style={{
              fontSize: "12px",
              color: "#5e6c84",
              marginTop: "4px",
              fontStyle: "italic",
            }}
          >
            +{filteredCount - 3} more...
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  // Track optimistic tickets to avoid duplicates when WebSocket confirms
  // Maps temporary negative ID -> real ticket ID from backend
  const optimisticTicketsRef = useRef<Map<number, number>>(new Map());
  let nextTempId = useRef(-1); // Temporary IDs for optimistic tickets

  const [filterBoxes, setFilterBoxes] = useState<FilterBox[]>([
    {
      id: "unassigned",
      title: "Unassigned",
      filter: (ticket) => !ticket.assignees || ticket.assignees.length === 0,
      color: "#ff4d4f",
    },
    {
      id: "myTickets",
      title: "Assigned to Me",
      filter: (ticket) =>
        ticket.assignees?.some((user) => user.id === 1) || false,
      color: "#1890ff",
    },
    {
      id: "inProgress",
      title: "In Progress",
      filter: (ticket) => ticket.column_name === "In Progress",
      color: "#1565C0",
    },
    {
      id: "toDo",
      title: "To Do",
      filter: (ticket) => ticket.column_name === "To Do",
      color: "#52c41a",
    },
    {
      id: "critical",
      title: "Critical Priority",
      filter: (ticket) => ticket.priority_id === 4,
      color: "#e5493a",
    },
  ]);

  // Fetch tickets from API
  const fetchTickets = async () => {
    if (!selectedProject) {
      setTickets([]);
      return;
    }

    setLoading(true);
    setNetworkError(false);
    try {
      const response = await ticketService.getTickets({
        project: selectedProject.id,
      });
      // Use tickets directly from API response (no mapping needed)
      setTickets(response.results);
      setNetworkError(false);
    } catch (error: any) {
      console.error("Failed to fetch tickets:", error);
      setNetworkError(true);
      message.error(
        error.message ||
          "Failed to load tickets. Please check your network connection."
      );
    } finally {
      setLoading(false);
    }
  };

  // Load tickets on mount and when project changes
  const { selectedProject } = useProject();

  useEffect(() => {
    if (selectedProject) {
      fetchTickets();
    }
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

      console.log(`🎫 [Dashboard] Received ${type} event:`, data);

      if (type === "ticket_created") {
        // Check if we have an optimistic ticket for this
        const optimisticId = Array.from(
          optimisticTicketsRef.current.entries()
        ).find(([_, realId]) => realId === data.ticket_id)?.[0];

        if (optimisticId) {
          // Replace optimistic ticket with real one
          console.log(
            `🔄 Replacing optimistic ticket ${optimisticId} with real ticket ${data.ticket_id}`
          );
          try {
            const newTicket = await ticketService.getTicket(data.ticket_id);
            setTickets((prev) =>
              prev.map((t) => (t.id === optimisticId ? newTicket : t))
            );
            optimisticTicketsRef.current.delete(optimisticId);
          } catch (error) {
            console.error("Failed to fetch new ticket:", error);
          }
        } else {
          // This is from another user/session, add it normally
          console.log(`➕ Adding new ticket from WebSocket: ${data.ticket_id}`);
          try {
            const newTicket = await ticketService.getTicket(data.ticket_id);
            // Check if ticket already exists (edge case)
            setTickets((prev) => {
              if (prev.some((t) => t.id === newTicket.id)) {
                console.log(
                  `⚠️ Ticket ${newTicket.id} already exists, skipping`
                );
                return prev;
              }
              return [newTicket, ...prev];
            });
            message.success(
              `New ticket created: ${data.ticket_key || `#${data.ticket_id}`}`
            );
          } catch (error) {
            console.error("Failed to fetch new ticket:", error);
          }
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

  // Handle ticket creation success - optimistic update with tracking
  const handleTicketCreated = (newTicket: Ticket) => {
    console.log(`✨ Optimistic ticket created:`, newTicket);

    // Create a temporary ID for this optimistic ticket
    const tempId = nextTempId.current--;

    // Track the mapping: tempId -> real ticket ID
    optimisticTicketsRef.current.set(tempId, newTicket.id);

    // Create optimistic ticket with temporary ID
    const optimisticTicket = { ...newTicket, id: tempId };

    // Add optimistic ticket immediately for instant feedback
    setTickets((prev) => [optimisticTicket, ...prev]);
    setIsCreateModalOpen(false);

    // Success message will come from WebSocket when real ticket arrives
    console.log(
      `📝 Optimistic ticket added with tempId: ${tempId}, will replace with real ID: ${newTicket.id}`
    );
  };

  // Handle ticket update success
  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    );
    setSelectedTicket(null);
  };

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFilterBoxes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
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
          onClick={() => handleTicketClick(record)}
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
              flexShrink: 0,
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
      dataIndex: "priority_id",
      key: "priority_id",
      width: 100,
      render: (priority_id: number) => getPriorityIcon(priority_id),
    },
    {
      title: "Urgency",
      dataIndex: "urgency",
      key: "urgency",
      width: 100,
      render: (urgency: string) => {
        // Capitalize urgency from API (e.g., "high" -> "High")
        const capitalizedUrgency = urgency
          ? urgency.charAt(0).toUpperCase() + urgency.slice(1)
          : "Normal";
        const colorMap: Record<string, string> = {
          High: "red",
          Normal: "blue",
          Low: "green",
        };
        return (
          <Tag color={colorMap[capitalizedUrgency]}>{capitalizedUrgency}</Tag>
        );
      },
    },
    {
      title: "Importance",
      dataIndex: "importance",
      key: "importance",
      width: 120,
      render: (importance: string) => {
        // Capitalize importance from API (e.g., "critical" -> "Critical")
        const capitalizedImportance = importance
          ? importance.charAt(0).toUpperCase() + importance.slice(1)
          : "Normal";
        const colorMap: Record<string, string> = {
          Critical: "red",
          High: "volcano",
          Normal: "blue",
          Low: "green",
        };
        return (
          <Tag color={colorMap[capitalizedImportance]}>
            {capitalizedImportance}
          </Tag>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (created_at: string) => {
        if (!created_at) return "-";
        // Format: "Oct 27, 2025"
        const date = new Date(created_at);
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      },
    },
  ];

  const filteredTickets = tickets.filter((ticket) =>
    ticket.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Dashboard</h1>
      </div>

      {/* Network Error Banner */}
      {networkError && (
        <div
          style={{
            backgroundColor: "#fff2e8",
            borderBottom: "2px solid #ffa940",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontSize: "18px",
                color: "#d46b08",
              }}
            >
              ⚠️
            </span>
            <div>
              <div style={{ fontWeight: 600, color: "#d46b08" }}>
                Network Connection Error
              </div>
              <div style={{ fontSize: "13px", color: "#8c6c3c" }}>
                Unable to connect to the backend server. Please check your
                network connection or contact support.
              </div>
            </div>
          </div>
          <Button
            onClick={fetchTickets}
            icon={<ReloadOutlined />}
            loading={loading}
            type="primary"
          >
            Retry
          </Button>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "20px",
          backgroundColor: "#f4f5f7",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#172b4d",
              marginBottom: "12px",
            }}
          >
            Quick Filters
          </h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filterBoxes.map((box) => box.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  overflowX: "auto",
                  paddingBottom: "4px",
                }}
              >
                {filterBoxes.map((box) => {
                  const filteredCount = tickets.filter(box.filter).length;

                  return (
                    <div
                      key={box.id}
                      style={{ minWidth: "240px", width: "240px" }}
                    >
                      <SortableFilterBox
                        box={box}
                        filteredCount={filteredCount}
                        tickets={tickets}
                        onTicketClick={handleTicketClick}
                      />
                    </div>
                  );
                })}
                {/* Add Filter Button */}
                <div style={{ minWidth: "240px", width: "240px" }}>
                  <button
                    onClick={() => console.log("Add new filter")}
                    style={{
                      width: "100%",
                      height: "60px",
                      border: "2px dashed #dfe1e6",
                      borderRadius: "3px",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      fontSize: "20px",
                      color: "#5e6c84",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f4f5f7";
                      e.currentTarget.style.borderColor = "#172b4d";
                      e.currentTarget.style.color = "#172b4d";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "#dfe1e6";
                      e.currentTarget.style.color = "#5e6c84";
                    }}
                  >
                    + Add Filter
                  </button>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#172b4d",
                margin: 0,
              }}
            >
              All Tickets
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
                size="small"
              >
                Create Ticket
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchTickets}
                loading={loading}
                size="small"
              >
                Refresh
              </Button>
              <Input
                placeholder="Search tickets..."
                prefix={<SearchOutlined style={{ color: "#5e6c84" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: 240,
                  backgroundColor: "#fff",
                  border: "1px solid #dfe1e6",
                  borderRadius: "3px",
                }}
                size="small"
              />
            </div>
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #dfe1e6",
              borderRadius: "3px",
            }}
          >
            <Table
              columns={columns}
              dataSource={filteredTickets}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} tickets`,
              }}
              size="small"
              rowKey="id"
              scroll={{ x: 1200 }}
            />
          </div>
        </div>
      </div>

      {/* Edit Ticket Modal */}
      <TicketModal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        mode="edit"
        onSuccess={handleTicketUpdated}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        columnId={1} // Default to first column (To Do)
        onSuccess={handleTicketCreated}
      />
    </div>
  );
};

export default Dashboard;
