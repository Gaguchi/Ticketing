import React, { useState, useEffect } from "react";
import {
  Typography,
  Select,
  Switch,
  Button,
  message,
  Alert,
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
  ClockCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";
import { projectService } from "../services/project.service";
import { useApp } from "../contexts/AppContext";
import { useThemeVersion, type FontSize, type ThemePreference, type DarkVariant } from "../contexts/ThemeContext";
import type {
  Project,
  UpdateProjectData,
  CreateProjectData,
  User,
} from "../types/api";
import "./Settings.css";

const { Text } = Typography;

// ── Navigation items ──

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "projects",
    label: "Projects",
    icon: <ProjectOutlined />,
    description: "Create, edit, and manage your workspace projects.",
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: <BgColorsOutlined />,
    description: "Customize the look and feel of the interface.",
  },
  {
    key: "language",
    label: "Language & Region",
    icon: <GlobalOutlined />,
    description: "Set your preferred language, timezone, and date format.",
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: <BellOutlined />,
    description: "Control how and when you receive alerts.",
  },
  {
    key: "account",
    label: "Account",
    icon: <UserOutlined />,
    description: "Manage your profile visibility and session preferences.",
  },
  {
    key: "privacy",
    label: "Privacy & Security",
    icon: <SafetyOutlined />,
    description: "Protect your account with security settings.",
  },
  {
    key: "system",
    label: "System",
    icon: <SettingOutlined />,
    description: "Maintenance tools and background task management.",
  },
];

const DIVIDER_AFTER = ["projects", "notifications"]; // visual grouping

// ── Reusable pieces ──

interface SettingCardProps {
  title: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
  noPadding?: boolean;
}

const SettingCard: React.FC<SettingCardProps> = ({
  title,
  description,
  danger,
  children,
  noPadding,
}) => (
  <div className={`setting-card${danger ? " setting-card--danger" : ""}`}>
    <div className="setting-card__header">
      <p className="setting-card__title">{title}</p>
      {description && (
        <p className="setting-card__description">{description}</p>
      )}
    </div>
    {noPadding ? children : <div className="setting-card__body">{children}</div>}
  </div>
);

interface SettingRowProps {
  label: string;
  description?: string;
  control: React.ReactNode;
  danger?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  control,
  danger,
}) => (
  <div className="setting-row">
    <div className="setting-row__info">
      <p
        className={`setting-row__label${danger ? " setting-row__label--danger" : ""}`}
      >
        {label}
      </p>
      {description && (
        <p className="setting-row__description">{description}</p>
      )}
    </div>
    <div className="setting-row__control">{control}</div>
  </div>
);

// ── Project Modal ──

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
    } catch {
      // validation error — form shows the message
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
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
            {
              pattern: /^[A-Z0-9]+$/,
              message: "Key must be uppercase letters and numbers only",
            },
            { max: 10, message: "Key must be 10 characters or less" },
          ]}
          extra="A short identifier used in ticket numbers (e.g., PROJ)"
        >
          <Input
            placeholder="PROJ"
            style={{ textTransform: "uppercase" }}
            disabled={!isNew}
          />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea
            rows={3}
            placeholder="Optional project description..."
          />
        </Form.Item>
        <Form.Item name="lead_username" label="Project Lead">
          <Select
            placeholder="Select project lead"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={users.map((u) => ({
              value: u.username,
              label: `${u.first_name} ${u.last_name} (${u.username})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Main Component ──

const Settings: React.FC = () => {
  const { refreshProjects } = useApp();
  const { i18n } = useTranslation();
  const {
    themePreference,
    setThemePreference,
    resolvedMode,
    darkVariant,
    setDarkVariant,
    fontSize,
    setFontSize,
    compactMode,
    setCompactMode,
  } = useThemeVersion();

  // Navigation
  const [activeTab, setActiveTab] = useState("projects");

  // Settings state
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

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  // ── Data loaders ──

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch {
      message.error("Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.get<{ results: User[] }>(
        API_ENDPOINTS.USERS
      );
      setUsers(response.results || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  // ── Project handlers ──

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
      message.error(
        error.response?.data?.detail || "Failed to update project"
      );
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
      message.error(
        error.response?.data?.detail || "Failed to create project"
      );
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
      message.error(
        error.response?.data?.detail || "Failed to delete project"
      );
    }
  };

  // ── Archive handler ──

  const handleTriggerArchive = async () => {
    setArchiving(true);
    try {
      const data = await apiService.post<{
        archived_count: number;
        message: string;
      }>(API_ENDPOINTS.TICKET_TRIGGER_ARCHIVE, {});
      setLastArchiveResult({
        count: data.archived_count,
        timestamp: new Date(),
      });
      if (data.archived_count > 0) {
        message.success(
          `Successfully archived ${data.archived_count} ticket(s)`
        );
      } else {
        message.info("No tickets were eligible for archiving");
      }
    } catch {
      message.error("Failed to trigger archive process");
    } finally {
      setArchiving(false);
    }
  };

  // ── Project columns ──

  const projectColumns = [
    {
      title: "Project",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Project) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || "No description"}
          </Text>
        </div>
      ),
    },
    {
      title: "Key",
      dataIndex: "key",
      key: "key",
      width: 100,
      render: (key: string) => (
        <Tag color="blue" style={{ fontFamily: "monospace" }}>
          {key}
        </Tag>
      ),
    },
    {
      title: "Lead",
      dataIndex: "lead_username",
      key: "lead_username",
      width: 150,
      render: (lead: string) =>
        lead ? (
          <Space size={4}>
            <UserOutlined style={{ color: "var(--color-text-muted)" }} />
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
              <TeamOutlined style={{ color: "var(--color-text-muted)" }} />
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

  // ── Tab content renderers ──

  const activeNav = NAV_ITEMS.find((n) => n.key === activeTab)!;

  const renderContent = () => {
    switch (activeTab) {
      case "projects":
        return (
          <SettingCard title="Workspace Projects" noPadding>
            <div className="projects-toolbar">
              <span className="projects-toolbar__count">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateProject}
              >
                New Project
              </Button>
            </div>
            <div className="projects-table-wrap">
              {projectsLoading ? (
                <div style={{ textAlign: "center", padding: 48 }}>
                  <Spin size="large" />
                </div>
              ) : projects.length === 0 ? (
                <Empty
                  description="No projects yet"
                  style={{ padding: 48 }}
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
                  pagination={
                    projects.length > 10 ? { pageSize: 10 } : false
                  }
                  size="middle"
                />
              )}
            </div>
          </SettingCard>
        );

      case "appearance":
        return (
          <>
            <SettingCard title="Theme">
              <SettingRow
                label="Color Theme"
                description="Choose between light and dark mode, or follow your system preference."
                control={
                  <div className="theme-picker">
                    {(
                      [
                        { value: "light" as ThemePreference, label: "Light" },
                        { value: "dark" as ThemePreference, label: "Dark" },
                        { value: "auto" as ThemePreference, label: "System" },
                      ]
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`theme-option${themePreference === opt.value ? " theme-option--active" : ""}`}
                        onClick={() => setThemePreference(opt.value)}
                      >
                        <div
                          className={`theme-option__preview theme-option__preview--${opt.value}`}
                        />
                        <span className="theme-option__label">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                }
              />
              {resolvedMode === 'dark' && (
                <SettingRow
                  label="Dark Theme Variant"
                  description="Choose the style of dark mode that suits your preference."
                  control={
                    <div className="variant-picker">
                      {(
                        [
                          { value: 'midnight' as DarkVariant, label: 'Midnight', desc: 'GitHub Dark' },
                          { value: 'slate' as DarkVariant, label: 'Slate', desc: 'Linear' },
                          { value: 'warm' as DarkVariant, label: 'Warm', desc: 'Discord' },
                        ]
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`variant-option${darkVariant === opt.value ? ' variant-option--active' : ''}`}
                          onClick={() => setDarkVariant(opt.value)}
                        >
                          <div className={`variant-option__swatch variant-option__swatch--${opt.value}`} />
                          <span className="variant-option__label">{opt.label}</span>
                          <span className="variant-option__desc">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  }
                />
              )}
              <SettingRow
                label="Font Size"
                description="Adjust text size across the application."
                control={
                  <Select
                    value={fontSize}
                    onChange={(value: FontSize) => setFontSize(value)}
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
                description="Reduce spacing for a denser information layout."
                control={
                  <Switch
                    checked={compactMode}
                    onChange={setCompactMode}
                  />
                }
              />
            </SettingCard>
          </>
        );

      case "language":
        return (
          <SettingCard title="Localization">
            <SettingRow
              label="Display Language"
              description="The language used across the interface. Changes apply immediately."
              control={
                <Select
                  value={i18n.language}
                  onChange={(value: string) => i18n.changeLanguage(value)}
                  style={{ width: 200 }}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ka", label: "\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8 (Georgian)" },
                  ]}
                />
              }
            />
            <SettingRow
              label="Time Zone"
              description="Used for timestamps and scheduling."
              control={
                <Select
                  defaultValue="utc"
                  style={{ width: 280 }}
                  options={[
                    { value: "utc", label: "(UTC+00:00) UTC" },
                    { value: "est", label: "(UTC-05:00) Eastern Time" },
                    { value: "pst", label: "(UTC-08:00) Pacific Time" },
                    {
                      value: "cet",
                      label: "(UTC+01:00) Central European Time",
                    },
                    {
                      value: "get",
                      label: "(UTC+04:00) Georgia Standard Time",
                    },
                    {
                      value: "jst",
                      label: "(UTC+09:00) Japan Standard Time",
                    },
                  ]}
                />
              }
            />
            <SettingRow
              label="Date Format"
              description="How dates appear throughout the app."
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
            />
          </SettingCard>
        );

      case "notifications":
        return (
          <SettingCard title="Alert Preferences">
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
              description="Real-time browser alerts for new activity."
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
              description="Stay informed about new features."
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
              description="Play a sound when a notification arrives."
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
            />
          </SettingCard>
        );

      case "account":
        return (
          <SettingCard title="Profile">
            <SettingRow
              label="Profile Visibility"
              description="Control who can see your profile."
              control={
                <Select
                  defaultValue="everyone"
                  style={{ width: 160 }}
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
              description="Auto log-out after inactivity."
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
            />
          </SettingCard>
        );

      case "privacy":
        return (
          <>
            <SettingCard title="Security">
              <SettingRow
                label="Two-Factor Authentication"
                description="Add an extra layer of security to your account."
                control={<Switch defaultChecked={false} />}
              />
              <SettingRow
                label="Login Alerts"
                description="Get notified of logins from new devices."
                control={<Switch defaultChecked />}
              />
              <SettingRow
                label="Password"
                description="Update your password regularly."
                control={<Button>Change Password</Button>}
              />
            </SettingCard>

            <SettingCard title="Danger Zone" danger>
              <SettingRow
                label="Clear All Data"
                description="Permanently remove all your local data."
                danger
                control={<Button danger>Clear Data</Button>}
              />
              <SettingRow
                label="Delete Account"
                description="Permanently delete your account and all associated data. This cannot be undone."
                danger
                control={
                  <Button danger type="primary">
                    Delete Account
                  </Button>
                }
              />
            </SettingCard>
          </>
        );

      case "system":
        return (
          <SettingCard title="Maintenance" noPadding>
            <div className="system-feature">
              <div className="system-feature__icon system-feature__icon--archive">
                <InboxOutlined />
              </div>
              <div className="system-feature__body">
                <p className="system-feature__title">Ticket Archiving</p>
                <p className="system-feature__text">
                  Tickets in the "Done" column for more than 24 hours are
                  automatically archived. You can trigger this manually if
                  needed.
                </p>

                {lastArchiveResult && (
                  <Alert
                    className="archive-result"
                    type={lastArchiveResult.count > 0 ? "success" : "info"}
                    message={
                      lastArchiveResult.count > 0
                        ? `${lastArchiveResult.count} ticket(s) archived`
                        : "No tickets needed archiving"
                    }
                    description={`Last run: ${lastArchiveResult.timestamp.toLocaleString()}`}
                    showIcon
                    style={{ maxWidth: 460 }}
                  />
                )}

                <Button
                  type="primary"
                  onClick={handleTriggerArchive}
                  loading={archiving}
                  icon={<ThunderboltOutlined />}
                >
                  {archiving ? "Archiving..." : "Run Archive Now"}
                </Button>
              </div>
            </div>

            <div className="system-feature">
              <div className="system-feature__icon system-feature__icon--tasks">
                <ClockCircleOutlined />
              </div>
              <div className="system-feature__body">
                <p className="system-feature__title">Background Tasks</p>
                <p className="system-feature__text">
                  Automated tasks that run on a schedule to keep the system
                  healthy.
                </p>
                <ul className="system-tasks-list">
                  <li>Auto-archive completed tickets (runs hourly)</li>
                  <li>Clean up expired sessions (runs daily)</li>
                </ul>
              </div>
            </div>
          </SettingCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      {/* ── Sidebar ── */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar__title">Settings</div>
        <nav className="settings-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <React.Fragment key={item.key}>
              <button
                type="button"
                className={`settings-sidebar__item${activeTab === item.key ? " settings-sidebar__item--active" : ""}`}
                onClick={() => setActiveTab(item.key)}
              >
                {item.icon}
                {item.label}
              </button>
              {DIVIDER_AFTER.includes(item.key) && (
                <div className="settings-sidebar__divider" />
              )}
            </React.Fragment>
          ))}
        </nav>
        <div className="settings-sidebar__spacer" />
        <div className="settings-sidebar__version">v1.0.0</div>
      </aside>

      {/* ── Content ── */}
      <main className="settings-content">
        <div className="settings-content__header">
          <h1 className="settings-content__title">{activeNav.label}</h1>
          <p className="settings-content__subtitle">
            {activeNav.description}
          </p>
        </div>

        {renderContent()}
      </main>

      {/* ── Modals ── */}
      <ProjectModal
        visible={editModalVisible}
        project={selectedProject}
        users={users}
        onCancel={() => setEditModalVisible(false)}
        onSave={handleSaveProject}
        loading={modalLoading}
      />
      <ProjectModal
        visible={createModalVisible}
        project={null}
        users={users}
        onCancel={() => setCreateModalVisible(false)}
        onSave={handleCreateProjectSave}
        loading={modalLoading}
        isNew
      />
    </div>
  );
};

export default Settings;
