import React, { useState } from "react";
import { Button, Input, Select, Space, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { KanbanBoard } from "../components/KanbanBoard";
import { getPriorityIcon } from "../components/PriorityIcons";
import type { Ticket, TicketColumn } from "../types/ticket";
import "./Tickets.css";

const { Option } = Select;

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

  const columns: TableColumnsType<Ticket> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id: number) => `#${id}`,
    },
    {
      title: "Title",
      dataIndex: "name",
      key: "name",
      width: 300,
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
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              Tickets
            </h1>
            <p style={{ color: "#8c8c8c", fontSize: 13, margin: 0 }}>
              Manage and track all support tickets
            </p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="middle">
            New Ticket
          </Button>
        </div>

        {/* Filters and View Toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Space size="small">
            <Input
              placeholder="Search tickets..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              size="small"
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              size="small"
            >
              <Option value="New">New</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Review">Review</Option>
              <Option value="Done">Done</Option>
            </Select>
          </Space>

          <Space size="small">
            <Button
              type={viewMode === "list" ? "primary" : "default"}
              icon={<UnorderedListOutlined />}
              size="small"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
            <Button
              type={viewMode === "kanban" ? "primary" : "default"}
              icon={<AppstoreOutlined />}
              size="small"
              onClick={() => setViewMode("kanban")}
            >
              Board
            </Button>
          </Space>
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
          <KanbanBoard tickets={filteredTickets} columns={mockColumns} />
        )}
      </div>
    </div>
  );
};

export default Tickets;
