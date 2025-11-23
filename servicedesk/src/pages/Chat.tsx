import React, { useState, useEffect, useRef } from "react";
import {
  Input,
  Avatar,
  List,
  Typography,
  Space,
  Button,
  message as antMessage,
  Spin,
  Upload,
  Popover,
  Badge,
  Modal,
  Select,
  Divider,
  Tabs,
} from "antd";
import {
  SearchOutlined,
  SendOutlined,
  UserOutlined,
  PaperClipOutlined,
  FileOutlined,
  DownloadOutlined,
  SmileOutlined,
  CloseOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import EmojiPicker from "emoji-picker-react";
import { useProject } from "../contexts/ProjectContext";
import { useAuth } from "../contexts/AuthContext";
import { chatService } from "../services/chat.service";
import { webSocketService } from "../services/websocket.service";
import type { ChatRoom, ChatMessage, ChatWebSocketEvent } from "../types/chat";
import type { User } from "../types";

const { Text } = Typography;

const Chat: React.FC = () => {
  const { selectedProject } = useProject();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [emojiPickerVisible, setEmojiPickerVisible] = useState<number | null>(
    null
  );
  const [sidebarTab, setSidebarTab] = useState<"direct" | "groups">("direct");
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isInitialLoadRef = useRef(true); // Track if this is the first load

  // Render counter for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Log every render with details
  console.log(`🔄 [Chat] Render #${renderCount.current}`, {
    selectedProjectId: selectedProject?.id,
    userId: user?.id,
    activeRoomId: activeRoom?.id,
    roomsCount: rooms.length,
    messagesCount: messages.length,
    loading,
    messagesLoading,
    typingUsersCount: typingUsers.size,
  });

  // Get project members
  const projectMembers: User[] = selectedProject?.members || [];

  // Get other members (excluding current user)
  const otherMembers = projectMembers.filter(
    (m) => m.username !== user?.username
  );

  // Separate direct and group chats
  const directChats = rooms.filter((r) => r.type === "direct");
  const groupChats = rooms.filter((r) => r.type === "group");

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load rooms on mount or when project changes
  useEffect(() => {
    console.log(
      "🔵 [Chat Effect] Load rooms triggered - selectedProject:",
      selectedProject?.id
    );
    if (!selectedProject) return;

    const loadRooms = async () => {
      try {
        // Only show loading spinner on initial load, not on refreshes
        if (isInitialLoadRef.current) {
          setLoading(true);
        }

        const data = await chatService.getRooms(selectedProject.id);
        console.log("📥 [Chat] Loaded rooms:", data.length);

        // Only update rooms if data has changed (compare by IDs and unread counts)
        setRooms((prevRooms) => {
          // If room count changed, definitely update
          if (prevRooms.length !== data.length) {
            console.log("📝 [Chat] Room count changed, updating");
            return data;
          }

          // Check if any room IDs or unread counts changed
          const hasChanges = data.some((newRoom, index) => {
            const prevRoom = prevRooms[index];
            return (
              !prevRoom ||
              prevRoom.id !== newRoom.id ||
              prevRoom.unread_count !== newRoom.unread_count ||
              prevRoom.last_message?.id !== newRoom.last_message?.id
            );
          });

          if (hasChanges) {
            console.log("📝 [Chat] Room data changed, updating");
            return data;
          }

          // No changes, keep same reference to prevent re-render
          console.log("✓ [Chat] Rooms unchanged, keeping current reference");
          return prevRooms;
        });

        // Calculate and dispatch total unread count for MainLayout
        const totalUnread = data.reduce(
          (sum, room) => sum + room.unread_count,
          0
        );
        window.dispatchEvent(
          new CustomEvent("chatUnreadUpdate", {
            detail: { unreadCount: totalUnread },
          })
        );

        // Only set active room if there isn't one already
        if (data.length > 0) {
          setActiveRoom((current) => {
            // If no active room, select first
            if (!current) {
              console.log("🎯 [Chat] Setting initial active room:", data[0].id);
              return data[0];
            }

            // Check if current room still exists in the list
            const currentStillExists = data.find((r) => r.id === current.id);

            // If current room doesn't exist anymore, select first
            if (!currentStillExists) {
              console.log(
                "⚠️ [Chat] Active room not found, selecting first:",
                data[0].id
              );
              return data[0];
            }

            // Otherwise, KEEP the current reference (don't replace with new object)
            // This prevents unnecessary re-renders when room data is the same
            console.log("✓ [Chat] Keeping current active room:", current.id);
            return current; // Return same reference, not new object from data
          });
        }
      } catch (error) {
        console.error("Failed to load chat rooms:", error);
        antMessage.error("Failed to load conversations");
      } finally {
        // Only set loading false on initial load
        if (isInitialLoadRef.current) {
          setLoading(false);
          isInitialLoadRef.current = false; // Mark initial load complete
        }
      }
    };

    loadRooms();

    // Refresh rooms every 10 seconds to update unread counts
    const interval = setInterval(loadRooms, 10000);
    return () => {
      console.log("🔴 [Chat Effect] Cleaning up rooms interval");
      clearInterval(interval);
      isInitialLoadRef.current = true; // Reset for next project
    };
  }, [selectedProject?.id]); // Only depend on project ID

  // Load messages when active room changes
  useEffect(() => {
    console.log(
      "🟢 [Chat Effect] Load messages triggered - activeRoom:",
      activeRoom?.id
    );
    if (!activeRoom) return;

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        // Clear messages from previous room
        setMessages([]);

        const data = await chatService.getMessages(activeRoom.id);
        setMessages(data);
        setTimeout(scrollToBottom, 100);

        // Mark as read
        await chatService.markRoomAsRead(activeRoom.id);

        // Update the room's unread count in local state
        setRooms((prev) => {
          const updated = prev.map((room) =>
            room.id === activeRoom.id ? { ...room, unread_count: 0 } : room
          );

          // Calculate total unread and dispatch event for MainLayout
          const totalUnread = updated.reduce(
            (sum, room) => sum + room.unread_count,
            0
          );
          window.dispatchEvent(
            new CustomEvent("chatUnreadUpdate", {
              detail: { unreadCount: totalUnread },
            })
          );

          return updated;
        });
      } catch (error) {
        console.error("Failed to load messages:", error);
        antMessage.error("Failed to load messages");
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [activeRoom?.id]); // Only depend on ID, not full object

  // Connect to WebSocket when room is selected
  useEffect(() => {
    console.log(
      "🟡 [Chat Effect] WebSocket connection triggered - activeRoom:",
      activeRoom?.id,
      "user:",
      user?.id
    );
    if (!activeRoom || !user) return;

    // Clear typing users when switching rooms
    setTypingUsers(new Set());

    const wsUrl = `ws/chat/${activeRoom.id}/`;

    const onMessage = (event: ChatWebSocketEvent) => {
      console.log("📨 [Chat] WebSocket event:", event);

      switch (event.type) {
        case "message_new":
          // Add message to list
          if (event.message.user.id !== user?.id) {
            setMessages((prev) => [...prev, event.message]);
            setTimeout(scrollToBottom, 100);
          }

          // Update room's last_message and reset unread_count (since we're viewing it)
          setRooms((prev) => {
            const updated = prev.map((room) =>
              room.id === event.message.room
                ? { ...room, last_message: event.message, unread_count: 0 }
                : room
            );

            // Calculate total unread and dispatch event for MainLayout
            const totalUnread = updated.reduce(
              (sum, room) => sum + room.unread_count,
              0
            );
            window.dispatchEvent(
              new CustomEvent("chatUnreadUpdate", {
                detail: { unreadCount: totalUnread },
              })
            );

            return updated;
          });
          break;

        case "message_edited":
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === event.message.id ? event.message : msg
            )
          );
          break;

        case "message_deleted":
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== event.message_id)
          );
          break;

        case "reaction_added":
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === event.reaction.message) {
                return {
                  ...msg,
                  reactions: [...msg.reactions, event.reaction],
                };
              }
              return msg;
            })
          );
          break;

        case "reaction_removed":
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === event.message_id) {
                return {
                  ...msg,
                  reactions: msg.reactions.filter(
                    (r) =>
                      !(r.user.id === event.user_id && r.emoji === event.emoji)
                  ),
                };
              }
              return msg;
            })
          );
          break;

        case "user_typing":
          if (event.is_typing) {
            setTypingUsers((prev) => new Set(prev).add(event.user_id));
          } else {
            setTypingUsers((prev) => {
              const next = new Set(prev);
              next.delete(event.user_id);
              return next;
            });
          }
          break;
      }
    };

    const onError = (error: Event) => {
      console.error("❌ [Chat] WebSocket error:", error);
    };

    const onClose = (event: CloseEvent) => {
      console.log("🔌 [Chat] WebSocket disconnected:", event);
    };

    // Small delay to ensure previous WebSocket is fully closed
    const connectTimer = setTimeout(() => {
      webSocketService.connect(wsUrl, onMessage, onError, onClose);

      // Get WebSocket reference for sending messages
      const ws = (webSocketService as any).connections;
      if (ws && ws[wsUrl]) {
        wsRef.current = ws[wsUrl];
      }
    }, 100);

    return () => {
      clearTimeout(connectTimer);
      webSocketService.disconnect(wsUrl);
      wsRef.current = null;
    };
  }, [activeRoom?.id, user?.id]); // Only depend on IDs, not full objects

  // Send message
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !uploadFile) || !activeRoom) return;

    try {
      const content = messageInput.trim();
      setMessageInput("");
      setUploading(true);

      // Always send via API (WebSocket will broadcast the update)
      const newMessage = await chatService.sendMessage({
        room: activeRoom.id,
        content: content || "File attachment",
        type: uploadFile
          ? uploadFile.type.startsWith("image/")
            ? "image"
            : "file"
          : "text",
        attachment: uploadFile || undefined,
      });

      // Add message to local state immediately
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(scrollToBottom, 100);

      if (uploadFile) {
        setUploadFile(null);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      antMessage.error("Failed to send message");
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      antMessage.error("File size must be less than 10MB");
      return false;
    }

    setUploadFile(file);
    return false; // Prevent auto upload
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send typing = true
    wsRef.current.send(
      JSON.stringify({
        type: "typing",
        is_typing: true,
      })
    );

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to send typing = false
    typingTimeoutRef.current = window.setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "typing",
            is_typing: false,
          })
        );
      }
    }, 3000);
  };

  // Handle emoji reaction
  const handleEmojiClick = async (
    messageId: number,
    emojiData: { emoji: string }
  ) => {
    try {
      await chatService.addReaction(messageId, emojiData.emoji);
      setEmojiPickerVisible(null);

      // Also send via WebSocket for real-time update
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "reaction_add",
            message_id: messageId,
            emoji: emojiData.emoji,
          })
        );
      }
    } catch (error) {
      console.error("Failed to add reaction:", error);
      antMessage.error("Failed to add reaction");
    }
  };

  // Handle remove reaction
  const handleRemoveReaction = async (messageId: number, emoji: string) => {
    try {
      await chatService.removeReaction(messageId, emoji);

      // Also send via WebSocket for real-time update
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "reaction_remove",
            message_id: messageId,
            emoji,
          })
        );
      }
    } catch (error) {
      console.error("Failed to remove reaction:", error);
      antMessage.error("Failed to remove reaction");
    }
  };

  // Start direct chat with a user
  const startDirectChat = async (member: User) => {
    if (!selectedProject || !user) return;

    try {
      // Check if direct chat already exists
      const existingChat = directChats.find((room) =>
        room.participants.some((p) => p.user.id === member.id)
      );

      if (existingChat) {
        setActiveRoom(existingChat);
        return;
      }

      // Create new direct chat
      const newRoom = await chatService.createRoom({
        type: "direct",
        project: selectedProject.id,
        participant_ids: [member.id],
      });

      setRooms([newRoom, ...rooms]);
      setActiveRoom(newRoom);
      antMessage.success(`Started chat with ${member.username}`);
    } catch (error) {
      console.error("Failed to start direct chat:", error);
      antMessage.error("Failed to start chat");
    }
  };

  // Create group chat
  const handleCreateGroup = async () => {
    if (!selectedProject || !groupName.trim() || selectedMembers.length === 0) {
      antMessage.error("Please enter a group name and select members");
      return;
    }

    try {
      setCreatingGroup(true);
      const newRoom = await chatService.createRoom({
        name: groupName,
        type: "group",
        project: selectedProject.id,
        participant_ids: selectedMembers,
      });

      setRooms([newRoom, ...rooms]);
      setActiveRoom(newRoom);
      setGroupModalVisible(false);
      setGroupName("");
      setSelectedMembers([]);
      antMessage.success("Group created successfully");
    } catch (error) {
      console.error("Failed to create group:", error);
      antMessage.error("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!selectedProject) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Text type="secondary">Please select a project to use chat</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 64px)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 600, color: "#172b4d" }}>
            Messages
          </Text>
          <Button
            type="primary"
            icon={<TeamOutlined />}
            onClick={() => setGroupModalVisible(true)}
          >
            New Group
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 320,
            backgroundColor: "#fff",
            borderRight: "1px solid #e8e8e8",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tabs */}
          <Tabs
            activeKey={sidebarTab}
            onChange={(key) => setSidebarTab(key as "direct" | "groups")}
            style={{ padding: "0 16px" }}
            items={[
              {
                key: "direct",
                label: (
                  <span>
                    <UserOutlined /> Direct Messages
                  </span>
                ),
              },
              {
                key: "groups",
                label: (
                  <span>
                    <TeamOutlined /> Groups
                  </span>
                ),
              },
            ]}
          />

          {/* Search */}
          <div style={{ padding: "0 16px 12px" }}>
            <Input
              placeholder={
                sidebarTab === "direct" ? "Search users..." : "Search groups..."
              }
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              style={{ borderRadius: 8 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              suffix={
                searchQuery && (
                  <CloseOutlined
                    onClick={() => setSearchQuery("")}
                    style={{ color: "#8c8c8c", cursor: "pointer" }}
                  />
                )
              }
            />
          </div>

          <Divider style={{ margin: 0 }} />

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {sidebarTab === "direct" ? (
              // Direct Messages - Show project members
              <List
                dataSource={otherMembers.filter((m) =>
                  searchQuery
                    ? m.username
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      `${m.first_name} ${m.last_name}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    : true
                )}
                renderItem={(member) => {
                  const existingChat = directChats.find((room) =>
                    room.participants.some((p) => p.user.id === member.id)
                  );
                  const isActive = activeRoom?.id === existingChat?.id;
                  const unreadCount = existingChat?.unread_count || 0;

                  return (
                    <List.Item
                      onClick={() =>
                        existingChat
                          ? setActiveRoom(existingChat)
                          : startDirectChat(member)
                      }
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        backgroundColor: isActive ? "#f0f5ff" : "transparent",
                        borderLeft: isActive
                          ? "3px solid #1890ff"
                          : "3px solid transparent",
                        transition: "all 0.2s",
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge
                            count={unreadCount}
                            size="small"
                            offset={[-5, 5]}
                          >
                            <Avatar
                              size={40}
                              style={{
                                backgroundColor: "#1890ff",
                              }}
                            >
                              {member.first_name?.[0] || member.username[0]}
                            </Avatar>
                          </Badge>
                        }
                        title={
                          <Text
                            strong
                            style={{ fontSize: 14, color: "#172b4d" }}
                          >
                            {member.first_name && member.last_name
                              ? `${member.first_name} ${member.last_name}`
                              : member.username}
                          </Text>
                        }
                        description={
                          existingChat?.last_message ? (
                            <Text
                              ellipsis
                              style={{
                                fontSize: 13,
                                color: unreadCount > 0 ? "#172b4d" : "#8c8c8c",
                                fontWeight: unreadCount > 0 ? 500 : 400,
                              }}
                            >
                              {existingChat.last_message.content}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 13, color: "#8c8c8c" }}>
                              Click to start chatting
                            </Text>
                          )
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              // Groups
              <List
                dataSource={groupChats.filter((g) =>
                  searchQuery
                    ? g.display_name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    : true
                )}
                renderItem={(room) => {
                  const isActive = activeRoom?.id === room.id;

                  return (
                    <List.Item
                      onClick={() => setActiveRoom(room)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        backgroundColor: isActive ? "#f0f5ff" : "transparent",
                        borderLeft: isActive
                          ? "3px solid #1890ff"
                          : "3px solid transparent",
                        transition: "all 0.2s",
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge
                            count={room.unread_count}
                            size="small"
                            offset={[-5, 5]}
                          >
                            <Avatar
                              size={40}
                              icon={<TeamOutlined />}
                              style={{
                                backgroundColor: "#52c41a",
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
                              style={{ fontSize: 14, color: "#172b4d" }}
                            >
                              {room.display_name}
                            </Text>
                            {room.last_message && (
                              <Text style={{ fontSize: 11, color: "#8c8c8c" }}>
                                {formatTime(room.last_message.created_at)}
                              </Text>
                            )}
                          </div>
                        }
                        description={
                          <Text
                            ellipsis
                            style={{
                              fontSize: 13,
                              color:
                                room.unread_count > 0 ? "#172b4d" : "#8c8c8c",
                              fontWeight: room.unread_count > 0 ? 500 : 400,
                            }}
                          >
                            {room.last_message?.content || "No messages yet"}
                          </Text>
                        }
                      />
                    </List.Item>
                  );
                }}
                locale={{
                  emptyText: (
                    <div style={{ padding: "40px 0", textAlign: "center" }}>
                      <TeamOutlined
                        style={{ fontSize: 48, color: "#d9d9d9" }}
                      />
                      <div style={{ marginTop: 16 }}>
                        <Text type="secondary">No groups yet</Text>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Button
                          type="link"
                          onClick={() => setGroupModalVisible(true)}
                        >
                          Create your first group
                        </Button>
                      </div>
                    </div>
                  ),
                }}
              />
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeRoom ? (
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
                <Avatar
                  size={36}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor:
                      activeRoom.type === "group" ? "#52c41a" : "#1890ff",
                  }}
                />
                <div>
                  <Text strong style={{ fontSize: 15, color: "#172b4d" }}>
                    {activeRoom.display_name}
                  </Text>
                  <br />
                  <Text style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {activeRoom.type === "group"
                      ? `${activeRoom.participants.length} members`
                      : "Direct message"}
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
              {messagesLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Spin />
                </div>
              ) : (
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  {messages.map((msg) => {
                    const isMine = msg.user.id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            maxWidth: "60%",
                            flexDirection: isMine ? "row-reverse" : "row",
                          }}
                        >
                          {!isMine && (
                            <Avatar
                              size={32}
                              icon={<UserOutlined />}
                              style={{
                                backgroundColor: "#1890ff",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <div
                              style={{
                                padding:
                                  msg.type !== "text" ? "4px" : "10px 14px",
                                backgroundColor: isMine ? "#1890ff" : "#fff",
                                borderRadius: isMine
                                  ? "12px 12px 2px 12px"
                                  : "12px 12px 12px 2px",
                                border: isMine ? "none" : "1px solid #e8e8e8",
                                boxShadow: isMine
                                  ? "none"
                                  : "0 1px 2px rgba(0,0,0,0.05)",
                              }}
                            >
                              {msg.type === "text" && (
                                <Text
                                  style={{
                                    color: isMine ? "#fff" : "#172b4d",
                                    fontSize: 14,
                                    lineHeight: "20px",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {msg.content}
                                </Text>
                              )}

                              {msg.type === "image" && msg.attachment_url && (
                                <div>
                                  {msg.content && (
                                    <Text
                                      style={{
                                        color: isMine ? "#fff" : "#172b4d",
                                        fontSize: 14,
                                        display: "block",
                                        padding: "6px 10px",
                                      }}
                                    >
                                      {msg.content}
                                    </Text>
                                  )}
                                  <img
                                    src={msg.attachment_url}
                                    alt={msg.attachment_name}
                                    style={{
                                      maxWidth: "100%",
                                      width: 400,
                                      borderRadius: 8,
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      window.open(msg.attachment_url!, "_blank")
                                    }
                                  />
                                </div>
                              )}

                              {msg.type === "file" && msg.attachment_url && (
                                <div
                                  style={{
                                    padding: "10px 14px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                  }}
                                >
                                  <FileOutlined
                                    style={{
                                      fontSize: 24,
                                      color: isMine ? "#fff" : "#1890ff",
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <Text
                                      strong
                                      style={{
                                        color: isMine ? "#fff" : "#172b4d",
                                        fontSize: 14,
                                        display: "block",
                                      }}
                                    >
                                      {msg.attachment_name}
                                    </Text>
                                    {msg.attachment_size && (
                                      <Text
                                        style={{
                                          color: isMine
                                            ? "rgba(255,255,255,0.8)"
                                            : "#8c8c8c",
                                          fontSize: 12,
                                        }}
                                      >
                                        {(msg.attachment_size / 1024).toFixed(
                                          1
                                        )}{" "}
                                        KB
                                      </Text>
                                    )}
                                  </div>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() =>
                                      window.open(msg.attachment_url!, "_blank")
                                    }
                                    style={{
                                      color: isMine ? "#fff" : "#1890ff",
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Reactions */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 4,
                                  marginTop: 4,
                                }}
                              >
                                {/* Group reactions by emoji */}
                                {Object.entries(
                                  msg.reactions.reduce((acc, reaction) => {
                                    if (!acc[reaction.emoji]) {
                                      acc[reaction.emoji] = [];
                                    }
                                    acc[reaction.emoji].push(reaction);
                                    return acc;
                                  }, {} as Record<string, typeof msg.reactions>)
                                ).map(([emoji, reactions]) => {
                                  const hasUserReacted = reactions.some(
                                    (r) => r.user.id === user?.id
                                  );
                                  return (
                                    <Badge
                                      key={emoji}
                                      count={reactions.length}
                                      size="small"
                                      style={{
                                        backgroundColor: hasUserReacted
                                          ? "#1890ff"
                                          : "#f0f0f0",
                                        color: hasUserReacted
                                          ? "#fff"
                                          : "#595959",
                                      }}
                                    >
                                      <div
                                        onClick={() => {
                                          if (hasUserReacted) {
                                            handleRemoveReaction(msg.id, emoji);
                                          } else {
                                            handleEmojiClick(msg.id, { emoji });
                                          }
                                        }}
                                        style={{
                                          padding: "2px 8px",
                                          backgroundColor: hasUserReacted
                                            ? "#e6f7ff"
                                            : "#fafafa",
                                          border: `1px solid ${
                                            hasUserReacted
                                              ? "#1890ff"
                                              : "#d9d9d9"
                                          }`,
                                          borderRadius: 12,
                                          cursor: "pointer",
                                          fontSize: 14,
                                          transition: "all 0.2s",
                                        }}
                                      >
                                        {emoji}
                                      </div>
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#8c8c8c",
                                  textAlign: isMine ? "right" : "left",
                                }}
                              >
                                {formatTime(msg.created_at)}
                                {msg.is_edited && " (edited)"}
                              </Text>

                              {/* Emoji Picker Button */}
                              <Popover
                                content={
                                  <div style={{ width: 350 }}>
                                    <EmojiPicker
                                      onEmojiClick={(emojiData) =>
                                        handleEmojiClick(msg.id, emojiData)
                                      }
                                      width="100%"
                                      height={400}
                                    />
                                  </div>
                                }
                                trigger="click"
                                open={emojiPickerVisible === msg.id}
                                onOpenChange={(visible) =>
                                  setEmojiPickerVisible(visible ? msg.id : null)
                                }
                              >
                                <SmileOutlined
                                  style={{
                                    fontSize: 14,
                                    color: "#8c8c8c",
                                    cursor: "pointer",
                                    transition: "color 0.2s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.color = "#1890ff")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.color = "#8c8c8c")
                                  }
                                />
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Space>
              )}
            </div>

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div
                style={{ padding: "0 24px 8px", backgroundColor: "#f9fafb" }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#8c8c8c",
                    fontStyle: "italic",
                  }}
                >
                  Someone is typing...
                </Text>
              </div>
            )}

            {/* Message Input */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e8e8e8",
                backgroundColor: "#fff",
              }}
            >
              {uploadFile && (
                <div
                  style={{
                    marginBottom: 8,
                    padding: "8px 12px",
                    backgroundColor: "#f0f5ff",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space>
                    <FileOutlined style={{ color: "#1890ff" }} />
                    <Text style={{ fontSize: 13 }}>{uploadFile.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </Text>
                  </Space>
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setUploadFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Upload
                  beforeUpload={handleFileSelect}
                  showUploadList={false}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                >
                  <Button
                    icon={<PaperClipOutlined />}
                    style={{ borderRadius: 8 }}
                  />
                </Upload>
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onPressEnter={handleSendMessage}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                  suffix={
                    <SendOutlined
                      onClick={handleSendMessage}
                      style={{
                        color:
                          (messageInput.trim() || uploadFile) && !uploading
                            ? "#1890ff"
                            : "#d9d9d9",
                        cursor:
                          (messageInput.trim() || uploadFile) && !uploading
                            ? "pointer"
                            : "not-allowed",
                        fontSize: 16,
                      }}
                    />
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text type="secondary">
              Select a conversation to start chatting
            </Text>
          </div>
        )}
      </div>

      {/* Group Creation Modal */}
      <Modal
        title="Create New Group"
        open={groupModalVisible}
        onOk={handleCreateGroup}
        onCancel={() => {
          setGroupModalVisible(false);
          setGroupName("");
          setSelectedMembers([]);
        }}
        confirmLoading={creatingGroup}
        okText="Create Group"
        cancelText="Cancel"
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <div>
            <Text strong>Group Name</Text>
            <Input
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ marginTop: 8 }}
              maxLength={50}
            />
          </div>
          <div>
            <Text strong>Add Members</Text>
            <Select
              mode="multiple"
              placeholder="Select members to add"
              value={selectedMembers}
              onChange={setSelectedMembers}
              style={{ width: "100%", marginTop: 8 }}
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label?.toString() ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={otherMembers.map((member) => ({
                label:
                  member.first_name && member.last_name
                    ? `${member.first_name} ${member.last_name} (${member.username})`
                    : member.username,
                value: member.id,
              }))}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              Select at least one member to create a group
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default Chat;
