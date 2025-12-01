import React, { useState } from "react";
import {
  Card,
  Typography,
  Radio,
  Select,
  Switch,
  Divider,
  Space,
  Button,
  message,
  Tabs,
  Alert,
} from "antd";
import {
  BgColorsOutlined,
  BellOutlined,
  GlobalOutlined,
  SafetyOutlined,
  UserOutlined,
  SettingOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "medium"
  );
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
    // In a real app, this would save to backend/localStorage
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

  const tabItems = [
    {
      key: "appearance",
      label: (
        <span>
          <BgColorsOutlined />
          Appearance
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Theme Selection */}
          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Theme
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 13, display: "block", marginBottom: 16 }}
            >
              Choose your preferred color scheme
            </Text>
            <Radio.Group
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="light">
                <Space>
                  <span>☀️</span>
                  Light
                </Space>
              </Radio.Button>
              <Radio.Button value="dark">
                <Space>
                  <span>🌙</span>
                  Dark
                </Space>
              </Radio.Button>
              <Radio.Button value="auto">
                <Space>
                  <span>🔄</span>
                  Auto
                </Space>
              </Radio.Button>
            </Radio.Group>
          </div>

          <Divider />

          {/* Font Size */}
          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Font Size
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 13, display: "block", marginBottom: 16 }}
            >
              Adjust text size for better readability
            </Text>
            <Radio.Group
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="small">
                <span style={{ fontSize: 12 }}>Small</span>
              </Radio.Button>
              <Radio.Button value="medium">
                <span style={{ fontSize: 14 }}>Medium</span>
              </Radio.Button>
              <Radio.Button value="large">
                <span style={{ fontSize: 16 }}>Large</span>
              </Radio.Button>
            </Radio.Group>
          </div>

          <Divider />

          {/* Compact Mode */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 15, display: "block" }}>
                Compact Mode
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Reduce spacing for a denser layout
              </Text>
            </div>
            <Switch defaultChecked={false} />
          </div>

          <Divider />

          {/* Sidebar Position */}
          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Sidebar Position
            </Text>
            <Select
              defaultValue="left"
              style={{ width: 200 }}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
            />
          </div>
        </Space>
      ),
    },
    {
      key: "language",
      label: (
        <span>
          <GlobalOutlined />
          Language & Region
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Language
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 13, display: "block", marginBottom: 16 }}
            >
              Select your preferred language
            </Text>
            <Select
              value={language}
              onChange={setLanguage}
              style={{ width: 300 }}
              options={[
                { value: "en", label: "🇺🇸 English" },
                { value: "es", label: "🇪🇸 Español" },
                { value: "fr", label: "🇫🇷 Français" },
                { value: "de", label: "🇩🇪 Deutsch" },
                { value: "zh", label: "🇨🇳 中文" },
                { value: "ja", label: "🇯🇵 日本語" },
              ]}
            />
          </div>

          <Divider />

          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Time Zone
            </Text>
            <Select
              defaultValue="utc"
              style={{ width: 300 }}
              options={[
                { value: "utc", label: "(UTC+00:00) UTC" },
                { value: "est", label: "(UTC-05:00) Eastern Time" },
                { value: "pst", label: "(UTC-08:00) Pacific Time" },
                { value: "cet", label: "(UTC+01:00) Central European Time" },
                { value: "jst", label: "(UTC+09:00) Japan Standard Time" },
              ]}
            />
          </div>

          <Divider />

          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Date Format
            </Text>
            <Radio.Group defaultValue="mdy">
              <Space direction="vertical">
                <Radio value="mdy">MM/DD/YYYY (12/31/2025)</Radio>
                <Radio value="dmy">DD/MM/YYYY (31/12/2025)</Radio>
                <Radio value="ymd">YYYY-MM-DD (2025-12-31)</Radio>
              </Space>
            </Radio.Group>
          </div>
        </Space>
      ),
    },
    {
      key: "notifications",
      label: (
        <span>
          <BellOutlined />
          Notifications
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 15, display: "block" }}>
                Email Notifications
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Receive updates via email
              </Text>
            </div>
            <Switch
              checked={notifications.email}
              onChange={(checked) =>
                setNotifications({ ...notifications, email: checked })
              }
            />
          </div>

          <Divider />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 15, display: "block" }}>
                Push Notifications
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Get notified about important updates
              </Text>
            </div>
            <Switch
              checked={notifications.push}
              onChange={(checked) =>
                setNotifications({ ...notifications, push: checked })
              }
            />
          </div>

          <Divider />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 15, display: "block" }}>
                Product Updates
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Stay informed about new features
              </Text>
            </div>
            <Switch
              checked={notifications.updates}
              onChange={(checked) =>
                setNotifications({ ...notifications, updates: checked })
              }
            />
          </div>

          <Divider />

          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Notification Sound
            </Text>
            <Select
              defaultValue="default"
              style={{ width: 200 }}
              options={[
                { value: "default", label: "Default" },
                { value: "chime", label: "Chime" },
                { value: "bell", label: "Bell" },
                { value: "none", label: "None" },
              ]}
            />
          </div>
        </Space>
      ),
    },
    {
      key: "account",
      label: (
        <span>
          <UserOutlined />
          Account
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Profile Visibility
            </Text>
            <Radio.Group defaultValue="everyone">
              <Space direction="vertical">
                <Radio value="everyone">Everyone</Radio>
                <Radio value="team">Team members only</Radio>
                <Radio value="private">Private</Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 15, display: "block" }}>
                Show Online Status
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Let others know when you're online
              </Text>
            </div>
            <Switch defaultChecked />
          </div>

          <Divider />

          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
            >
              Session Timeout
            </Text>
            <Select
              defaultValue="30"
              style={{ width: 200 }}
              options={[
                { value: "15", label: "15 minutes" },
                { value: "30", label: "30 minutes" },
                { value: "60", label: "1 hour" },
                { value: "never", label: "Never" },
              ]}
            />
          </div>
        </Space>
      ),
    },
    {
      key: "privacy",
      label: (
        <span>
          <SafetyOutlined />
          Privacy & Security
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 15, display: "block" }}>
                Two-Factor Authentication
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Add an extra layer of security
              </Text>
            </div>
            <Switch defaultChecked={false} />
          </div>

          <Divider />

          <div>
            <Button type="default">Change Password</Button>
          </div>

          <Divider />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 15, display: "block" }}>
                Login Alerts
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Get notified of new login attempts
              </Text>
            </div>
            <Switch defaultChecked />
          </div>

          <Divider />

          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 12 }}
              type="danger"
            >
              Danger Zone
            </Text>
            <Space direction="vertical" size={8}>
              <Button danger>Clear All Data</Button>
              <Button danger type="primary">
                Delete Account
              </Button>
            </Space>
          </div>
        </Space>
      ),
    },
    {
      key: "system",
      label: (
        <span>
          <SettingOutlined />
          System
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 8 }}
            >
              <InboxOutlined style={{ marginRight: 8 }} />
              Ticket Archiving
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 13, display: "block", marginBottom: 16 }}
            >
              Tickets in the "Done" column for more than 24 hours are
              automatically archived. You can manually trigger this process
              below.
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
                style={{ marginBottom: 16 }}
                showIcon
              />
            )}

            <Button
              type="primary"
              icon={<InboxOutlined />}
              onClick={handleTriggerArchive}
              loading={archiving}
            >
              {archiving ? "Archiving..." : "Archive Completed Tickets"}
            </Button>
          </div>

          <Divider />

          <div>
            <Text
              strong
              style={{ fontSize: 15, display: "block", marginBottom: 8 }}
            >
              Background Tasks
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 13, display: "block", marginBottom: 8 }}
            >
              The system automatically runs the following background tasks:
            </Text>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#666" }}>
              <li>Auto-archive completed tickets (runs hourly)</li>
              <li>Clean up expired sessions</li>
            </ul>
          </div>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: 24,
        minHeight: "calc(100vh - 64px)",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Settings
          </Title>
          <Text type="secondary">
            Manage your account settings and preferences
          </Text>
        </div>

        {/* Settings Card */}
        <Card>
          <Tabs
            defaultActiveKey="appearance"
            tabPosition="left"
            items={tabItems}
            style={{ minHeight: 500 }}
          />

          {/* Action Buttons */}
          <Divider />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={handleReset}>Reset to Defaults</Button>
            <Button type="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
