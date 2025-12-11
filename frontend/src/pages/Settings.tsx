import React, { useState, useEffect } from "react";
import {
  Typography,
  Radio,
  Select,
  Switch,
  Divider,
  Button,
  message,
  Tabs,
  Alert,
  Layout,
  Modal,
  Input,
  Form,
  Table,
  Tag,
  Popconfirm,
  Space,
  Tooltip,
  Empty,
  Spin,
} from "antd";
import {
  BgColorsOutlined,
  BellOutlined,
  GlobalOutlined,
  SafetyOutlined,
  UserOutlined,
  SettingOutlined,
  InboxOutlined,
  ProjectOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";
import { projectService } from "../services/project.service";
import { useApp } from "../contexts/AppContext";
import type { Project, UpdateProjectData, CreateProjectData, User } from "../types/api";

const { Title, Text } = Typography;

// --- Design System Constants ---
const COLORS = {
  primary: "#2C3E50",
  secondary: "#34495E",
  accent: "#E67E22",
  background: "#F5F7FA", // Slightly cooler gray
  surface: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
};

// --- Reusable Components ---

interface SettingSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  description,
  children,
}) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ marginBottom: 16 }}>
      <Title level={4} style={{ margin: 0, color: COLORS.primary, fontSize: 18 }}>
        {title}
      </Title>
      {description && (
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
          {description}
        </Text>
      )}
    </div>
    <div
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        padding: "0 24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {children}
    </div>
  </div>
);

interface SettingRowProps {
  label: string;
  description?: string;
  control: React.ReactNode;
  last?: boolean;
  danger?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  control,
  last,
  danger,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "20px 0",
      borderBottom: last ? "none" : `1px solid ${COLORS.border}`,
    }}
  >
    <div style={{ maxWidth: "60%" }}>
      <Text
        strong
        style={{
          fontSize: 15,
          display: "block",
          color: danger ? "#E74C3C" : COLORS.text,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      {description && (
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.4 }}>
          {description}
        </Text>
      )}
    </div>
    <div>{control}</div>
  </div>
);

// --- Project Edit Modal ---
interface ProjectModalProps {
  visible: boolean;
  project: Project | null;
  users: User[];
  onCancel: () => void;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
  isNew?: boolean;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  visible,
  project,
  users,
  onCancel,
  onSave,
  loading,
  isNew = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (project && !isNew) {
        form.setFieldsValue({
          name: project.name,
          key: project.key,
          description: project.description || "",
          lead_username: project.lead_username,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, project, form, isNew]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      form.resetFields();
    } catch (error) {
      // Validation error, form will show the error
    }
  };

  return (
    <Modal
      title={isNew ? "Create New Project" : "Edit Project"}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={isNew ? "Create" : "Save Changes"}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Form.Item
          name="name"
          label="Project Name"
          rules={[{ required: true, message: "Please enter a project name" }]}
        >
          <Input placeholder="My Project" />
        </Form.Item>

        <Form.Item
          name="key"
          label="Project Key"
          rules={[
            { required: true, message: "Please enter a project key" },
            { pattern: /^[A-Z0-9]+$/, message: "Key must be uppercase letters and numbers only" },
            { max: 10, message: "Key must be 10 characters or less" },
          ]}
          extra="A short identifier used in ticket numbers (e.g., PROJ)"
        >
          <Input 
            placeholder="PROJ" 
            style={{ textTransform: "uppercase" }}
            disabled={!isNew} // Can't change key after creation
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea rows={3} placeholder="Optional project description..." />
        </Form.Item>

        <Form.Item
          name="lead_username"
          label="Project Lead"
        >
          <Select
            placeholder="Select project lead"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={users.map(u => ({
              value: u.username,
              label: `${u.first_name} ${u.last_name} (${u.username})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const Settings: React.FC = () => {
  const { refreshProjects } = useApp();
  
  // State
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [language, setLanguage] = useState("en");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    updates: false,
  });
  const [archiving, setArchiving] = useState(false);
  const [lastArchiveResult, setLastArchiveResult] = useState<{
    count: number;
    timestamp: Date;
  } | null>(null);

  // Project Management State
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Load projects and users
  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (error) {
      message.error("Failed to load projects");
      console.error(error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.get<{ results: User[] }>(API_ENDPOINTS.USERS);
      setUsers(response.results || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setEditModalVisible(true);
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setCreateModalVisible(true);
  };

  const handleSaveProject = async (values: UpdateProjectData) => {
    if (!selectedProject) return;
    setModalLoading(true);
    try {
      await projectService.updateProject(selectedProject.id, values);
      message.success("Project updated successfully");
      setEditModalVisible(false);
      loadProjects();
      refreshProjects();
    } catch (error: any) {
      message.error(error.response?.data?.detail || "Failed to update project");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateProjectSave = async (values: CreateProjectData) => {
    setModalLoading(true);
    try {
      await projectService.createProject(values);
      message.success("Project created successfully");
      setCreateModalVisible(false);
      loadProjects();
      refreshProjects();
    } catch (error: any) {
      message.error(error.response?.data?.detail || "Failed to create project");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    try {
      await projectService.deleteProject(project.id);
      message.success("Project deleted successfully");
      loadProjects();
      refreshProjects();
    } catch (error: any) {
      message.error(error.response?.data?.detail || "Failed to delete project");
    }
  };

  // Handlers
  const handleTriggerArchive = async () => {
    setArchiving(true);
    try {
      const data = await apiService.post<{ archived_count: number; message: string }>(
        API_ENDPOINTS.TICKET_TRIGGER_ARCHIVE,
        {}
      );
      setLastArchiveResult({
        count: data.archived_count,
        timestamp: new Date(),
      });
      if (data.archived_count > 0) {
        message.success(`Successfully archived ${data.archived_count} ticket(s)`);
      } else {
        message.info("No tickets were eligible for archiving");
      }
    } catch (error) {
      message.error("Failed to trigger archive process");
      console.error("Archive error:", error);
    } finally {
      setArchiving(false);
    }
  };

  const handleSave = () => {
    message.success("Settings saved successfully!");
  };

  const handleReset = () => {
    setTheme("light");
    setFontSize("medium");
    setLanguage("en");
    setNotifications({
      email: true,
      push: true,
      updates: false,
    });
    message.info("Settings reset to defaults");
  };

  // Tab Content Definitions
  const projectColumns = [
    {
      title: "Project",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Project) => (
        <div>
          <Text strong style={{ display: "block" }}>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.description || "No description"}</Text>
        </div>
      ),
    },
    {
      title: "Key",
      dataIndex: "key",
      key: "key",
      width: 100,
      render: (key: string) => (
        <Tag color="blue" style={{ fontFamily: "monospace" }}>{key}</Tag>
      ),
    },
    {
      title: "Lead",
      dataIndex: "lead_username",
      key: "lead_username",
      width: 150,
      render: (lead: string) => lead ? (
        <Space size={4}>
          <UserOutlined style={{ color: COLORS.textSecondary }} />
          <Text>{lead}</Text>
        </Space>
      ) : (
        <Text type="secondary">—</Text>
      ),
    },
    {
      title: "Stats",
      key: "stats",
      width: 150,
      render: (_: any, record: Project) => (
        <Space size={16}>
          <Tooltip title="Tickets">
            <Text type="secondary">{record.tickets_count || 0} tickets</Text>
          </Tooltip>
          <Tooltip title="Members">
            <Space size={4}>
              <TeamOutlined style={{ color: COLORS.textSecondary }} />
              <Text type="secondary">{record.members?.length || 0}</Text>
            </Space>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_: any, record: Project) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditProject(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this project?"
            description={`This will permanently delete "${record.name}" and all its tickets.`}
            onConfirm={() => handleDeleteProject(record)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            placement="left"
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const items = [
    {
      key: "projects",
      label: "Projects",
      icon: <ProjectOutlined />,
      children: (
        <SettingSection title="Project Management" description="Create, edit, and manage your projects.">
          <div style={{ padding: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text type="secondary">
                {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
              </Text>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateProject}
                style={{ backgroundColor: COLORS.primary }}
              >
                New Project
              </Button>
            </div>

            {projectsLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : projects.length === 0 ? (
              <Empty
                description="No projects yet"
                style={{ padding: 40 }}
              >
                <Button type="primary" onClick={handleCreateProject}>
                  Create your first project
                </Button>
              </Empty>
            ) : (
              <Table
                dataSource={projects}
                columns={projectColumns}
                rowKey="id"
                pagination={projects.length > 10 ? { pageSize: 10 } : false}
                size="middle"
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        </SettingSection>
      ),
    },
    {
      key: "appearance",
      label: "Appearance",
      icon: <BgColorsOutlined />,
      children: (
        <>
          <SettingSection title="Interface Theme" description="Customize how the application looks.">
            <SettingRow
              label="Color Theme"
              description="Select your preferred color scheme for the interface."
              control={
                <Radio.Group
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="light">Light</Radio.Button>
                  <Radio.Button value="dark">Dark</Radio.Button>
                  <Radio.Button value="auto">Auto</Radio.Button>
                </Radio.Group>
              }
            />
            <SettingRow
              label="Font Size"
              description="Adjust the text size for better readability."
              control={
                <Select
                  value={fontSize}
                  onChange={setFontSize}
                  style={{ width: 120 }}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ]}
                />
              }
            />
            <SettingRow
              label="Compact Mode"
              description="Reduce spacing for a denser layout, allowing more information on screen."
              control={<Switch />}
              last
            />
          </SettingSection>

          <SettingSection title="Layout">
            <SettingRow
              label="Sidebar Position"
              description="Choose where the main navigation sidebar appears."
              control={
                <Select
                  defaultValue="left"
                  style={{ width: 120 }}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ]}
                />
              }
              last
            />
          </SettingSection>
        </>
      ),
    },
    {
      key: "language",
      label: "Language & Region",
      icon: <GlobalOutlined />,
      children: (
        <SettingSection title="Localization">
          <SettingRow
            label="Display Language"
            description="Select the language for the user interface."
            control={
              <Select
                value={language}
                onChange={setLanguage}
                style={{ width: 200 }}
                options={[
                  { value: "en", label: "🇺🇸 English" },
                  { value: "es", label: "🇪🇸 Español" },
                  { value: "fr", label: "🇫🇷 Français" },
                  { value: "de", label: "🇩🇪 Deutsch" },
                  { value: "zh", label: "🇨🇳 中文" },
                  { value: "ja", label: "🇯🇵 日本語" },
                ]}
              />
            }
          />
          <SettingRow
            label="Time Zone"
            description="Set your local time zone for accurate timestamps."
            control={
              <Select
                defaultValue="utc"
                style={{ width: 280 }}
                options={[
                  { value: "utc", label: "(UTC+00:00) UTC" },
                  { value: "est", label: "(UTC-05:00) Eastern Time" },
                  { value: "pst", label: "(UTC-08:00) Pacific Time" },
                  { value: "cet", label: "(UTC+01:00) Central European Time" },
                  { value: "jst", label: "(UTC+09:00) Japan Standard Time" },
                ]}
              />
            }
          />
          <SettingRow
            label="Date Format"
            description="Choose how dates are displayed throughout the app."
            control={
              <Select
                defaultValue="mdy"
                style={{ width: 200 }}
                options={[
                  { value: "mdy", label: "MM/DD/YYYY" },
                  { value: "dmy", label: "DD/MM/YYYY" },
                  { value: "ymd", label: "YYYY-MM-DD" },
                ]}
              />
            }
            last
          />
        </SettingSection>
      ),
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: <BellOutlined />,
      children: (
        <SettingSection title="Alert Preferences">
          <SettingRow
            label="Email Notifications"
            description="Receive updates and digests via email."
            control={
              <Switch
                checked={notifications.email}
                onChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
              />
            }
          />
          <SettingRow
            label="Push Notifications"
            description="Get real-time alerts in your browser."
            control={
              <Switch
                checked={notifications.push}
                onChange={(checked) =>
                  setNotifications({ ...notifications, push: checked })
                }
              />
            }
          />
          <SettingRow
            label="Product Updates"
            description="Stay informed about new features and improvements."
            control={
              <Switch
                checked={notifications.updates}
                onChange={(checked) =>
                  setNotifications({ ...notifications, updates: checked })
                }
              />
            }
          />
          <SettingRow
            label="Notification Sound"
            description="Play a sound when a new notification arrives."
            control={
              <Select
                defaultValue="default"
                style={{ width: 150 }}
                options={[
                  { value: "default", label: "Default" },
                  { value: "chime", label: "Chime" },
                  { value: "bell", label: "Bell" },
                  { value: "none", label: "None" },
                ]}
              />
            }
            last
          />
        </SettingSection>
      ),
    },
    {
      key: "account",
      label: "Account",
      icon: <UserOutlined />,
      children: (
        <SettingSection title="Profile Settings">
          <SettingRow
            label="Profile Visibility"
            description="Control who can see your profile information."
            control={
              <Select
                defaultValue="everyone"
                style={{ width: 180 }}
                options={[
                  { value: "everyone", label: "Everyone" },
                  { value: "team", label: "Team Only" },
                  { value: "private", label: "Private" },
                ]}
              />
            }
          />
          <SettingRow
            label="Online Status"
            description="Show others when you are active."
            control={<Switch defaultChecked />}
          />
          <SettingRow
            label="Session Timeout"
            description="Automatically log out after a period of inactivity."
            control={
              <Select
                defaultValue="30"
                style={{ width: 150 }}
                options={[
                  { value: "15", label: "15 minutes" },
                  { value: "30", label: "30 minutes" },
                  { value: "60", label: "1 hour" },
                  { value: "never", label: "Never" },
                ]}
              />
            }
            last
          />
        </SettingSection>
      ),
    },
    {
      key: "privacy",
      label: "Privacy & Security",
      icon: <SafetyOutlined />,
      children: (
        <>
          <SettingSection title="Security">
            <SettingRow
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account."
              control={<Switch defaultChecked={false} />}
            />
            <SettingRow
              label="Login Alerts"
              description="Get notified of new login attempts from unrecognized devices."
              control={<Switch defaultChecked />}
            />
            <SettingRow
              label="Password"
              description="Update your password regularly to keep your account safe."
              control={<Button>Change Password</Button>}
              last
            />
          </SettingSection>

          <SettingSection title="Danger Zone">
            <SettingRow
              label="Clear All Data"
              description="Permanently remove all your data from this device."
              danger
              control={<Button danger>Clear Data</Button>}
            />
            <SettingRow
              label="Delete Account"
              description="Permanently delete your account and all associated data."
              danger
              control={<Button danger type="primary">Delete Account</Button>}
              last
            />
          </SettingSection>
        </>
      ),
    },
    {
      key: "system",
      label: "System",
      icon: <SettingOutlined />,
      children: (
        <SettingSection title="Maintenance">
          <div style={{ padding: "20px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
              <div
                style={{
                  backgroundColor: "#E8F5E9",
                  padding: 12,
                  borderRadius: "50%",
                  color: "#2E7D32",
                }}
              >
                <InboxOutlined style={{ fontSize: 24 }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 16, display: "block", marginBottom: 4 }}>
                  Ticket Archiving
                </Text>
                <Text type="secondary" style={{ display: "block", marginBottom: 12, maxWidth: 600 }}>
                  Tickets in the "Done" column for more than 24 hours are automatically archived to maintain system performance.
                  You can manually trigger this process if needed.
                </Text>
                
                {lastArchiveResult && (
                  <Alert
                    type={lastArchiveResult.count > 0 ? "success" : "info"}
                    message={
                      lastArchiveResult.count > 0
                        ? `${lastArchiveResult.count} ticket(s) were archived`
                        : "No tickets needed archiving"
                    }
                    description={`Last run: ${lastArchiveResult.timestamp.toLocaleString()}`}
                    style={{ marginBottom: 16, maxWidth: 500 }}
                    showIcon
                  />
                )}

                <Button
                  type="primary"
                  onClick={handleTriggerArchive}
                  loading={archiving}
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {archiving ? "Archiving..." : "Run Archive Now"}
                </Button>
              </div>
            </div>
          </div>
          
          <Divider />
          
          <div style={{ padding: "20px 0" }}>
             <Text strong style={{ fontSize: 15, display: "block", marginBottom: 8 }}>
              Background Tasks
            </Text>
            <ul style={{ margin: 0, paddingLeft: 20, color: COLORS.textSecondary }}>
              <li style={{ marginBottom: 4 }}>Auto-archive completed tickets (runs hourly)</li>
              <li>Clean up expired sessions (runs daily)</li>
            </ul>
          </div>
        </SettingSection>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: COLORS.background }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Title level={2} style={{ marginBottom: 8, color: COLORS.primary }}>
            Settings
          </Title>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary }}>
            Manage your workspace preferences and account details.
          </Text>
        </div>

        <div style={{ backgroundColor: "transparent" }}>
          <Tabs
            tabPosition="left"
            items={items.map(item => ({
              key: item.key,
              label: (
                <span style={{ fontSize: 15, padding: "4px 0" }}>
                  {item.icon}
                  <span style={{ marginLeft: 10 }}>{item.label}</span>
                </span>
              ),
              children: (
                <div style={{ paddingLeft: 24, maxWidth: 800 }}>
                  {item.children}
                </div>
              )
            }))}
            style={{ 
              backgroundColor: "transparent",
            }}
            tabBarStyle={{
              width: 260,
              backgroundColor: "transparent",
            }}
            renderTabBar={(props, DefaultTabBar) => (
              <div style={{ marginRight: 32 }}>
                <DefaultTabBar {...props} />
                <div style={{ marginTop: 40, padding: "0 16px" }}>
                  <Button block onClick={handleReset} style={{ marginBottom: 12 }}>
                    Reset Defaults
                  </Button>
                  <Button block type="primary" onClick={handleSave} style={{ backgroundColor: COLORS.primary }}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {/* Project Edit Modal */}
      <ProjectModal
        visible={editModalVisible}
        project={selectedProject}
        users={users}
        onCancel={() => setEditModalVisible(false)}
        onSave={handleSaveProject}
        loading={modalLoading}
      />

      {/* Project Create Modal */}
      <ProjectModal
        visible={createModalVisible}
        project={null}
        users={users}
        onCancel={() => setCreateModalVisible(false)}
        onSave={handleCreateProjectSave}
        loading={modalLoading}
        isNew
      />
    </Layout>
  );
};

export default Settings;
