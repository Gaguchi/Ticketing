import React, { useState, useEffect } from "react";
import { Input, Select, Empty, Spin, Button, Radio, Table, Tag } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  AppstoreOutlined,
  BarsOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { KanbanBoard } from "../components/KanbanBoard";
import CreateTicketModal from "../components/CreateTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";
import { Ticket, Column, Project } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";
import {
  formatDate,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
} from "../utils/helpers";

const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "board" | "archive">("list");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projectsLoaded) {
      fetchTickets();
    }
  }, [view, selectedProjectId, projectsLoaded]);

  useEffect(() => {
    if (view === "board" && projectsLoaded) {
      fetchColumns();
    }
  }, [view, selectedProjectId, projectsLoaded]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const fetchProjects = async () => {
    try {
      const response = await apiService.get<any>(API_ENDPOINTS.AUTH_ME);
      const userProjects = response.projects || [];
      setProjects(userProjects);

      // If user has projects and no project is selected, select the first one
      if (userProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(userProjects[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setProjectsLoaded(true);
    }
  };

  const fetchColumns = async () => {
    try {
      let url = API_ENDPOINTS.COLUMNS;
      if (selectedProjectId) {
        url += `?project=${selectedProjectId}`;
      }
      const response = await apiService.get<any>(url);
      const data = Array.isArray(response) ? response : response.results || [];
      setColumns(data);
    } catch (error) {
      console.error("Failed to fetch columns:", error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let endpoint =
        view === "archive"
          ? API_ENDPOINTS.ARCHIVED_TICKETS
          : API_ENDPOINTS.MY_TICKETS;

      // Add page_size=1000 to fetch all tickets for client-side filtering/sorting
      const separator = endpoint.includes("?") ? "&" : "?";
      endpoint += `${separator}page_size=1000`;

      if (selectedProjectId) {
        endpoint += `&project=${selectedProjectId}`;
      }

      const response = await apiService.get<any>(endpoint);

      // Handle paginated response
      const data = Array.isArray(response) ? response : response.results || [];
      setTickets(data);
    } catch (error: any) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.name.toLowerCase().includes(query) ||
          (ticket.ticket_key &&
            ticket.ticket_key.toLowerCase().includes(query)) ||
          (ticket.key && ticket.key.toLowerCase().includes(query)) ||
          (ticket.description &&
            ticket.description.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      const priorityId = parseInt(priorityFilter);
      filtered = filtered.filter((ticket) => ticket.priority_id === priorityId);
    }

    setFilteredTickets(filtered);
  };

  const statuses = [...new Set(tickets.map((t) => t.status))];
  const priorities = [
    { id: 1, label: "Low" },
    { id: 2, label: "Medium" },
    { id: 3, label: "High" },
    { id: 4, label: "Critical" },
  ];

  const tableColumns = [
    {
      title: "Key",
      dataIndex: "ticket_key",
      key: "ticket_key",
      width: 100,
      render: (text: string, record: Ticket) => (
        <span className="font-mono text-xs text-slate-500">
          {text || record.key}
        </span>
      ),
    },
    {
      title: "Summary",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <span className="font-medium text-slate-700">{text}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} className="m-0 text-[10px]">
          {status}
        </Tag>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority_id",
      key: "priority",
      width: 100,
      render: (priorityId: number) => (
        <Tag color={getPriorityColor(priorityId)} className="m-0 text-[10px]">
          {getPriorityLabel(priorityId)}
        </Tag>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type: string) => (
        <Tag className="m-0 text-[10px] capitalize">{type}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (date: string) => (
        <span className="text-xs text-slate-500">{formatDate(date)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {view === "archive" ? "Archived Tickets" : "My Tickets"}
          </h1>
          <p className="text-slate-500">
            {view === "archive"
              ? "View your archived support requests"
              : "Manage and track your support requests"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Radio.Group
            value={view}
            onChange={(e) => setView(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="list">
              <BarsOutlined /> List
            </Radio.Button>
            <Radio.Button value="board">
              <AppstoreOutlined /> Board
            </Radio.Button>
            <Radio.Button value="archive">
              <InboxOutlined /> Archive
            </Radio.Button>
          </Radio.Group>

          {view !== "archive" && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 shadow-md shadow-blue-600/20"
            >
              Create Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {projects.length > 0 && (
          <Select
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            style={{ width: 200 }}
            placeholder="Select Project"
            className="w-full md:w-48"
          >
            {projects.map((project) => (
              <Select.Option key={project.id} value={project.id}>
                {project.name}
              </Select.Option>
            ))}
          </Select>
        )}

        <Input
          placeholder="Search tickets..."
          prefix={<SearchOutlined className="text-slate-400" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64"
          allowClear
        />

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            suffixIcon={<FilterOutlined className="text-slate-400" />}
            className="w-full sm:w-auto"
          >
            <Select.Option value="all">All Status</Select.Option>
            {statuses.map((status) => (
              <Select.Option key={status} value={status}>
                {status}
              </Select.Option>
            ))}
          </Select>

          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 150 }}
            suffixIcon={<FilterOutlined className="text-slate-400" />}
            className="w-full sm:w-auto"
          >
            <Select.Option value="all">All Priorities</Select.Option>
            {priorities.map((priority) => (
              <Select.Option key={priority.id} value={priority.id.toString()}>
                {priority.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        {(searchQuery ||
          statusFilter !== "all" ||
          priorityFilter !== "all") && (
          <Button
            type="text"
            danger
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
            className="ml-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Tickets Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-500">
                {tickets.length === 0
                  ? view === "archive"
                    ? "No archived tickets found"
                    : "You haven't created any tickets yet"
                  : "No tickets match your filters"}
              </span>
            }
          />
          {tickets.length === 0 && view !== "archive" && (
            <Button
              type="primary"
              className="mt-4 bg-blue-600"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create your first ticket
            </Button>
          )}
        </div>
      ) : (
        <>
          {view === "board" ? (
            <KanbanBoard
              tickets={filteredTickets}
              columns={columns}
              loading={loading}
              onTicketClick={(ticket) => setSelectedTicketId(ticket.id)}
            />
          ) : (
            <Table
              dataSource={filteredTickets}
              columns={tableColumns}
              rowKey="id"
              onRow={(record) => ({
                onClick: () => setSelectedTicketId(record.id),
                className: "cursor-pointer hover:bg-slate-50",
              })}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          )}
        </>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTickets}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        open={selectedTicketId !== null}
        onClose={() => setSelectedTicketId(null)}
        ticketId={selectedTicketId}
      />
    </div>
  );
};

export default MyTickets;
