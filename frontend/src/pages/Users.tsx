import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Input,
  Modal,
  Form,
  Select,
  message,
  Dropdown,
  Avatar,
  Row,
  Col,
  Statistic,
  Switch,
  Tooltip,
  Badge,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  CrownOutlined,
  SafetyOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface UserRole {
  id: number;
  project: number;
  project_name: string;
  project_key: string;
  role: string;
  role_display: string;
  assigned_at: string;
}

interface Company {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  last_login_display: string;
  project_roles: UserRole[];
  administered_companies: Company[];
  member_companies: Company[];
  ticket_count: number;
}

interface Project {
  id: number;
  name: string;
  key: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.get<any>(API_ENDPOINTS.USERS);
      // API returns paginated response: {count, next, previous, results}
      const usersData = response.results || response;
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      message.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await apiService.get<any>(API_ENDPOINTS.PROJECTS);
      setProjects(response.results || response);
    } catch (error: any) {
      console.error("Failed to load projects:", error);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    Modal.confirm({
      title: `Delete ${user.full_name}?`,
      content:
        "This action cannot be undone. All user data will be permanently removed.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await apiService.delete(API_ENDPOINTS.USER_DETAIL(user.id));
          message.success("User deleted successfully");
          fetchUsers();
        } catch (error: any) {
          message.error(error.message || "Failed to delete user");
        }
      },
    });
  };

  const handleToggleActive = async (user: User) => {
    try {
      await apiService.post(API_ENDPOINTS.USER_TOGGLE_ACTIVE(user.id), {});
      message.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || "Failed to update user status");
    }
  };

  const handleModalOk = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      if (editingUser) {
        await apiService.patch(
          API_ENDPOINTS.USER_DETAIL(editingUser.id),
          values
        );
        message.success("User updated successfully");
      } else {
        await apiService.post(API_ENDPOINTS.USERS, values);
        message.success("User created successfully");
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    roleForm.resetFields();
    setIsRoleModalOpen(true);
  };

  const handleAssignRole = async () => {
    try {
      setSubmitting(true);
      const values = await roleForm.validateFields();

      if (!selectedUser) return;

      await apiService.post(
        API_ENDPOINTS.USER_ASSIGN_ROLE(selectedUser.id),
        values
      );
      message.success("Role assigned successfully");
      roleForm.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || "Failed to assign role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRole = async (userId: number, projectId: number) => {
    try {
      await apiService.post(API_ENDPOINTS.USER_REMOVE_ROLE(userId), {
        project_id: projectId,
      });
      message.success("Role removed successfully");
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || "Failed to remove role");
    }
  };

  const handleSetPassword = (user: User) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    setIsPasswordModalOpen(true);
  };

  const handlePasswordModalOk = async () => {
    try {
      setSubmitting(true);
      const values = await passwordForm.validateFields();

      if (!selectedUser) return;

      await apiService.post(
        API_ENDPOINTS.USER_SET_PASSWORD(selectedUser.id),
        values
      );
      message.success("Password updated successfully");
      setIsPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.message || "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "red";
      case "admin":
        return "blue";
      case "manager":
        return "purple";
      case "user":
        return "default";
      default:
        return "default";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superadmin":
        return <CrownOutlined />;
      case "admin":
        return <SafetyOutlined />;
      case "manager":
        return <EyeOutlined />;
      case "user":
        return <UserOutlined />;
      default:
        return <UserOutlined />;
    }
  };

  const getActionMenu = (user: User): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Edit User",
      onClick: () => handleEditUser(user),
    },
    {
      key: "roles",
      icon: <TeamOutlined />,
      label: "Manage Roles",
      onClick: () => handleManageRoles(user),
    },
    {
      key: "password",
      icon: <KeyOutlined />,
      label: "Set Password",
      onClick: () => handleSetPassword(user),
    },
    {
      type: "divider",
    },
    {
      key: "toggle-active",
      icon: user.is_active ? <CloseCircleOutlined /> : <CheckCircleOutlined />,
      label: user.is_active ? "Deactivate" : "Activate",
      onClick: () => handleToggleActive(user),
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete User",
      danger: true,
      onClick: () => handleDeleteUser(user),
    },
  ];

  const columns: ColumnsType<User> = [
    {
      title: "User",
      dataIndex: "username",
      key: "username",
      render: (_, record) => (
        <Space>
          <Avatar
            style={{
              background: record.is_superuser
                ? "#f5222d"
                : record.is_staff
                ? "#1890ff"
                : "#52c41a",
            }}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.full_name}
              {record.is_superuser && (
                <Tag color="red" style={{ marginLeft: 8 }}>
                  Superuser
                </Tag>
              )}
              {record.is_staff && !record.is_superuser && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  Staff
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              @{record.username} • {record.email}
            </Text>
          </div>
        </Space>
      ),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => {
        const searchValue = (value as string).toLowerCase();
        return (
          record.username.toLowerCase().includes(searchValue) ||
          record.email.toLowerCase().includes(searchValue) ||
          record.full_name.toLowerCase().includes(searchValue)
        );
      },
    },
    {
      title: "Project Roles",
      dataIndex: "project_roles",
      key: "project_roles",
      render: (roles: UserRole[]) => (
        <Space size={[0, 8]} wrap>
          {roles.length > 0 ? (
            roles.map((role) => (
              <Tag
                key={role.id}
                color={getRoleColor(role.role)}
                icon={getRoleIcon(role.role)}
              >
                {role.project_key}: {role.role_display}
              </Tag>
            ))
          ) : (
            <Text type="secondary">No roles</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Companies",
      key: "companies",
      render: (_, record) => {
        const totalCompanies =
          record.administered_companies.length + record.member_companies.length;
        return (
          <Tooltip
            title={
              <div>
                {record.administered_companies.length > 0 && (
                  <>
                    <div>
                      <strong>Admin:</strong>
                    </div>
                    {record.administered_companies.map((c) => (
                      <div key={c.id}>• {c.name}</div>
                    ))}
                  </>
                )}
                {record.member_companies.length > 0 && (
                  <>
                    <div>
                      <strong>Member:</strong>
                    </div>
                    {record.member_companies.map((c) => (
                      <div key={c.id}>• {c.name}</div>
                    ))}
                  </>
                )}
              </div>
            }
          >
            <Badge count={totalCompanies} showZero>
              <TeamOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            </Badge>
          </Tooltip>
        );
      },
    },
    {
      title: "Tickets",
      dataIndex: "ticket_count",
      key: "ticket_count",
      width: 100,
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? "success" : "default"}>
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Last Login",
      dataIndex: "last_login_display",
      key: "last_login",
      width: 120,
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenu(record) }} trigger={["click"]}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            User Management
          </Title>
          <Text type="secondary">Manage users, roles, and permissions</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateUser}
        >
          Create User
        </Button>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Users"
              value={users.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Active Users"
              value={users.filter((u) => u.is_active).length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Staff Members"
              value={users.filter((u) => u.is_staff).length}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Superusers"
              value={users.filter((u) => u.is_superuser).length}
              prefix={<CrownOutlined />}
              valueStyle={{ color: "#f5222d" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <Card style={{ marginBottom: 16 }}>
        <Search
          placeholder="Search users by name, username, or email..."
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 600 }}
        />
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} users`,
          }}
        />
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        title={editingUser ? "Edit User" : "Create User"}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText={editingUser ? "Update" : "Create"}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Please enter username" }]}
              >
                <Input placeholder="johndoe" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Please enter valid email" },
                ]}
              >
                <Input placeholder="john@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name">
                <Input placeholder="John" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input placeholder="Doe" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please enter password" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="is_staff"
            label="Staff Member"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="is_superuser"
            label="Superuser"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Manage Roles Modal */}
      <Modal
        title={`Manage Roles - ${selectedUser?.full_name}`}
        open={isRoleModalOpen}
        onCancel={() => setIsRoleModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form
          form={roleForm}
          layout="inline"
          onFinish={handleAssignRole}
          style={{ marginBottom: 24 }}
        >
          <Form.Item
            name="project_id"
            rules={[{ required: true, message: "Select project" }]}
            style={{ width: 250 }}
          >
            <Select placeholder="Select Project">
              {projects.map((project) => (
                <Option key={project.id} value={project.id}>
                  {project.key}: {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="role"
            rules={[{ required: true, message: "Select role" }]}
            style={{ width: 150 }}
          >
            <Select placeholder="Select Role">
              <Option value="superadmin">Superadmin</Option>
              <Option value="admin">Admin</Option>
              <Option value="manager">Manager</Option>
              <Option value="user">User</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<PlusOutlined />}
            >
              Assign
            </Button>
          </Form.Item>
        </Form>

        <Table
          size="small"
          dataSource={selectedUser?.project_roles || []}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: "Project",
              dataIndex: "project_name",
              key: "project",
              render: (_, record) =>
                `${record.project_key}: ${record.project_name}`,
            },
            {
              title: "Role",
              dataIndex: "role_display",
              key: "role",
              render: (_, record) => (
                <Tag
                  color={getRoleColor(record.role)}
                  icon={getRoleIcon(record.role)}
                >
                  {record.role_display}
                </Tag>
              ),
            },
            {
              title: "Actions",
              key: "actions",
              render: (_, record) => (
                <Button
                  danger
                  size="small"
                  onClick={() =>
                    selectedUser &&
                    handleRemoveRole(selectedUser.id, record.project)
                  }
                >
                  Remove
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      {/* Set Password Modal */}
      <Modal
        title={`Set Password - ${selectedUser?.full_name}`}
        open={isPasswordModalOpen}
        onOk={handlePasswordModalOk}
        onCancel={() => {
          setIsPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        confirmLoading={submitting}
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="password"
            label="New Password"
            rules={[
              { required: true, message: "Please enter password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
