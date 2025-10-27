import React, { useState } from "react";
import { Button, Input, Select, Table, Tag, Space } from "antd";
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

// Mock data
const mockTickets: Ticket[] = [
  {
    id: 1,
    project: 1,
    project_key: "PROJ",
    column: 1,
    colId: 1,
    name: "Website homepage not loading for mobile users",
    priority_id: 4,
    priorityId: 4,
    following: true,
    assignee_ids: [1, 2],
    assigneeIds: [1, 2],
    tags: [1, 3],
    tag_names: ["TechCorp Solutions", "High Priority"],
    status: "New",
    created_at: "2025-10-15",
    createdAt: "2025-10-15",
    updated_at: "2025-10-15",
    urgency: "High",
    importance: "Critical",
    type: "bug",
  },
  {
    id: 2,
    project: 1,
    project_key: "PROJ",
    column: 2,
    colId: 2,
    name: "Integrate payment gateway with new API",
    priority_id: 2,
    priorityId: 2,
    assignee_ids: [1],
    assigneeIds: [1],
    tags: [2],
    tag_names: ["RetailMax Inc"],
    status: "In Progress",
    created_at: "2025-10-14",
    createdAt: "2025-10-14",
    updated_at: "2025-10-14",
    urgency: "Normal",
    importance: "High",
    type: "task",
  },
  {
    id: 3,
    project: 1,
    project_key: "PROJ",
    column: 2,
    colId: 2,
    name: "Fix typo in user registration email",
    priority_id: 3,
    priorityId: 3,
    assignee_ids: [2],
    assigneeIds: [2],
    tags: [4],
    tag_names: ["StartupHub"],
    status: "In Progress",
    created_at: "2025-10-13",
    createdAt: "2025-10-13",
    updated_at: "2025-10-13",
    urgency: "Low",
    importance: "Normal",
    type: "bug",
  },
  {
    id: 4,
    project: 1,
    project_key: "PROJ",
    column: 2,
    colId: 2,
    name: "Improve database query performance",
    priority_id: 2,
    priorityId: 2,
    following: true,
    commentsCount: 3,
    assignee_ids: [1, 2, 3],
    assigneeIds: [1, 2, 3],
    tags: [5],
    tag_names: ["DataFlow Systems"],
    status: "In Progress",
    created_at: "2025-10-12",
    createdAt: "2025-10-12",
    updated_at: "2025-10-12",
    urgency: "Normal",
    importance: "High",
    type: "story",
  },
  {
    id: 5,
    project: 1,
    project_key: "PROJ",
    column: 3,
    colId: 3,
    name: "Update user documentation",
    priority_id: 1,
    priorityId: 1,
    assignee_ids: [2],
    assigneeIds: [2],
    tags: [6],
    tag_names: ["EduTech Platform"],
    status: "Review",
    created_at: "2025-10-11",
    createdAt: "2025-10-11",
    updated_at: "2025-10-11",
    urgency: "Low",
    importance: "Low",
    type: "task",
  },
  {
    id: 6,
    project: 1,
    project_key: "PROJ",
    column: 1,
    colId: 1,
    name: "Cannot login with SSO credentials",
    priority_id: 4,
    priorityId: 4,
    commentsCount: 11,
    assignee_ids: [1, 3],
    assigneeIds: [1, 3],
    tags: [7],
    tag_names: ["Enterprise Global"],
    status: "New",
    created_at: "2025-10-10",
    createdAt: "2025-10-10",
    updated_at: "2025-10-10",
    urgency: "High",
    importance: "Critical",
    type: "bug",
  },
  {
    id: 7,
    project: 1,
    project_key: "PROJ",
    column: 4,
    colId: 4,
    name: "Migrate legacy authentication system",
    priority_id: 3,
    priorityId: 3,
    assignee_ids: [3],
    assigneeIds: [3],
    tags: [8],
    tag_names: ["FinanceFlow"],
    status: "Done",
    created_at: "2025-10-09",
    createdAt: "2025-10-09",
    updated_at: "2025-10-09",
    urgency: "Normal",
    importance: "High",
    type: "epic",
  },
  {
    id: 8,
    project: 1,
    project_key: "PROJ",
    column: 1,
    colId: 1,
    name: "Server returning 500 errors intermittently",
    priority_id: 4,
    priorityId: 4,
    commentsCount: 8,
    assignee_ids: [1, 2, 3],
    assigneeIds: [1, 2, 3],
    tags: [9],
    tag_names: ["CloudServe Inc"],
    status: "New",
    created_at: "2025-10-08",
    createdAt: "2025-10-08",
    updated_at: "2025-10-08",
    urgency: "High",
    importance: "Critical",
    type: "bug",
  },
];

const mockColumns: TicketColumn[] = [
  { id: 1, name: "New", project: 1, order: 1 },
  { id: 2, name: "In Progress", project: 1, order: 2 },
  { id: 3, name: "Review", project: 1, order: 3 },
  { id: 4, name: "Done", project: 1, order: 4 },
];

const Tickets: React.FC = () => {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesSearch =
      ticket.name.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.tag_names?.some((tag) =>
        tag.toLowerCase().includes(searchText.toLowerCase())
      );
    const matchesStatus = !filterStatus || ticket.status === filterStatus;
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
              <Option value="New">New</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Review">Review</Option>
              <Option value="Done">Done</Option>
            </Select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Space.Compact size="small">
            <Button
              type={viewMode === "list" ? "primary" : "default"}
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode("list")}
            />
            <Button
              type={viewMode === "kanban" ? "primary" : "default"}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode("kanban")}
            />
          </Space.Compact>
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
        {viewMode === "list" ? (
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
          />
        ) : (
          <KanbanBoard
            tickets={filteredTickets}
            columns={mockColumns}
            onTicketClick={setSelectedTicket}
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
