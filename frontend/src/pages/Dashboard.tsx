import React, { useState, useEffect } from "react";
import { Input, Table, Tag, Badge, Button, message } from "antd";
import { SearchOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
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
import type { Ticket } from "../types/ticket";
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

// Helper function to format ticket ID with type prefix
const formatTicketId = (type?: string, id?: number) => {
  const typePrefix = type ? type.toUpperCase() : "TASK";
  return `${typePrefix}-${id}`;
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
                {formatTicketId(ticket.type, ticket.id)}
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

const mockTickets: Ticket[] = [
  {
    id: 1,
    colId: 1,
    name: "Website homepage not loading for mobile users",
    priorityId: 4,
    following: true,
    assigneeIds: [1, 2],
    customer: "TechCorp Solutions",
    status: "New",
    createdAt: "2025-10-15",
    urgency: "High",
    importance: "Critical",
    type: "bug",
  },
  {
    id: 2,
    colId: 2,
    name: "Integrate payment gateway with new API",
    priorityId: 2,
    assigneeIds: [1],
    customer: "RetailMax Inc",
    status: "In Progress",
    createdAt: "2025-10-14",
    urgency: "Normal",
    importance: "High",
    type: "task",
  },
  {
    id: 3,
    colId: 2,
    name: "Fix typo in user registration email",
    priorityId: 3,
    assigneeIds: [2],
    customer: "StartupHub",
    status: "In Progress",
    createdAt: "2025-10-13",
    urgency: "Low",
    importance: "Normal",
    type: "bug",
  },
  {
    id: 4,
    colId: 2,
    name: "Improve database query performance",
    priorityId: 2,
    following: true,
    commentsCount: 3,
    assigneeIds: [1, 2, 3],
    customer: "DataFlow Systems",
    status: "In Progress",
    createdAt: "2025-10-12",
    urgency: "Normal",
    importance: "High",
    type: "story",
  },
  {
    id: 5,
    colId: 3,
    name: "Update user documentation",
    priorityId: 1,
    assigneeIds: [2],
    customer: "EduTech Platform",
    status: "Review",
    createdAt: "2025-10-11",
    urgency: "Low",
    importance: "Low",
    type: "task",
  },
  {
    id: 6,
    colId: 1,
    name: "Cannot login with SSO credentials",
    priorityId: 4,
    commentsCount: 11,
    assigneeIds: [1, 3],
    customer: "Enterprise Global",
    status: "New",
    createdAt: "2025-10-10",
    urgency: "High",
    importance: "Critical",
    type: "bug",
  },
  {
    id: 7,
    colId: 4,
    name: "Migrate legacy authentication system",
    priorityId: 3,
    assigneeIds: [3],
    customer: "FinanceFlow",
    status: "Done",
    createdAt: "2025-10-09",
    urgency: "Normal",
    importance: "High",
    type: "epic",
  },
  {
    id: 8,
    colId: 1,
    name: "Server returning 500 errors intermittently",
    priorityId: 4,
    commentsCount: 8,
    assigneeIds: [1, 2, 3],
    customer: "CloudServe Inc",
    status: "New",
    createdAt: "2025-10-08",
    urgency: "High",
    importance: "Critical",
    type: "bug",
  },
];

const Dashboard: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [filterBoxes, setFilterBoxes] = useState<FilterBox[]>([
    {
      id: "unassigned",
      title: "Unassigned",
      filter: (ticket) =>
        !ticket.assigneeIds || ticket.assigneeIds.length === 0,
      color: "#ff4d4f",
    },
    {
      id: "myTickets",
      title: "Assigned to Me",
      filter: (ticket) => ticket.assigneeIds?.includes(1) || false,
      color: "#1890ff",
    },
    {
      id: "inProgress",
      title: "In Progress",
      filter: (ticket) => ticket.status === "In Progress",
      color: "#fa8c16",
    },
    {
      id: "new",
      title: "New",
      filter: (ticket) => ticket.status === "New",
      color: "#52c41a",
    },
    {
      id: "critical",
      title: "Critical Priority",
      filter: (ticket) => ticket.priorityId === 4,
      color: "#e5493a",
    },
  ]);

  // Fetch tickets from API
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await ticketService.getTickets();
      setTickets(response.results);
    } catch (error: any) {
      console.error('Failed to fetch tickets:', error);
      message.error(error.message || 'Failed to load tickets');
      // Fallback to mock data on error
      setTickets(mockTickets);
    } finally {
      setLoading(false);
    }
  };

  // Load tickets on mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Handle ticket creation success
  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets(prev => [newTicket, ...prev]);
    setIsCreateModalOpen(false);
    message.success('Ticket created successfully!');
  };

  // Handle ticket update success
  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    setSelectedTicket(null);
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
              flexShrink: 0,
            }}
          >
            {formatTicketId(record.type, record.id)}
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
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          New: "blue",
          "In Progress": "orange",
          Review: "purple",
          Done: "green",
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
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
          Normal: "orange",
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
          High: "orange",
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
                  const filteredTickets = tickets.filter(box.filter);

                  return (
                    <div
                      key={box.id}
                      style={{ minWidth: "240px", width: "240px" }}
                    >
                      <SortableFilterBox
                        box={box}
                        filteredCount={filteredCount}
                        tickets={mockTickets}
                        onTicketClick={setSelectedTicket}
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
      <TicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
        columnId={1} // Default to first column (To Do)
        onSuccess={handleTicketCreated}
      />
    </div>
  );
};

export default Dashboard;
