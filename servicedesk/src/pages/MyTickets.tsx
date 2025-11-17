import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Input,
  Select,
  Space,
  Empty,
  Spin,
  Tag,
  Button,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import Navbar from "../components/Navbar";
import TicketCard from "../components/TicketCard";
import CreateTicketModal from "../components/CreateTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";
import { Ticket } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

const { Content } = Layout;
const { Title } = Typography;

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
      filtered = filtered.filter(
        (ticket) => ticket.priority_id === priorityId
      );
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
    <Layout style={{ minHeight: "100vh" }}>
      <Navbar />
      <Content style={{ padding: "24px 48px" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={2}>My Support Tickets</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Ticket
            </Button>
          </div>

          {/* Filters */}
          <Space wrap>
            <Input
              placeholder="Search tickets..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              suffixIcon={<FilterOutlined />}
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
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value="all">All Priorities</Select.Option>
              {priorities.map((priority) => (
                <Select.Option key={priority.id} value={priority.id.toString()}>
                  {priority.label}
                </Select.Option>
              ))}
            </Select>
            {(searchQuery ||
              statusFilter !== "all" ||
              priorityFilter !== "all") && (
              <Tag
                closable
                onClose={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
              >
                Clear Filters
              </Tag>
            )}
          </Space>

          {/* Tickets List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <Spin size="large" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <Empty
              description={
                tickets.length === 0
                  ? "You haven't created any tickets yet"
                  : "No tickets match your filters"
              }
            />
          ) : (
            <div>
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => setSelectedTicketId(ticket.id)}
                />
              ))}
            </div>
          )}
        </Space>
      </Content>

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
    </Layout>
  );
};

export default MyTickets;
