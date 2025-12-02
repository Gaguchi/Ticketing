import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  Tabs,
  Button,
  Space,
  Typography,
  Avatar,
  Spin,
  message,
  Dropdown,
  Badge,
  Statistic,
  Row,
  Col,
  Table,
  List,
  Empty,
  Form,
  Input,
  Select,
  Popconfirm,
  Modal,
  Upload,
  Tag,
  Tooltip,
} from "antd";
import type { UploadFile } from "antd";
import {
  ArrowLeftOutlined,
  ShopOutlined,
  EditOutlined,
  MoreOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  TableOutlined,
  AppstoreOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  InboxOutlined,
  RollbackOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";
import { ticketService } from "../services";
import { useCompanyStats } from "../hooks/useCompanyStats";
import { useApp } from "../contexts/AppContext";
import { KanbanBoard } from "../components/KanbanBoard";
import { DeadlineView } from "../components/DeadlineView";
import { TicketModal } from "../components/TicketModal";
import type { TicketColumn, Ticket } from "../types/api";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface CompanyUser {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Company {
  id: number;
  name: string;
  description: string;
  logo?: string;
  logo_url?: string;
  logo_thumbnail_url?: string;
  primary_contact_email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  ticket_count: number;
  admin_count: number;
  user_count: number;
  project_count: number;
  admins: CompanyUser[];
  users: CompanyUser[];
}

interface AvailableUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

const healthConfig = {
  critical: {
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
    icon: <ExclamationCircleOutlined />,
    label: "Critical",
    description: "Requires immediate attention",
  },
  attention: {
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
    icon: <WarningOutlined />,
    label: "Needs Attention",
    description: "Has overdue or urgent tickets",
  },
  healthy: {
    color: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    icon: <CheckCircleOutlined />,
    label: "Healthy",
    description: "All systems normal",
  },
  inactive: {
    color: "#6b7280",
    bgColor: "#f9fafb",
    borderColor: "#e5e7eb",
    icon: <ClockCircleOutlined />,
    label: "Inactive",
    description: "No recent activity",
  },
};

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProject } = useApp();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview"
  );

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [archivedTickets, setArchivedTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [ticketViewMode, setTicketViewMode] = useState<
    "table" | "kanban" | "deadline" | "archive"
  >("table");

  // Activity state for Overview
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [assigningTicketId, setAssigningTicketId] = useState<number | null>(
    null
  );

  // Ticket modal state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // User management state
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createUserForm] = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [removingAdminId, setRemovingAdminId] = useState<number | null>(null);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const companyId = id ? parseInt(id, 10) : 0;

  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useCompanyStats({
    companyId,
    projectId: selectedProject?.id,
    enabled: !!companyId,
  });

  // Fetch company details
  const fetchCompany = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const data = await apiService.get<Company>(
        API_ENDPOINTS.COMPANY_DETAIL(companyId)
      );
      console.log("🏢 [CompanyDetail] Company data loaded:", {
        id: data.id,
        name: data.name,
        logo_url: data.logo_url,
        logo_thumbnail_url: data.logo_thumbnail_url,
      });
      setCompany(data);
    } catch (error: any) {
      message.error(error.message || "Failed to load company");
      navigate("/companies");
    } finally {
      setLoading(false);
    }
  }, [companyId, navigate]);

  // Fetch tickets for this company
  const fetchTickets = useCallback(async () => {
    if (!company) return;

    setLoadingTickets(true);
    try {
      const response = await apiService.get<any>(
        `${API_ENDPOINTS.TICKETS}?company=${company.id}`
      );
      const ticketData = response.results || response;
      setTickets(Array.isArray(ticketData) ? ticketData : []);

      // Fetch columns
      if (selectedProject) {
        const columnsData = await apiService.get<TicketColumn[]>(
          `${API_ENDPOINTS.COLUMNS}?project=${selectedProject.id}`
        );
        setColumns(Array.isArray(columnsData) ? columnsData : []);
      }
    } catch (error: any) {
      message.error(error.message || "Failed to load tickets");
    } finally {
      setLoadingTickets(false);
    }
  }, [company, selectedProject]);

  // Fetch archived tickets
  const fetchArchivedTickets = useCallback(async () => {
    if (!company) return;

    setLoadingArchived(true);
    try {
      const response = await ticketService.getArchivedTickets({
        company: company.id,
      });
      const ticketData = response.results || response;
      setArchivedTickets(Array.isArray(ticketData) ? ticketData : []);
    } catch (error: any) {
      message.error(error.message || "Failed to load archived tickets");
    } finally {
      setLoadingArchived(false);
    }
  }, [company]);

  // Fetch activity for the company
  const fetchActivity = useCallback(async () => {
    if (!company) return;

    setLoadingActivities(true);
    try {
      const params = new URLSearchParams({
        company: String(company.id),
        limit: "15",
      });
      if (selectedProject) params.append("project", String(selectedProject.id));
      const response = await apiService.get<any>(
        `${API_ENDPOINTS.DASHBOARD_ACTIVITY}?${params}`
      );
      setActivities(Array.isArray(response) ? response : []);
    } catch (error: any) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setLoadingActivities(false);
    }
  }, [company, selectedProject]);

  // Fetch available users for admin assignment
  const fetchAvailableUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await apiService.get<any>(API_ENDPOINTS.USERS);
      const users = response.results || response;
      const existingAdminIds = company?.admins?.map((a) => a.id) || [];
      const available = (Array.isArray(users) ? users : []).filter(
        (u: AvailableUser) => !existingAdminIds.includes(u.id)
      );
      setAvailableUsers(available);
    } catch (error: any) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [company]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  useEffect(() => {
    if (company && activeTab === "tickets") {
      fetchTickets();
    }
  }, [company, activeTab, fetchTickets]);

  useEffect(() => {
    if (company && ticketViewMode === "archive") {
      fetchArchivedTickets();
    }
  }, [company, ticketViewMode, fetchArchivedTickets]);

  useEffect(() => {
    if (company && activeTab === "users") {
      fetchAvailableUsers();
    }
  }, [company, activeTab, fetchAvailableUsers]);

  // Fetch tickets and activity for Overview tab
  useEffect(() => {
    if (company && activeTab === "overview") {
      fetchTickets();
      fetchActivity();
    }
  }, [company, activeTab, fetchTickets, fetchActivity]);

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  // Handle ticket click - open modal
  const handleTicketClick = async (ticketId: number) => {
    try {
      const ticket = await ticketService.getTicket(ticketId);
      setSelectedTicket(ticket);
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
      message.error("Failed to load ticket details");
    }
  };

  // Handle ticket modal success
  const handleTicketModalSuccess = () => {
    setSelectedTicket(null);
    fetchTickets();
    fetchActivity();
    refetchStats();
  };

  // Quick assign handler
  const handleQuickAssign = async (ticketId: number, userId: number) => {
    setAssigningTicketId(ticketId);
    try {
      await apiService.patch(`${API_ENDPOINTS.TICKETS}${ticketId}/`, {
        assignee_ids: [userId],
      });
      message.success("Ticket assigned");
      // Optimistically update the local state
      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          t.id === ticketId ? { ...t, assignee_ids: [userId] } : t
        )
      );
      // Also refetch to ensure consistency
      fetchActivity();
    } catch (error: any) {
      message.error(error.message || "Failed to assign ticket");
      // Refetch on error to reset state
      fetchTickets();
    } finally {
      setAssigningTicketId(null);
    }
  };

  // User management handlers
  const handleAddUser = async (values: any) => {
    if (!company) return;

    setCreatingUser(true);
    try {
      await apiService.post(
        API_ENDPOINTS.COMPANY_CREATE_USER(company.id),
        values
      );
      message.success("User created and added to company");
      createUserForm.resetFields();
      setShowCreateUser(false);
      fetchCompany();
      refetchStats();
    } catch (error: any) {
      message.error(error.message || "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!company) return;

    setRemovingUserId(userId);
    try {
      await apiService.post(API_ENDPOINTS.COMPANY_REMOVE_USER(company.id), {
        user_id: userId,
      });
      message.success("User removed from company");
      fetchCompany();
      refetchStats();
    } catch (error: any) {
      message.error(error.message || "Failed to remove user");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleAssignAdmin = async () => {
    if (!company || !selectedAdminId) return;

    setAssigningAdmin(true);
    try {
      await apiService.post(API_ENDPOINTS.COMPANY_ASSIGN_ADMIN(company.id), {
        user_id: selectedAdminId,
      });
      message.success("Admin assigned to company");
      setSelectedAdminId(null);
      fetchCompany();
      fetchAvailableUsers();
    } catch (error: any) {
      message.error(error.message || "Failed to assign admin");
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId: number) => {
    if (!company) return;

    setRemovingAdminId(adminId);
    try {
      await apiService.post(API_ENDPOINTS.COMPANY_REMOVE_ADMIN(company.id), {
        user_id: adminId,
      });
      message.success("Admin removed from company");
      fetchCompany();
      fetchAvailableUsers();
    } catch (error: any) {
      message.error(error.message || "Failed to remove admin");
    } finally {
      setRemovingAdminId(null);
    }
  };

  // Edit company
  const handleEditCompany = () => {
    if (!company) return;
    editForm.setFieldsValue({
      name: company.name,
      description: company.description,
      primary_contact_email: company.primary_contact_email,
      phone: company.phone,
    });
    if (company.logo_url) {
      setFileList([
        { uid: "-1", name: "logo", status: "done", url: company.logo_url },
      ]);
    }
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!company) return;

    try {
      const values = await editForm.validateFields();
      setEditSubmitting(true);

      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append(
        "primary_contact_email",
        values.primary_contact_email || ""
      );
      formData.append("phone", values.phone || "");

      // Debug logging for logo upload
      console.log("📸 [CompanyDetail] Logo upload check:", {
        fileListLength: fileList.length,
        hasFile: fileList.length > 0,
        firstFile: fileList[0],
        hasOriginFileObj: fileList.length > 0 && !!fileList[0]?.originFileObj,
      });

      if (fileList.length > 0 && fileList[0].originFileObj) {
        console.log(
          "📸 [CompanyDetail] Uploading logo:",
          fileList[0].originFileObj.name
        );
        formData.append("logo", fileList[0].originFileObj);
      }

      // Use patchFormData for file uploads, not patch (which sends JSON)
      await apiService.patchFormData(
        API_ENDPOINTS.COMPANY_DETAIL(company.id),
        formData
      );

      message.success("Company updated successfully");
      setIsEditModalOpen(false);
      fetchCompany();
    } catch (error: any) {
      message.error(error.message || "Failed to update company");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete company
  const handleDeleteCompany = async () => {
    if (!company) return;

    Modal.confirm({
      title: "Delete Company",
      content: `Are you sure you want to delete "${company.name}"? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await apiService.delete(API_ENDPOINTS.COMPANY_DETAIL(company.id));
          message.success("Company deleted successfully");
          navigate("/companies");
        } catch (error: any) {
          message.error(error.message || "Failed to delete company");
        }
      },
    });
  };

  const moreMenu: MenuProps["items"] = [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Edit Company",
      onClick: handleEditCompany,
    },
    { type: "divider" },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete Company",
      danger: true,
      onClick: handleDeleteCompany,
    },
  ];

  const health = stats ? healthConfig[stats.health_status] : null;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Company not found" />
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button onClick={() => navigate("/companies")}>
            Back to Companies
          </Button>
        </div>
      </div>
    );
  }

  // Ticket columns for table view
  const ticketColumns = [
    {
      title: "Key",
      dataIndex: "ticket_key",
      key: "ticket_key",
      width: 100,
      render: (key: string, record: any) => (
        <Text strong style={{ color: "#1890ff" }}>
          {key || `#${record.id}`}
        </Text>
      ),
    },
    {
      title: "Title",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "column_name",
      key: "column_name",
      width: 120,
    },
    {
      title: "Priority",
      dataIndex: "priority_id",
      key: "priority_id",
      width: 100,
      render: (priorityId: number) => {
        const priorityMap: Record<number, { label: string; color: string }> = {
          1: { label: "Low", color: "#52c41a" },
          2: { label: "Medium", color: "#1890ff" },
          3: { label: "High", color: "#fa8c16" },
          4: { label: "Urgent", color: "#ff4d4f" },
        };
        const p = priorityMap[priorityId];
        return p ? <Tag color={p.color}>{p.label}</Tag> : "None";
      },
    },
    {
      title: "Assignee",
      dataIndex: "assignee_ids",
      key: "assignee_ids",
      width: 150,
      render: (ids: number[]) =>
        ids?.length > 0 ? `${ids.length} assigned` : "Unassigned",
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      key: "due_date",
      width: 120,
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/companies")}
          style={{ marginBottom: 16, padding: 0 }}
        >
          Back to Companies
        </Button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            {company.logo_url || company.logo_thumbnail_url ? (
              <Avatar
                size={64}
                src={company.logo_thumbnail_url || company.logo_url}
                style={{ objectFit: "contain" }}
                onError={() => {
                  console.error(
                    "🖼️ [CompanyDetail] Logo failed to load:",
                    company.logo_thumbnail_url || company.logo_url
                  );
                  return true; // Show fallback
                }}
              />
            ) : (
              <Avatar
                size={64}
                style={{ background: "#2C3E50" }}
                icon={<ShopOutlined />}
              />
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Title level={3} style={{ margin: 0 }}>
                  {company.name}
                </Title>
                {health && (
                  <Badge
                    count={
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 12,
                          backgroundColor: health.bgColor,
                          border: `1px solid ${health.borderColor}`,
                          color: health.color,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {health.icon}
                        {health.label}
                      </span>
                    }
                  />
                )}
              </div>
              {company.description && (
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  {company.description}
                </Text>
              )}
              {/* Company Contact Info in Header */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  marginTop: 8,
                }}
              >
                {company.primary_contact_email && (
                  <Tooltip title="Primary Contact Email">
                    <span
                      style={{
                        fontSize: 12,
                        color: "#595959",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MailOutlined style={{ color: "#8c8c8c" }} />
                      {company.primary_contact_email}
                    </span>
                  </Tooltip>
                )}
                {company.phone && (
                  <Tooltip title="Phone">
                    <span
                      style={{
                        fontSize: 12,
                        color: "#595959",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <PhoneOutlined style={{ color: "#8c8c8c" }} />
                      {company.phone}
                    </span>
                  </Tooltip>
                )}
                {company.address && (
                  <Tooltip title="Address">
                    <span
                      style={{
                        fontSize: 12,
                        color: "#595959",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <EnvironmentOutlined style={{ color: "#8c8c8c" }} />
                      {company.address}
                    </span>
                  </Tooltip>
                )}
                <Tooltip title="Created Date">
                  <span
                    style={{
                      fontSize: 12,
                      color: "#8c8c8c",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CalendarOutlined />
                    {company.created_at
                      ? new Date(company.created_at).toLocaleDateString()
                      : "Unknown"}
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>

          <Space>
            <Button icon={<EditOutlined />} onClick={handleEditCompany}>
              Edit
            </Button>
            <Dropdown menu={{ items: moreMenu }} trigger={["click"]}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>
      </div>

      {/* Stats Bar */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic
              title="Open Tickets"
              value={stats?.open_tickets ?? 0}
              prefix={<FileTextOutlined style={{ color: "#1890ff" }} />}
              loading={statsLoading}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Urgent"
              value={stats?.urgent_tickets ?? 0}
              valueStyle={{
                color: (stats?.urgent_tickets ?? 0) > 0 ? "#ff4d4f" : undefined,
              }}
              prefix={
                <ExclamationCircleOutlined
                  style={{
                    color:
                      (stats?.urgent_tickets ?? 0) > 0 ? "#ff4d4f" : "#8c8c8c",
                  }}
                />
              }
              loading={statsLoading}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Overdue"
              value={stats?.overdue_tickets ?? 0}
              valueStyle={{
                color:
                  (stats?.overdue_tickets ?? 0) > 0 ? "#fa8c16" : undefined,
              }}
              prefix={
                <ClockCircleOutlined
                  style={{
                    color:
                      (stats?.overdue_tickets ?? 0) > 0 ? "#fa8c16" : "#8c8c8c",
                  }}
                />
              }
              loading={statsLoading}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Resolved This Month"
              value={stats?.resolved_this_month ?? 0}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              loading={statsLoading}
            />
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          {/* Overview Tab */}
          <TabPane tab="Overview" key="overview">
            <Row gutter={24}>
              {/* Newest Tickets with Quick Assign */}
              <Col span={14}>
                <Card
                  title={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <FileTextOutlined style={{ color: "#1890ff" }} />
                      <span style={{ fontSize: 13 }}>Newest Tickets</span>
                    </div>
                  }
                  size="small"
                  style={{ borderRadius: 8, height: 400 }}
                  styles={{
                    body: {
                      padding: 0,
                      height: "calc(100% - 40px)",
                      overflow: "hidden",
                    },
                  }}
                  extra={
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleTabChange("tickets")}
                      style={{ fontSize: 11 }}
                    >
                      View All →
                    </Button>
                  }
                >
                  {loadingTickets ? (
                    <div style={{ padding: 32, textAlign: "center" }}>
                      <Spin size="small" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No tickets yet"
                      style={{ padding: 32 }}
                    />
                  ) : (
                    <div style={{ height: "100%", overflowY: "auto" }}>
                      {/* Header row */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "70px 1fr 90px 100px",
                          gap: 8,
                          padding: "8px 12px",
                          fontSize: 10,
                          color: "#8c8c8c",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          borderBottom: "1px solid #f0f0f0",
                          position: "sticky",
                          top: 0,
                          backgroundColor: "#fafafa",
                          zIndex: 1,
                        }}
                      >
                        <span>Ticket</span>
                        <span>Title</span>
                        <span>Priority</span>
                        <span style={{ textAlign: "center" }}>Assign</span>
                      </div>

                      {/* Ticket rows */}
                      {tickets
                        .filter((t) => !t.resolved_at)
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )
                        .slice(0, 10)
                        .map((ticket) => (
                          <div
                            key={ticket.id}
                            className="newest-ticket-row"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "70px 1fr 90px 100px",
                              gap: 8,
                              padding: "10px 12px",
                              fontSize: 12,
                              alignItems: "center",
                              borderBottom: "1px solid #f5f5f5",
                              cursor: "pointer",
                            }}
                            onClick={(e) => {
                              if (
                                (e.target as HTMLElement).closest(
                                  ".assign-select"
                                )
                              )
                                return;
                              handleTicketClick(ticket.id);
                            }}
                          >
                            {/* Ticket Key */}
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 11,
                                color: "#1890ff",
                                backgroundColor: "#e6f7ff",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: 500,
                              }}
                            >
                              {ticket.ticket_key}
                            </span>

                            {/* Title */}
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "#262626",
                              }}
                            >
                              {ticket.name}
                            </span>

                            {/* Priority */}
                            <span>
                              {(() => {
                                const priorityMap: Record<
                                  number,
                                  { label: string; color: string }
                                > = {
                                  1: { label: "Low", color: "#52c41a" },
                                  2: { label: "Medium", color: "#1890ff" },
                                  3: { label: "High", color: "#fa8c16" },
                                  4: { label: "Urgent", color: "#ff4d4f" },
                                };
                                const p = priorityMap[ticket.priority_id];
                                return p ? (
                                  <Tag
                                    color={p.color}
                                    style={{
                                      fontSize: 10,
                                      margin: 0,
                                      padding: "0 4px",
                                    }}
                                  >
                                    {p.label}
                                  </Tag>
                                ) : (
                                  <span
                                    style={{ color: "#bfbfbf", fontSize: 10 }}
                                  >
                                    -
                                  </span>
                                );
                              })()}
                            </span>

                            {/* Quick Assign */}
                            <div
                              className="assign-select"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Select
                                size="small"
                                placeholder={<SwapOutlined />}
                                value={
                                  ticket.assignee_ids?.length > 0
                                    ? ticket.assignee_ids[0]
                                    : undefined
                                }
                                onChange={(userId) =>
                                  handleQuickAssign(ticket.id, userId)
                                }
                                loading={assigningTicketId === ticket.id}
                                style={{ width: "100%", fontSize: 10 }}
                                popupMatchSelectWidth={false}
                                dropdownStyle={{ minWidth: 180 }}
                              >
                                {company.admins?.map((admin) => (
                                  <Select.Option
                                    key={admin.id}
                                    value={admin.id}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                    >
                                      <Avatar
                                        size={16}
                                        style={{
                                          backgroundColor: "#1890ff",
                                          fontSize: 9,
                                        }}
                                      >
                                        {admin.first_name?.[0] ||
                                          admin.email[0].toUpperCase()}
                                      </Avatar>
                                      <span style={{ fontSize: 11 }}>
                                        {admin.first_name && admin.last_name
                                          ? `${admin.first_name} ${admin.last_name}`
                                          : admin.email}
                                      </span>
                                    </div>
                                  </Select.Option>
                                ))}
                              </Select>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              </Col>

              {/* Live Activity Feed */}
              <Col span={10}>
                <Card
                  title={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          backgroundColor: "#52c41a",
                          borderRadius: "50%",
                          animation: "pulse 2s infinite",
                        }}
                      />
                      <span style={{ fontSize: 13 }}>Live Activity</span>
                    </div>
                  }
                  size="small"
                  style={{ borderRadius: 8, height: 400 }}
                  styles={{
                    body: {
                      padding: 0,
                      height: "calc(100% - 40px)",
                      overflow: "hidden",
                    },
                  }}
                  extra={
                    <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                      {activities.length} recent
                    </span>
                  }
                >
                  <style>
                    {`
                      @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                      }
                      .activity-item:hover {
                        background-color: #fafafa;
                      }
                      .newest-ticket-row:hover {
                        background-color: #f5f5f5 !important;
                      }
                    `}
                  </style>
                  {loadingActivities ? (
                    <div style={{ padding: 32, textAlign: "center" }}>
                      <Spin size="small" />
                    </div>
                  ) : activities.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No recent activity"
                      style={{ padding: 32 }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        overflowY: "auto",
                        padding: "12px 0",
                      }}
                    >
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="activity-item"
                          onClick={() =>
                            activity.ticket?.id &&
                            handleTicketClick(activity.ticket.id)
                          }
                          style={{
                            display: "flex",
                            padding: "10px 16px",
                            cursor: "pointer",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <Avatar
                            size={24}
                            style={{
                              backgroundColor: "#1890ff",
                              fontSize: 10,
                              flexShrink: 0,
                            }}
                          >
                            {activity.changed_by?.first_name?.[0] ||
                              activity.changed_by?.username?.[0] ||
                              "S"}
                          </Avatar>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, marginBottom: 2 }}>
                              <span style={{ fontWeight: 500 }}>
                                {activity.changed_by?.first_name ||
                                  activity.changed_by?.username ||
                                  "System"}
                              </span>
                              <span style={{ color: "#8c8c8c" }}>
                                {" "}
                                updated{" "}
                              </span>
                              <span
                                style={{ color: "#1890ff", fontWeight: 500 }}
                              >
                                {activity.field?.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#595959",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  backgroundColor: "#f5f5f5",
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                  marginRight: 4,
                                  fontSize: 10,
                                }}
                              >
                                {activity.ticket?.key}
                              </span>
                              {activity.ticket?.title}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#bfbfbf",
                                marginTop: 2,
                              }}
                            >
                              {activity.changed_at
                                ? new Date(activity.changed_at).toLocaleString()
                                : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            <Row gutter={24} style={{ marginTop: 24 }}>
              <Col span={12}>
                <Card
                  title={`Users (${company.users?.length ?? 0})`}
                  size="small"
                  extra={
                    <Button
                      type="link"
                      onClick={() => handleTabChange("users")}
                    >
                      Manage
                    </Button>
                  }
                >
                  {company.users?.length ? (
                    <List
                      size="small"
                      dataSource={company.users.slice(0, 5)}
                      renderItem={(user) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <Avatar size="small" icon={<UserOutlined />} />
                            }
                            title={
                              user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.email
                            }
                            description={user.email}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No users"
                    />
                  )}
                  {(company.users?.length ?? 0) > 5 && (
                    <Button
                      type="link"
                      onClick={() => handleTabChange("users")}
                    >
                      View all {company.users?.length} users
                    </Button>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  title={`IT Admins (${company.admins?.length ?? 0})`}
                  size="small"
                  extra={
                    <Button
                      type="link"
                      onClick={() => handleTabChange("users")}
                    >
                      Manage
                    </Button>
                  }
                >
                  {company.admins?.length ? (
                    <List
                      size="small"
                      dataSource={company.admins}
                      renderItem={(admin) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                size="small"
                                style={{ background: "#1890ff" }}
                                icon={<UserOutlined />}
                              />
                            }
                            title={
                              admin.first_name && admin.last_name
                                ? `${admin.first_name} ${admin.last_name}`
                                : admin.email
                            }
                            description={admin.email}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No admins assigned"
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* Tickets Tab */}
          <TabPane tab="Tickets" key="tickets">
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button
                  type={ticketViewMode === "table" ? "primary" : "default"}
                  icon={<TableOutlined />}
                  onClick={() => setTicketViewMode("table")}
                >
                  Table
                </Button>
                <Button
                  type={ticketViewMode === "kanban" ? "primary" : "default"}
                  icon={<AppstoreOutlined />}
                  onClick={() => setTicketViewMode("kanban")}
                >
                  Kanban
                </Button>
                <Button
                  type={ticketViewMode === "deadline" ? "primary" : "default"}
                  icon={<CalendarOutlined />}
                  onClick={() => setTicketViewMode("deadline")}
                >
                  Deadline
                </Button>
                <Button
                  type={ticketViewMode === "archive" ? "primary" : "default"}
                  icon={<InboxOutlined />}
                  onClick={() => setTicketViewMode("archive")}
                >
                  Archive
                </Button>
              </Space>
            </div>

            {ticketViewMode === "table" && (
              <Table
                dataSource={tickets}
                columns={ticketColumns}
                rowKey="id"
                loading={loadingTickets}
                pagination={{ pageSize: 10 }}
              />
            )}

            {ticketViewMode === "kanban" && (
              <KanbanBoard
                tickets={tickets}
                columns={columns}
                onTicketMove={async () => {
                  await fetchTickets();
                }}
                onTicketClick={() => {}}
              />
            )}

            {ticketViewMode === "deadline" && (
              <DeadlineView
                tickets={tickets}
                columns={columns}
                onTicketClick={() => {}}
              />
            )}

            {ticketViewMode === "archive" && (
              <Table
                dataSource={archivedTickets}
                columns={[
                  ...ticketColumns,
                  {
                    title: "Actions",
                    key: "actions",
                    width: 100,
                    render: (_: any, record: any) => (
                      <Button
                        type="link"
                        icon={<RollbackOutlined />}
                        onClick={async () => {
                          try {
                            await apiService.post(
                              `${API_ENDPOINTS.TICKETS}${record.id}/restore/`,
                              {}
                            );
                            message.success("Ticket restored");
                            fetchArchivedTickets();
                            fetchTickets();
                          } catch {
                            message.error("Failed to restore ticket");
                          }
                        }}
                      >
                        Restore
                      </Button>
                    ),
                  },
                ]}
                rowKey="id"
                loading={loadingArchived}
                pagination={{ pageSize: 10 }}
              />
            )}
          </TabPane>

          {/* Users & Admins Tab */}
          <TabPane tab="Users & Admins" key="users">
            <Row gutter={24}>
              {/* IT Admins Section */}
              <Col span={24} style={{ marginBottom: 24 }}>
                <Card
                  title={
                    <Space>
                      <TeamOutlined />
                      <span>IT Admins ({company.admins?.length ?? 0})</span>
                    </Space>
                  }
                  size="small"
                >
                  <div style={{ marginBottom: 16 }}>
                    <Space.Compact style={{ width: 400 }}>
                      <Select
                        placeholder="Select user to assign as admin"
                        style={{ width: 300 }}
                        value={selectedAdminId}
                        onChange={setSelectedAdminId}
                        loading={loadingUsers}
                        options={availableUsers.map((u) => ({
                          value: u.id,
                          label: `${u.first_name || u.username} ${
                            u.last_name || ""
                          }`.trim(),
                        }))}
                        allowClear
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAssignAdmin}
                        loading={assigningAdmin}
                        disabled={!selectedAdminId}
                      >
                        Assign
                      </Button>
                    </Space.Compact>
                  </div>

                  {company.admins?.length ? (
                    <List
                      dataSource={company.admins}
                      renderItem={(admin) => (
                        <List.Item
                          actions={[
                            <Popconfirm
                              key="remove"
                              title="Remove admin from company?"
                              onConfirm={() => handleRemoveAdmin(admin.id)}
                            >
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                loading={removingAdminId === admin.id}
                              >
                                Remove
                              </Button>
                            </Popconfirm>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                style={{ background: "#1890ff" }}
                                icon={<UserOutlined />}
                              />
                            }
                            title={
                              admin.first_name && admin.last_name
                                ? `${admin.first_name} ${admin.last_name}`
                                : admin.username || admin.email
                            }
                            description={admin.email}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No admins assigned"
                    />
                  )}
                </Card>
              </Col>

              {/* Company Users Section */}
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <UserOutlined />
                      <span>Company Users ({company.users?.length ?? 0})</span>
                    </Space>
                  }
                  size="small"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateUser(!showCreateUser)}
                    >
                      Create User
                    </Button>
                  }
                >
                  {/* Create User Form */}
                  {showCreateUser && (
                    <Card
                      size="small"
                      style={{ marginBottom: 16, background: "#fafafa" }}
                      title="Create New Company User"
                    >
                      <Form
                        form={createUserForm}
                        layout="vertical"
                        onFinish={handleAddUser}
                      >
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item
                              name="email"
                              label="Email"
                              rules={[{ required: true, type: "email" }]}
                            >
                              <Input placeholder="user@company.com" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name="username"
                              label="Username"
                              rules={[{ required: true }]}
                            >
                              <Input placeholder="username" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name="password"
                              label="Password"
                              rules={[{ required: true, min: 8 }]}
                            >
                              <Input.Password placeholder="password" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item name="first_name" label="First Name">
                              <Input placeholder="First name" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="last_name" label="Last Name">
                              <Input placeholder="Last name" />
                            </Form.Item>
                          </Col>
                          <Col
                            span={8}
                            style={{ display: "flex", alignItems: "flex-end" }}
                          >
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Space>
                                <Button
                                  type="primary"
                                  htmlType="submit"
                                  loading={creatingUser}
                                >
                                  Create User
                                </Button>
                                <Button
                                  onClick={() => setShowCreateUser(false)}
                                >
                                  Cancel
                                </Button>
                              </Space>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  )}

                  {/* Users List */}
                  {company.users?.length ? (
                    <Table
                      dataSource={company.users}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      columns={[
                        {
                          title: "Name",
                          key: "name",
                          render: (_, user) => (
                            <Space>
                              <Avatar size="small" icon={<UserOutlined />} />
                              <span>
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.username || user.email}
                              </span>
                            </Space>
                          ),
                        },
                        {
                          title: "Email",
                          dataIndex: "email",
                          key: "email",
                        },
                        {
                          title: "Actions",
                          key: "actions",
                          width: 120,
                          render: (_, user) => (
                            <Popconfirm
                              title="Remove user from company?"
                              onConfirm={() => handleRemoveUser(user.id)}
                            >
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                loading={removingUserId === user.id}
                              >
                                Remove
                              </Button>
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No users yet"
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* Settings Tab */}
          <TabPane tab="Settings" key="settings">
            <Row gutter={24}>
              <Col span={16}>
                <Card
                  title="Basic Information"
                  size="small"
                  style={{ marginBottom: 24 }}
                >
                  <Form layout="vertical">
                    <Form.Item label="Company Name">
                      <Input value={company.name} disabled />
                    </Form.Item>
                    <Form.Item label="Description">
                      <Input.TextArea
                        value={company.description}
                        disabled
                        rows={3}
                      />
                    </Form.Item>
                  </Form>
                  <Button onClick={handleEditCompany}>
                    Edit Company Details
                  </Button>
                </Card>

                <Card
                  title="Contact Information"
                  size="small"
                  style={{ marginBottom: 24 }}
                >
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Primary Email">
                          <Input
                            value={company.primary_contact_email || ""}
                            disabled
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Phone">
                          <Input value={company.phone || ""} disabled />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>

                <Card
                  title="Danger Zone"
                  size="small"
                  style={{ borderColor: "#ff4d4f" }}
                >
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <Text strong>Delete Company</Text>
                        <br />
                        <Text type="secondary">
                          Permanently remove this company and all associated
                          data
                        </Text>
                      </div>
                      <Button danger onClick={handleDeleteCompany}>
                        Delete Company
                      </Button>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Company"
        open={isEditModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => {
          setIsEditModalOpen(false);
          editForm.resetFields();
          setFileList([]);
        }}
        okText="Save"
        confirmLoading={editSubmitting}
        width={600}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="Company Name"
            rules={[{ required: true, message: "Please enter company name" }]}
          >
            <Input placeholder="Enter company name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Enter company description" />
          </Form.Item>
          <Form.Item name="primary_contact_email" label="Primary Contact Email">
            <Input placeholder="admin@company.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="+1 555-0123" />
          </Form.Item>
          <Form.Item label="Logo">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Ticket Modal */}
      <TicketModal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        mode="edit"
        onSuccess={handleTicketModalSuccess}
      />
    </div>
  );
};

export default CompanyDetail;
