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
const formatTicketId = (type?: string, id?: number) => {
  const typePrefix = type ? type.toUpperCase() : "TASK";
  return `${typePrefix}-${id}`;
};

// Mock data
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

const mockColumns: TicketColumn[] = [
  { id: 1, name: "New", order: 1 },
  { id: 2, name: "In Progress", order: 2 },
  { id: 3, name: "Review", order: 3 },
  { id: 4, name: "Done", order: 4 },
];

const Tickets: React.FC = () => {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesSearch =
      ticket.name.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.customer?.toLowerCase().includes(searchText.toLowerCase());
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
          <Button type="primary" icon={<PlusOutlined />} size="small">
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
    </div>
  );
};

export default Tickets;
