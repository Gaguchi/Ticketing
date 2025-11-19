import React, { useState, useEffect } from "react";
import { Input, Select, Empty, Spin, Button } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import TicketCard from "../components/TicketCard";
import CreateTicketModal from "../components/CreateTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";
import { Ticket } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ results: Ticket[] }>(
        API_ENDPOINTS.MY_TICKETS
      );
      setTickets(response.results || []);
    } catch (error: any) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description?.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Tickets</h1>
          <p className="text-slate-500">
            Manage and track your support requests
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 shadow-md shadow-blue-600/20"
        >
          Create Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
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

      {/* Tickets List */}
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
                  ? "You haven't created any tickets yet"
                  : "No tickets match your filters"}
              </span>
            }
          />
          {tickets.length === 0 && (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => setSelectedTicketId(ticket.id)}
            />
          ))}
        </div>
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
