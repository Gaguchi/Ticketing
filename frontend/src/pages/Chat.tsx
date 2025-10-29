import React, { useState } from "react";
import { Input, Avatar, Badge, List, Card, Typography, Space } from "antd";
import {
  SearchOutlined,
  SendOutlined,
  UserOutlined,
  SmileOutlined,
  PaperClipOutlined,
  PlayCircleOutlined,
  AudioOutlined,
  FileImageOutlined,
  CaretRightOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

// Dummy data for chat conversations
const conversations = [
  {
    id: 1,
    name: "Sarah Johnson",
    avatar: null,
    lastMessage: "Sure, I'll send you the updated mockups by EOD",
    timestamp: "2m ago",
    unread: 3,
    online: true,
  },
  {
    id: 2,
    name: "Development Team",
    avatar: null,
    lastMessage: "Alex: The API integration is complete ✅",
    timestamp: "15m ago",
    unread: 0,
    online: false,
    isGroup: true,
  },
  {
    id: 3,
    name: "Mike Chen",
    avatar: null,
    lastMessage: "Thanks for the quick turnaround!",
    timestamp: "1h ago",
    unread: 0,
    online: true,
  },
  {
    id: 4,
    name: "Design Review",
    avatar: null,
    lastMessage: "Emily: Love the new color scheme 🎨",
    timestamp: "3h ago",
    unread: 1,
    online: false,
    isGroup: true,
  },
  {
    id: 5,
    name: "Rachel Adams",
    avatar: null,
    lastMessage: "Can we schedule a call tomorrow?",
    timestamp: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: 6,
    name: "Project Alpha",
    avatar: null,
    lastMessage: "John: Meeting notes uploaded to drive",
    timestamp: "Yesterday",
    unread: 0,
    online: false,
    isGroup: true,
  },
];

// Dummy messages for active chat
const dummyMessages = [
  {
    id: 1,
    senderId: 2,
    senderName: "Mike Chen",
    content: "Hey! Did you get a chance to review the designs?",
    timestamp: "10:23 AM",
    isMine: false,
    type: "text",
  },
  {
    id: 2,
    senderId: 1,
    senderName: "You",
    content: "Yes! They look great. Just a few minor tweaks needed.",
    timestamp: "10:25 AM",
    isMine: true,
    type: "text",
  },
  {
    id: 3,
    senderId: 2,
    senderName: "Mike Chen",
    content: "Here's the updated mockup",
    timestamp: "10:26 AM",
    isMine: false,
    type: "image",
    imageUrl:
      "https://via.placeholder.com/400x300/1890ff/ffffff?text=Design+Mockup",
  },
  {
    id: 4,
    senderId: 1,
    senderName: "You",
    content:
      "The main navigation could use a bit more spacing, and maybe we could increase the contrast on the CTAs?",
    timestamp: "10:27 AM",
    isMine: true,
    type: "text",
  },
  {
    id: 5,
    senderId: 2,
    senderName: "Mike Chen",
    content: "",
    timestamp: "10:28 AM",
    isMine: false,
    type: "voice",
    duration: "0:45",
  },
  {
    id: 6,
    senderId: 1,
    senderName: "You",
    content: "Perfect! Thanks for the quick response",
    timestamp: "10:29 AM",
    isMine: true,
    type: "text",
  },
  {
    id: 7,
    senderId: 2,
    senderName: "Mike Chen",
    content: "Demo of the new animation",
    timestamp: "10:30 AM",
    isMine: false,
    type: "video",
    videoUrl:
      "https://via.placeholder.com/400x300/52c41a/ffffff?text=Video+Demo",
  },
];

const Chat: React.FC = () => {
  const [activeChat, setActiveChat] = useState(conversations[0]);
  const [messageInput, setMessageInput] = useState("");

  return (
    <div
      style={{
        height: "calc(100vh - 64px)", // Subtract header height
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: 600, color: "#172b4d" }}>
          Messages
        </Text>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Conversations List */}
        <div
          style={{
            width: 320,
            backgroundColor: "#fff",
            borderRight: "1px solid #e8e8e8",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div style={{ padding: "12px 16px" }}>
            <Input
              placeholder="Search conversations..."
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              style={{ borderRadius: 8 }}
            />
          </div>

          {/* Conversations */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <List
              dataSource={conversations}
              renderItem={(conversation) => (
                <List.Item
                  onClick={() => setActiveChat(conversation)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    backgroundColor:
                      activeChat.id === conversation.id
                        ? "#f0f5ff"
                        : "transparent",
                    borderLeft:
                      activeChat.id === conversation.id
                        ? "3px solid #1890ff"
                        : "3px solid transparent",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (activeChat.id !== conversation.id) {
                      e.currentTarget.style.backgroundColor = "#fafafa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeChat.id !== conversation.id) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={conversation.online} offset={[-2, 32]}>
                        <Avatar
                          size={40}
                          icon={<UserOutlined />}
                          style={{
                            backgroundColor: conversation.isGroup
                              ? "#52c41a"
                              : "#1890ff",
                          }}
                        />
                      </Badge>
                    }
                    title={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          strong
                          style={{
                            fontSize: 14,
                            color: "#172b4d",
                          }}
                        >
                          {conversation.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#8c8c8c",
                          }}
                        >
                          {conversation.timestamp}
                        </Text>
                      </div>
                    }
                    description={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          ellipsis
                          style={{
                            fontSize: 13,
                            color:
                              conversation.unread > 0 ? "#172b4d" : "#8c8c8c",
                            fontWeight: conversation.unread > 0 ? 500 : 400,
                            flex: 1,
                          }}
                        >
                          {conversation.lastMessage}
                        </Text>
                        {conversation.unread > 0 && (
                          <Badge
                            count={conversation.unread}
                            style={{
                              marginLeft: 8,
                              backgroundColor: "#1890ff",
                            }}
                          />
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#fff",
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid #e8e8e8",
              backgroundColor: "#fafafa",
            }}
          >
            <Space size={12}>
              <Badge dot={activeChat.online} offset={[-2, 32]}>
                <Avatar
                  size={36}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: activeChat.isGroup ? "#52c41a" : "#1890ff",
                  }}
                />
              </Badge>
              <div>
                <Text strong style={{ fontSize: 15, color: "#172b4d" }}>
                  {activeChat.name}
                </Text>
                <br />
                <Text style={{ fontSize: 12, color: "#8c8c8c" }}>
                  {activeChat.online
                    ? "Active now"
                    : activeChat.isGroup
                    ? `${Math.floor(Math.random() * 10) + 3} members`
                    : "Last seen recently"}
                </Text>
              </div>
            </Space>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              backgroundColor: "#f9fafb",
            }}
          >
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {dummyMessages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent: message.isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      maxWidth: "60%",
                      flexDirection: message.isMine ? "row-reverse" : "row",
                    }}
                  >
                    {!message.isMine && (
                      <Avatar
                        size={32}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#1890ff", flexShrink: 0 }}
                      />
                    )}
                    <div>
                      <Card
                        size="small"
                        styles={{
                          body: {
                            padding:
                              message.type === "image" ||
                              message.type === "video"
                                ? "4px"
                                : message.type === "voice"
                                ? "8px 12px"
                                : "10px 14px",
                            backgroundColor: message.isMine
                              ? "#1890ff"
                              : "#fff",
                            borderRadius: message.isMine
                              ? "12px 12px 2px 12px"
                              : "12px 12px 12px 2px",
                          },
                        }}
                        style={{
                          border: message.isMine ? "none" : "1px solid #e8e8e8",
                          boxShadow: message.isMine
                            ? "none"
                            : "0 1px 2px rgba(0,0,0,0.05)",
                        }}
                      >
                        {message.type === "text" && (
                          <Text
                            style={{
                              color: message.isMine ? "#fff" : "#172b4d",
                              fontSize: 14,
                              lineHeight: "20px",
                            }}
                          >
                            {message.content}
                          </Text>
                        )}

                        {message.type === "image" && (
                          <div>
                            {message.content && (
                              <Text
                                style={{
                                  color: message.isMine ? "#fff" : "#172b4d",
                                  fontSize: 14,
                                  display: "block",
                                  padding: "6px 10px",
                                }}
                              >
                                {message.content}
                              </Text>
                            )}
                            <img
                              src={message.imageUrl}
                              alt="Shared image"
                              style={{
                                width: "100%",
                                maxWidth: 400,
                                borderRadius: 8,
                                cursor: "pointer",
                              }}
                            />
                          </div>
                        )}

                        {message.type === "video" && (
                          <div>
                            {message.content && (
                              <Text
                                style={{
                                  color: message.isMine ? "#fff" : "#172b4d",
                                  fontSize: 14,
                                  display: "block",
                                  padding: "6px 10px",
                                }}
                              >
                                {message.content}
                              </Text>
                            )}
                            <div
                              style={{
                                position: "relative",
                                width: "100%",
                                maxWidth: 400,
                                borderRadius: 8,
                                overflow: "hidden",
                                cursor: "pointer",
                              }}
                            >
                              <img
                                src={message.videoUrl}
                                alt="Video thumbnail"
                                style={{ width: "100%", display: "block" }}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                  backgroundColor: "rgba(0,0,0,0.6)",
                                  borderRadius: "50%",
                                  width: 56,
                                  height: 56,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <PlayCircleOutlined
                                  style={{ fontSize: 32, color: "#fff" }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {message.type === "voice" && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              minWidth: 200,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                backgroundColor: message.isMine
                                  ? "rgba(255,255,255,0.2)"
                                  : "#f0f5ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                            >
                              <CaretRightOutlined
                                style={{
                                  fontSize: 16,
                                  color: message.isMine ? "#fff" : "#1890ff",
                                }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  height: 2,
                                  backgroundColor: message.isMine
                                    ? "rgba(255,255,255,0.3)"
                                    : "#e8e8e8",
                                  borderRadius: 2,
                                  position: "relative",
                                }}
                              >
                                <div
                                  style={{
                                    height: 2,
                                    width: "40%",
                                    backgroundColor: message.isMine
                                      ? "#fff"
                                      : "#1890ff",
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                            </div>
                            <Text
                              style={{
                                fontSize: 12,
                                color: message.isMine ? "#fff" : "#8c8c8c",
                              }}
                            >
                              {message.duration}
                            </Text>
                          </div>
                        )}
                      </Card>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#8c8c8c",
                          marginTop: 4,
                          display: "block",
                          textAlign: message.isMine ? "right" : "left",
                        }}
                      >
                        {message.timestamp}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </Space>
          </div>

          {/* Message Input */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #e8e8e8",
              backgroundColor: "#fff",
            }}
          >
            <Space.Compact style={{ width: "100%" }}>
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onPressEnter={() => {
                  if (messageInput.trim()) {
                    setMessageInput("");
                  }
                }}
                style={{
                  flex: 1,
                  borderRadius: "8px 0 0 8px",
                  padding: "10px 14px",
                }}
                prefix={
                  <Space size={8}>
                    <PaperClipOutlined
                      style={{ color: "#8c8c8c", cursor: "pointer" }}
                    />
                    <SmileOutlined
                      style={{ color: "#8c8c8c", cursor: "pointer" }}
                    />
                  </Space>
                }
                suffix={
                  <SendOutlined
                    onClick={() => {
                      if (messageInput.trim()) {
                        setMessageInput("");
                      }
                    }}
                    style={{
                      color: messageInput.trim() ? "#1890ff" : "#d9d9d9",
                      cursor: messageInput.trim() ? "pointer" : "not-allowed",
                      fontSize: 16,
                    }}
                  />
                }
              />
            </Space.Compact>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
