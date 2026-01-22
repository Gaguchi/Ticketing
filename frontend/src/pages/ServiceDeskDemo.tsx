import React, { useState } from "react";
import {
  Layout,
  Tabs,
  Card,
  Typography,
  Avatar,
  Tag,
  Button,
  List,
  Input,
  Space,
  Divider,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  SendOutlined,
  PaperClipOutlined,
  SmileOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  SearchOutlined,
  BellOutlined,
  PlusCircleOutlined,
  TeamOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLaptop } from "@fortawesome/free-solid-svg-icons";

// Mock Data
const mockTicket = {
  id: "TICK-1234",
  title: "Cannot access VPN from remote location",
  description:
    "I'm trying to connect to the corporate VPN from my home office but getting a 'Connection Refused' error. I've tried rebooting my router and laptop but the issue persists. This is blocking my work on the Q3 reports.",
  priority: "High",
  status: "In Progress",
  created: "2 hours ago",
  assignee: { name: "Sarah Smith", avatar: "https://i.pravatar.cc/150?u=1" },
  reporter: {
    name: "John Doe",
    email: "john.doe@company.com",
    department: "Finance",
    avatar: "https://i.pravatar.cc/150?u=2",
  },
  tags: ["VPN", "Network", "Remote Work"],
  sla: "4h remaining",
};

const mockMessages = [
  {
    id: 1,
    sender: "system",
    text: "Ticket created by John Doe",
    time: "10:00 AM",
  },
  {
    id: 2,
    sender: "user",
    text: "Hi, I'm having trouble connecting to the VPN.",
    time: "10:01 AM",
    user: mockTicket.reporter,
  },
  {
    id: 3,
    sender: "agent",
    text: "Hello John, I'd be happy to help you with that. Are you getting a specific error code?",
    time: "10:05 AM",
    user: mockTicket.assignee,
  },
  {
    id: 4,
    sender: "user",
    text: "Yes, it says Error 800: Unable to establish connection.",
    time: "10:06 AM",
    user: mockTicket.reporter,
  },
  {
    id: 5,
    sender: "agent",
    text: "Thanks. Could you please check if your authenticator app is syncing correctly?",
    time: "10:08 AM",
    user: mockTicket.assignee,
  },
];

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

// ==========================================
// Variant A: Clean Split (Classic Sidebar)
// ==========================================
const VariantA = () => {
  return (
    <Layout style={{ height: "calc(100vh - 120px)", background: "#fff" }}>
      <Sider
        width={350}
        theme="light"
        style={{
          borderRight: "1px solid #f0f0f0",
          overflowY: "auto",
          padding: "24px",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Tag color="red">{mockTicket.priority}</Tag>
              <Text type="secondary">{mockTicket.id}</Text>
            </div>
            <Title level={4} style={{ margin: 0 }}>
              {mockTicket.title}
            </Title>
          </div>

          <Card size="small" title="Reporter">
            <List.Item.Meta
              avatar={<Avatar src={mockTicket.reporter.avatar} />}
              title={mockTicket.reporter.name}
              description={mockTicket.reporter.email}
            />
          </Card>

          <div>
            <Text type="secondary">Description</Text>
            <Paragraph style={{ marginTop: 8 }}>
              {mockTicket.description}
            </Paragraph>
          </div>

          <Space wrap>
            {mockTicket.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>

          <Card size="small" title="Details">
            <Space direction="vertical" style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">Status:</Text>
                <Tag color="blue">{mockTicket.status}</Tag>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">Created:</Text>
                <Text>{mockTicket.created}</Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">SLA:</Text>
                <Text type="danger">{mockTicket.sla}</Text>
              </div>
            </Space>
          </Card>
        </Space>
      </Sider>

      <Content style={{ display: "flex", flexDirection: "column" }}>
        <Header
          style={{
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <Avatar
              style={{ backgroundColor: "#1890ff" }}
              icon={<UserOutlined />}
            />
            <Text strong>Chat with {mockTicket.reporter.name}</Text>
          </Space>
          <Space>
            <Button icon={<PhoneOutlined />} />
            <Button icon={<VideoCameraOutlined />} />
            <Button icon={<MoreOutlined />} />
          </Space>
        </Header>

        <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: "#f5f7fa" }}>
          {mockMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems:
                  msg.sender === "system"
                    ? "center"
                    : msg.sender === "agent"
                    ? "flex-end"
                    : "flex-start",
                marginBottom: 16,
              }}
            >
              {msg.sender === "system" ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {msg.text} • {msg.time}
                </Text>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: msg.sender === "agent" ? "row-reverse" : "row",
                    maxWidth: "70%",
                    gap: 12,
                  }}
                >
                  <Avatar src={msg.user?.avatar} size="small" />
                  <div>
                    <div
                      style={{
                        background: msg.sender === "agent" ? "#1890ff" : "#fff",
                        color: msg.sender === "agent" ? "#fff" : "inherit",
                        padding: "12px 16px",
                        borderRadius: 12,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        borderBottomRightRadius: msg.sender === "agent" ? 4 : 12,
                        borderBottomLeftRadius: msg.sender !== "agent" ? 4 : 12,
                      }}
                    >
                      {msg.text}
                    </div>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        display: "block",
                        textAlign: msg.sender === "agent" ? "right" : "left",
                      }}
                    >
                      {msg.time}
                    </Text>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "16px 24px",
            background: "#fff",
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Space.Compact style={{ width: "100%" }}>
            <Button icon={<PaperClipOutlined />} />
            <Input
              placeholder="Type a message..."
              style={{ borderRadius: 0 }}
            />
            <Button icon={<SmileOutlined />} />
            <Button type="primary" icon={<SendOutlined />}>
              Send
            </Button>
          </Space.Compact>
        </div>
      </Content>
    </Layout>
  );
};

// ==========================================
// Variant B: Modern Floating (Glassmorphism)
// ==========================================
const VariantB = () => {
  return (
    <div
      style={{
        height: "calc(100vh - 120px)",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: "24px",
        display: "flex",
        gap: "24px",
      }}
    >
      {/* Floating Ticket Card */}
      <div
        style={{
          width: 380,
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 16 }}>
            <Tag color="red" style={{ borderRadius: 12, padding: "2px 10px" }}>
              {mockTicket.priority}
            </Tag>
            <Tag color="blue" style={{ borderRadius: 12, padding: "2px 10px" }}>
              {mockTicket.id}
            </Tag>
          </Space>
          <Title level={3} style={{ marginBottom: 12 }}>
            {mockTicket.title}
          </Title>
          <Space>
            <Text type="secondary">
              <ClockCircleOutlined /> {mockTicket.created}
            </Text>
            <Divider type="vertical" />
            <Text type="secondary">
              <FontAwesomeIcon icon={faLaptop} /> Hardware
            </Text>
          </Space>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.5)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 16, lineHeight: 1.6 }}>
            {mockTicket.description}
          </Text>
        </div>

        <Space align="center" style={{ marginBottom: 24 }}>
            <Avatar size={48} src={mockTicket.reporter.avatar} />
            <div>
                <Text strong style={{ display: "block", fontSize: 16 }}>{mockTicket.reporter.name}</Text>
                <Text type="secondary">{mockTicket.reporter.department}</Text>
            </div>
        </Space>

        <div style={{ marginTop: "auto" }}>
          <Title level={5}>Quick Actions</Title>
          <Space wrap>
            <Button shape="round">Change Status</Button>
            <Button shape="round">Assign</Button>
            <Button shape="round" danger>Close Ticket</Button>
          </Space>
        </div>
      </div>

      {/* Floating Chat Card */}
      <div
        style={{
          flex: 1,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 32px",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Discussion
          </Title>
          <Avatar.Group maxCount={3}>
            <Avatar src={mockTicket.reporter.avatar} />
            <Avatar src={mockTicket.assignee.avatar} />
            <Tooltip title="Add participant">
                <Avatar style={{ backgroundColor: '#fde3cf', color: '#f56a00' }}>+</Avatar>
            </Tooltip>
          </Avatar.Group>
        </div>

        <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          {mockMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: 24,
                display: "flex",
                flexDirection: "column",
                alignItems:
                  msg.sender === "system"
                    ? "center"
                    : msg.sender === "agent"
                    ? "flex-end"
                    : "flex-start",
              }}
            >
                {msg.sender === "system" ? (
                    <Tag>{msg.text}</Tag>
                ) : (
                    <div style={{ maxWidth: "60%", position: "relative" }}>
                        <div
                            style={{
                                padding: "16px 24px",
                                borderRadius: 24,
                                background: msg.sender === "agent" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#fff",
                                color: msg.sender === "agent" ? "#fff" : "#333",
                                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                                borderBottomRightRadius: msg.sender === "agent" ? 4 : 24,
                                borderBottomLeftRadius: msg.sender !== "agent" ? 4 : 24,
                            }}
                        >
                            {msg.text}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, position: "absolute", bottom: -20, [msg.sender === "agent" ? "right" : "left"]: 4 }}>{msg.time}</Text>
                    </div>
                )}
            </div>
          ))}
        </div>

        <div style={{ padding: "20px 32px", background: "rgba(255,255,255,0.5)" }}>
            <div style={{ 
                background: "#fff", 
                borderRadius: 24, 
                padding: "8px 16px",
                display: "flex", 
                alignItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}>
                <Button type="text" shape="circle" icon={<PaperClipOutlined />} />
                <Input bordered={false} placeholder="Write a reply..." style={{ flex: 1 }} />
                <Button type="primary" shape="round" icon={<SendOutlined />} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>Send</Button>
            </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Variant C: Compact / Dense (Power User)
// ==========================================
const VariantC = () => {
    return (
        <Layout style={{ height: "calc(100vh - 120px)", background: "#fff" }}>
            {/* Left Nav Strip */}
            <Sider width={60} style={{ background: "#202225", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0" }}>
                 <Tooltip title="Back to Dashboard" placement="right">
                    <Button type="text" icon={<ArrowLeftOutlined style={{ color: "#fff", fontSize: 20 }} />} style={{ marginBottom: 24 }} />
                 </Tooltip>
                 <Space direction="vertical" size="middle">
                     <Tooltip title="Details" placement="right">
                        <Button type="primary" shape="circle" icon={<FileOutlined />} />
                     </Tooltip>
                     <Tooltip title="History" placement="right">
                        <Button type="text" shape="circle" icon={<ClockCircleOutlined style={{ color: "#999" }} />} />
                     </Tooltip>
                     <Tooltip title="Settings" placement="right">
                        <Button type="text" shape="circle" icon={<SettingOutlined style={{ color: "#999" }} />} />
                     </Tooltip>
                 </Space>
            </Sider>

            {/* Ticket List / Context Panel */}
            <Sider width={280} style={{ background: "#2f3136", borderRight: "1px solid #202225" }}>
                <div style={{ padding: 16, borderBottom: "1px solid #202225" }}>
                     <Input prefix={<SearchOutlined style={{ color: "#72767d" }} />} placeholder="Search..." style={{ background: "#202225", border: "none", color: "#fff" }} />
                </div>
                <div style={{ padding: 16 }}>
                    <Text style={{ color: "#8e9297", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>Ticket Details</Text>
                    
                    <div style={{ marginTop: 16 }}>
                        <Text style={{ color: "#dcddde", fontSize: 15, fontWeight: 600 }}>{mockTicket.title}</Text>
                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                            <Tag color="#ed4245" style={{ margin: 0, border: "none" }}>High</Tag>
                            <Tag color="#5865f2" style={{ margin: 0, border: "none" }}>{mockTicket.id}</Tag>
                        </div>
                    </div>

                    <Divider style={{ borderColor: "#40444b", margin: "16px 0" }} />

                    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px 0" }}>
                        <Text style={{ color: "#8e9297" }}>Reporter</Text>
                        <Space>
                             <Avatar size={20} src={mockTicket.reporter.avatar} />
                             <Text style={{ color: "#dcddde" }}>{mockTicket.reporter.name}</Text>
                        </Space>

                        <Text style={{ color: "#8e9297" }}>Assignee</Text>
                        <Space>
                             <Avatar size={20} src={mockTicket.assignee.avatar} />
                             <Text style={{ color: "#dcddde" }}>{mockTicket.assignee.name}</Text>
                        </Space>

                        <Text style={{ color: "#8e9297" }}>Created</Text>
                        <Text style={{ color: "#dcddde" }}>{mockTicket.created}</Text>
                    </div>

                    <Divider style={{ borderColor: "#40444b", margin: "16px 0" }} />

                    <Text style={{ color: "#8e9297", marginBottom: 8, display: "block" }}>Description</Text>
                    <Text style={{ color: "#b9bbbe", fontSize: 13 }}>
                        {mockTicket.description}
                    </Text>
                </div>
            </Sider>

            {/* Chat Area */}
            <Content style={{ background: "#36393f", display: "flex", flexDirection: "column" }}>
                <Header style={{ 
                    background: "#36393f", 
                    borderBottom: "1px solid #202225", 
                    padding: "0 16px", 
                    height: 54, 
                    display: "flex", 
                    alignItems: "center",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                         <Text style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}># {mockTicket.title}</Text>
                         <Divider type="vertical" style={{ borderColor: "#72767d" }} />
                         <Text style={{ color: "#b9bbbe", fontSize: 12 }}>{mockTicket.status}</Text>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
                        <BellOutlined style={{ color: "#b9bbbe", fontSize: 20, cursor: "pointer" }} />
                        <TeamOutlined style={{ color: "#b9bbbe", fontSize: 20, cursor: "pointer" }} />
                        <Input.Search placeholder="Search messages" style={{ width: 200 }} size="small" />
                    </div>
                </Header>

                <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {mockMessages.map(msg => (
                        <div key={msg.id} style={{ 
                            marginBottom: 16, 
                            marginTop: msg.sender === "system" ? 8 : 0,
                            paddingLeft: msg.sender === "system" ? 0 : 50,
                            position: "relative",
                            display: "flex",
                            flexDirection: "column"
                        }}>
                             {msg.sender === "system" ? (
                                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                     <div style={{ flex: 1, height: 1, background: "#40444b" }}></div>
                                     <Text style={{ color: "#72767d", fontSize: 12 }}>{msg.text}</Text>
                                     <div style={{ flex: 1, height: 1, background: "#40444b" }}></div>
                                 </div>
                             ) : (
                                 <>
                                    <Avatar src={msg.user?.avatar} style={{ position: "absolute", left: 0, top: 4 }} />
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                        <Text style={{ color: "#fff", fontWeight: 500 }}>{msg.user?.name}</Text>
                                        <Text style={{ color: "#72767d", fontSize: 11 }}>{msg.time}</Text>
                                    </div>
                                    <Text style={{ color: "#dcddde" }}>{msg.text}</Text>
                                 </>
                             )}
                        </div>
                    ))}
                </div>

                <div style={{ padding: "0 16px 24px" }}>
                    <div style={{ 
                        background: "#40444b", 
                        borderRadius: 8, 
                        padding: "12px",
                    }}>
                        <Input.TextArea 
                            placeholder={`Message #${mockTicket.id}`}
                            autoSize={{ minRows: 1, maxRows: 6 }}
                            bordered={false}
                            style={{ background: "transparent", color: "#fff", padding: 0 }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                            <Space>
                                <Button type="text" shape="circle" icon={<PlusCircleOutlined style={{ color: "#b9bbbe" }} />} />
                                <Button type="text" shape="circle" icon={<SmileOutlined style={{ color: "#b9bbbe" }} />} />
                            </Space>
                            <Button type="text" icon={<SendOutlined style={{ color: "#b9bbbe" }} />} />
                        </div>
                    </div>
                </div>
            </Content>

            {/* Right Widget Column (Optional) */}
            <Sider width={240} style={{ background: "#2f3136", borderLeft: "1px solid #202225" }}>
                 <div style={{ padding: 16 }}>
                      <Text style={{ color: "#8e9297", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>Quick Links</Text>
                      <List style={{ marginTop: 8 }}>
                          <List.Item style={{ padding: "8px 0", borderBlockEnd: "none" }}>
                              <Text style={{ color: "#00b0f4", cursor: "pointer" }}>Knowledge Base Article #422</Text>
                          </List.Item>
                          <List.Item style={{ padding: "8px 0", borderBlockEnd: "none" }}>
                              <Text style={{ color: "#00b0f4", cursor: "pointer" }}>VPN Troubleshooting Guide</Text>
                          </List.Item>
                      </List>
                 </div>
            </Sider>
        </Layout>
    )
}



const ServiceDeskDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState("a");

  const items = [
    {
      key: "a",
      label: "Variant A: Clean Split",
      children: <VariantA />,
    },
    {
      key: "b",
      label: "Variant B: Modern Floating",
      children: <VariantB />,
    },
    {
      key: "c",
      label: "Variant C: Compact Dark",
      children: <VariantC />,
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={2} style={{ margin: 0 }}>
          Service Desk Redesign Concepts
        </Title>
        <Space>
            <Button>Reset Demo</Button>
            <Button type="primary">Provide Feedback</Button>
        </Space>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={items}
        style={{ background: "#fff", padding: "16px", borderRadius: "8px" }}
      />
    </div>
  );
};

export default ServiceDeskDemo;
