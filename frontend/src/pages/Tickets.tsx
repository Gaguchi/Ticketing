import React, { useState, useEffect } from "react";
import { Button, Input, Select, Table, Tag, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { KanbanBoard } from "../components/KanbanBoard";
import { getPriorityIcon } from "../components/PriorityIcons";
import { TicketModal } from "../components/TicketModal";
import { CreateTicketModal } from "../components/CreateTicketModal";
import { ticketService, projectService } from "../services";
import type { Ticket, TicketColumn } from "../types/ticket";
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

// Helper function to format ticket ID with type prefix
const formatTicketId = (projectKey?: string, id?: number) => {
  const key = projectKey || "TICK";
  return `${key}-${id}`;
};

const Tickets: React.FC = () => {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Real data from API
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch tickets and columns on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch user's projects
        const projectsResponse = await projectService.getProjects();
        console.log("📦 Projects response:", projectsResponse);

        // Handle both paginated and non-paginated responses
        const projects: any[] = Array.isArray(projectsResponse)
          ? projectsResponse
          : (projectsResponse as any)?.results || [];

        if (projects.length === 0) {
          message.warning("No projects found. Please create a project first.");
          return;
        }

        // Use stored project if valid, otherwise find a project with columns
        let project = null;
        const storedProjectData = localStorage.getItem("currentProject");

        if (storedProjectData && storedProjectData !== "undefined") {
          try {
            const storedProject = JSON.parse(storedProjectData);
            // Check if stored project exists in user's projects
            const foundProject = projects.find(
              (p: any) => p.id === storedProject.id
            );
            if (foundProject) {
              project = foundProject;
              console.log("📌 Using stored project:", project);
            }
          } catch (parseError) {
            console.warn("Failed to parse stored project");
            localStorage.removeItem("currentProject");
          }
        }

        // If no stored project, find the first project with columns
        if (!project) {
          // Try to find a project with columns_count > 0
          project =
            projects.find((p: any) => p.columns_count > 0) || projects[0];
          console.log("📌 Auto-selected project:", project);
        }

        // Store current project for future use
        localStorage.setItem("currentProject", JSON.stringify(project));

        // Fetch columns for the project
        const projectColumns = await projectService.getProjectColumns(
          project.id
        );
        console.log("📊 Project columns:", projectColumns);

        if (projectColumns.length === 0) {
          message.warning(
            `Project "${project.name}" has no columns. Please set up columns first.`
          );
        }

        setKanbanColumns(projectColumns);

        // Fetch tickets
        const response = await ticketService.getTickets();
        // Map API response fields
        const mappedTickets = response.results.map((ticket: any) => ({
          ...ticket,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          dueDate: ticket.due_date,
          startDate: ticket.start_date,
          priorityId: ticket.priority_id,
          projectKey: ticket.project_key,
          columnName: ticket.column_name,
          commentsCount: ticket.comments_count,
          tagsDetail: ticket.tags_detail,
          colId: ticket.column, // Map column to colId for KanbanBoard
        }));
        setTickets(mappedTickets);
      } catch (error: any) {
        console.error("Failed to fetch data:", error);
        message.error("Failed to load tickets");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch full ticket details before opening modal
  const handleTicketClick = async (ticket: Ticket) => {
    try {
      const fullTicket = await ticketService.getTicket(ticket.id);
      // Map the full ticket data
      const mappedTicket = {
        ...fullTicket,
        createdAt: fullTicket.created_at,
        updatedAt: fullTicket.updated_at,
        dueDate: fullTicket.due_date,
        startDate: fullTicket.start_date,
        priorityId: fullTicket.priority_id,
        projectKey: fullTicket.project_key,
        columnName: fullTicket.column_name,
        commentsCount: fullTicket.comments_count,
        tagsDetail: fullTicket.tags_detail,
      };
      setSelectedTicket(mappedTicket);
    } catch (error: any) {
      console.error("Failed to fetch ticket details:", error);
      message.error("Failed to load ticket details");
    }
  };

  // Handle ticket move between columns in Kanban
  const handleTicketMove = async (ticketId: number, newColumnId: number) => {
    console.log("🎯 handleTicketMove called:", { ticketId, newColumnId });

    try {
      const ticket = tickets.find((t) => t.id === ticketId);
      const column = kanbanColumns.find((c) => c.id === newColumnId);

      console.log("📋 Ticket info:", {
        ticket: ticket
          ? { id: ticket.id, name: ticket.name, currentColumn: ticket.colId }
          : "NOT FOUND",
        targetColumn: column
          ? { id: column.id, name: column.name }
          : "NOT FOUND",
      });

      if (!ticket || !column) {
        console.error("❌ Ticket or column not found");
        message.error("Failed to update ticket");
        return;
      }

      // Send PATCH request to update ticket column
      console.log("🚀 Sending PATCH request:", {
        url: `/api/tickets/tickets/${ticketId}/`,
        payload: { column: newColumnId },
      });

      const response = await ticketService.updateTicket(ticketId, {
        column: newColumnId,
      });

      console.log("✅ PATCH response received:", response);

      // Update local state
      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                column: newColumnId,
                colId: newColumnId,
                columnName: column.name,
              }
            : t
        )
      );

      console.log("✅ Local state updated");
      message.success(`Moved to ${column.name}`);
    } catch (error: any) {
      console.error("❌ Failed to update ticket:", error);
      message.error("Failed to update ticket");
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
            {formatTicketId(record.project_key, record.id)}
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
          "In Progress": "orange",
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

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.name.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.tag_names?.some((tag) =>
        tag.toLowerCase().includes(searchText.toLowerCase())
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
          <div style={{ display: "flex" }}>
            <Button
              type={viewMode === "list" ? "primary" : "default"}
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode("list")}
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            />
            <Button
              type={viewMode === "kanban" ? "primary" : "default"}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode("kanban")}
              style={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                marginLeft: -1,
              }}
            />
          </div>
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
        ) : (
          <KanbanBoard
            tickets={filteredTickets}
            columns={kanbanColumns}
            onTicketClick={handleTicketClick}
            onTicketMove={handleTicketMove}
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
        onSuccess={(_newTicket) => {
          setIsCreateModalOpen(false);
          // Optionally refresh the ticket list here
        }}
      />
    </div>
  );
};

export default Tickets;
