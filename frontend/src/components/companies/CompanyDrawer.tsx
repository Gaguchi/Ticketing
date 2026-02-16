import React, { useState, useEffect } from "react";
import {
  Drawer,
  Avatar,
  Space,
  Typography,
  Button,
  List,
  Input,
  Form,
  Select,
  Spin,
  Divider,
  message,
  Popconfirm,
  Badge,
  Empty,
} from "antd";
import {
  ShopOutlined,
  UserOutlined,
  TeamOutlined,
  DeleteOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import apiService from "../../services/api.service";
import { API_ENDPOINTS } from "../../config/api";
import { useCompanyStats } from "../../hooks/useCompanyStats";

const { Title, Text } = Typography;

interface CompanyUser {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AvailableUser {
  id: number;
  username: string;
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
  ticket_count: number;
  admin_count: number;
  user_count: number;
  project_count: number;
  admins: CompanyUser[];
  users: CompanyUser[];
}

interface CompanyDrawerProps {
  open: boolean;
  company: Company | null;
  projectId?: number | null;
  onClose: () => void;
  onOpenFullDetails: (company: Company) => void;
  onRefresh: () => void;
}

const healthConfig = {
  critical: {
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
    icon: <ExclamationCircleOutlined />,
    label: "Critical",
  },
  attention: {
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
    icon: <ExclamationCircleOutlined />,
    label: "Needs Attention",
  },
  healthy: {
    color: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    icon: <CheckCircleOutlined />,
    label: "Healthy",
  },
  inactive: {
    color: "#6b7280",
    bgColor: "#f9fafb",
    borderColor: "#e5e7eb",
    icon: <ClockCircleOutlined />,
    label: "Inactive",
  },
};

export const CompanyDrawer: React.FC<CompanyDrawerProps> = ({
  open,
  company,
  projectId,
  onClose,
  onOpenFullDetails,
  onRefresh,
}) => {
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createUserForm] = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [removingAdminId, setRemovingAdminId] = useState<number | null>(null);

  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useCompanyStats({
    companyId: company?.id ?? 0,
    projectId,
    enabled: open && !!company,
  });

  // Fetch available users for admin assignment
  useEffect(() => {
    if (open && company) {
      fetchAvailableUsers();
    }
  }, [open, company]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await apiService.get<any>(API_ENDPOINTS.USERS);
      const users = response.results || response;
      // Filter out users that are already admins
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
  };

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
      onRefresh();
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
      onRefresh();
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
      onRefresh();
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
      onRefresh();
      fetchAvailableUsers();
    } catch (error: any) {
      message.error(error.message || "Failed to remove admin");
    } finally {
      setRemovingAdminId(null);
    }
  };

  const health = stats ? healthConfig[stats.health_status] : null;

  return (
    <Drawer
      title={null}
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
      styles={{
        body: { padding: 0 },
      }}
    >
      {company && (
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          {/* Header */}
          <div
            style={{
              padding: 20,
              borderBottom: "1px solid var(--color-border-light)",
              background: health ? health.bgColor : "var(--color-bg-surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              {company.logo_url || company.logo_thumbnail_url ? (
                <Avatar
                  size={48}
                  src={company.logo_thumbnail_url || company.logo_url}
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <Avatar
                  size={48}
                  style={{ background: "var(--color-text-heading)" }}
                  icon={<ShopOutlined />}
                />
              )}
              <div style={{ flex: 1 }}>
                <Title level={5} style={{ margin: 0 }}>
                  {company.name}
                </Title>
                {company.description && (
                  <Text type="secondary" style={{ fontSize: 'var(--fs-sm)' }}>
                    {company.description}
                  </Text>
                )}
              </div>
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
                        backgroundColor: "var(--color-bg-surface)",
                        border: `1px solid ${health.borderColor}`,
                        color: health.color,
                        fontSize: 'var(--fs-xs)',
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
          </div>

          {/* Quick Stats */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--color-border-light)" }}>
            <Text strong style={{ display: "block", marginBottom: 12 }}>
              📊 Quick Stats
            </Text>
            {statsLoading ? (
              <div style={{ textAlign: "center", padding: 16 }}>
                <Spin size="small" />
              </div>
            ) : stats ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: 8,
                    background: "var(--color-bg-inset)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, color: "var(--color-primary)" }}
                  >
                    {stats.open_tickets}
                  </div>
                  <Text type="secondary" style={{ fontSize: 'var(--fs-2xs)' }}>
                    Open
                  </Text>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: 8,
                    background:
                      stats.urgent_tickets > 0 ? "var(--color-tint-warning-bg)" : "var(--color-bg-inset)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--fs-xl)',
                      fontWeight: 600,
                      color: stats.urgent_tickets > 0 ? "var(--color-tint-warning-border)" : "var(--color-text-muted)",
                    }}
                  >
                    {stats.urgent_tickets}
                  </div>
                  <Text type="secondary" style={{ fontSize: 'var(--fs-2xs)' }}>
                    Urgent
                  </Text>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: 8,
                    background:
                      stats.overdue_tickets > 0 ? "var(--color-tint-danger-bg)" : "var(--color-bg-inset)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--fs-xl)',
                      fontWeight: 600,
                      color: stats.overdue_tickets > 0 ? "var(--color-tint-danger-border)" : "var(--color-text-muted)",
                    }}
                  >
                    {stats.overdue_tickets}
                  </div>
                  <Text type="secondary" style={{ fontSize: 'var(--fs-2xs)' }}>
                    Overdue
                  </Text>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: 8,
                    background: "var(--color-tint-success-bg)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, color: "var(--color-tint-success-border)" }}
                  >
                    {stats.resolved_this_month}
                  </div>
                  <Text type="secondary" style={{ fontSize: 'var(--fs-2xs)' }}>
                    Resolved
                  </Text>
                </div>
              </div>
            ) : null}
          </div>

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {/* Users Section */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text strong>
                  <UserOutlined style={{ marginRight: 8 }} />
                  Users ({company.users?.length ?? 0})
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setShowCreateUser(!showCreateUser)}
                >
                  Add
                </Button>
              </div>

              {/* Create User Form */}
              {showCreateUser && (
                <div
                  style={{
                    padding: 12,
                    background: "var(--color-bg-sidebar)",
                    borderRadius: 6,
                    marginBottom: 12,
                  }}
                >
                  <Form
                    form={createUserForm}
                    layout="vertical"
                    size="small"
                    onFinish={handleAddUser}
                  >
                    <Form.Item
                      name="email"
                      rules={[{ required: true, type: "email" }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="Email" />
                    </Form.Item>
                    <Form.Item
                      name="username"
                      rules={[{ required: true }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="Username" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, min: 8 }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input.Password placeholder="Password" />
                    </Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={creatingUser}
                        size="small"
                      >
                        Create User
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setShowCreateUser(false)}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </Form>
                </div>
              )}

              {/* Users List */}
              {!company.users?.length ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No users yet"
                  style={{ margin: "12px 0" }}
                />
              ) : (
                <List
                  size="small"
                  dataSource={company.users ?? []}
                  renderItem={(user) => (
                    <List.Item
                      style={{ padding: "8px 0" }}
                      actions={[
                        <Popconfirm
                          key="remove"
                          title="Remove user from company?"
                          onConfirm={() => handleRemoveUser(user.id)}
                          okText="Remove"
                          cancelText="Cancel"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={removingUserId === user.id}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar size="small" icon={<UserOutlined />} />}
                        title={
                          <Text style={{ fontSize: 'var(--fs-caption)' }}>
                            {user.first_name || user.last_name
                              ? `${user.first_name} ${user.last_name}`.trim()
                              : user.username}
                          </Text>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 'var(--fs-xs)' }}>
                            {user.email}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* Admins Section */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text strong>
                  <TeamOutlined style={{ marginRight: 8 }} />
                  IT Admins ({company.admins?.length ?? 0})
                </Text>
              </div>

              {/* Assign Admin */}
              <div style={{ marginBottom: 12 }}>
                <Space.Compact style={{ width: "100%" }}>
                  <Select
                    placeholder="Select user to assign as admin"
                    style={{ flex: 1 }}
                    value={selectedAdminId}
                    onChange={setSelectedAdminId}
                    loading={loadingUsers}
                    options={availableUsers.map((u) => ({
                      value: u.id,
                      label: `${u.first_name || u.username} ${
                        u.last_name || ""
                      }`.trim(),
                    }))}
                    size="small"
                    allowClear
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleAssignAdmin}
                    loading={assigningAdmin}
                    disabled={!selectedAdminId}
                  >
                    Assign
                  </Button>
                </Space.Compact>
              </div>

              {/* Admins List */}
              {!company.admins?.length ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No admins assigned"
                  style={{ margin: "12px 0" }}
                />
              ) : (
                <List
                  size="small"
                  dataSource={company.admins ?? []}
                  renderItem={(admin) => (
                    <List.Item
                      style={{ padding: "8px 0" }}
                      actions={[
                        <Popconfirm
                          key="remove"
                          title="Remove admin from company?"
                          onConfirm={() => handleRemoveAdmin(admin.id)}
                          okText="Remove"
                          cancelText="Cancel"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={removingAdminId === admin.id}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            size="small"
                            style={{ background: "var(--color-primary)" }}
                            icon={<UserOutlined />}
                          />
                        }
                        title={
                          <Text style={{ fontSize: 'var(--fs-caption)' }}>
                            {admin.first_name || admin.last_name
                              ? `${admin.first_name} ${admin.last_name}`.trim()
                              : admin.username}
                          </Text>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 'var(--fs-xs)' }}>
                            {admin.email}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: 16,
              borderTop: "1px solid var(--color-border-light)",
              background: "var(--color-bg-sidebar)",
            }}
          >
            <Button
              type="primary"
              block
              icon={<ArrowRightOutlined />}
              onClick={() => onOpenFullDetails(company)}
            >
              Open Full Details
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default CompanyDrawer;
