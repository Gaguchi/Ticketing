import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Input,
    Avatar,
    Button,
    message as antMessage,
    Spin,
    Upload,
    Popover,
    Empty,
    Typography,
    Tooltip,
    List,
    Select,
    Divider,
    Space,
    Popconfirm
} from "antd";
import {
    SendOutlined,
    PaperClipOutlined,
    SmileOutlined,
    MessageOutlined,
    UserAddOutlined,
    TeamOutlined,
    DeleteOutlined
} from "@ant-design/icons";
import EmojiPicker from "emoji-picker-react";
import { chatService } from "../services/chat.service";
import { webSocketService } from "../services/websocket.service";
import { userService } from "../services/user.service";
import type { ChatRoom, ChatMessage, ChatWebSocketEvent } from "../types/chat";
import type { Ticket, User } from "../types/api";
import { useAuth } from "../contexts/AppContext";
import "./TicketChatPanel.css";

const { Text } = Typography;
const { Option } = Select;

interface TicketChatPanelProps {
    ticket: Ticket;
    onChatCreated?: () => void;
}

export const TicketChatPanel: React.FC<TicketChatPanelProps> = ({
    ticket,
    onChatCreated,
}) => {
    const { user } = useAuth();
    const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [messageCursor, setMessageCursor] = useState<number | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    // Participants State
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [participantsLoading, setParticipantsLoading] = useState(false);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const isNearBottomRef = useRef(true);

    // Check if user can create chat (is assignee or admin)
    const canCreateChat = ticket.assignees?.some((a: any) => a.id === user?.id) ||
        user?.is_superuser;

    // Load chat room for ticket
    useEffect(() => {
        if (!ticket?.id) return;

        const loadChatRoom = async () => {
            try {
                setLoading(true);
                const room = await chatService.getTicketChatRoom(ticket.id);
                setChatRoom(room);
            } catch (error) {
                console.error("Failed to load chat room:", error);
            } finally {
                setLoading(false);
            }
        };

        loadChatRoom();
    }, [ticket?.id]);

    // Load available users when opening add participant
    useEffect(() => {
        if (participantsOpen && availableUsers.length === 0) {
            userService.getAllUsers().then(setAvailableUsers).catch(console.error);
        }
    }, [participantsOpen]);

    // Load messages when chat room is available
    useEffect(() => {
        if (!chatRoom) return;

        const loadMessages = async () => {
            try {
                setMessagesLoading(true);
                setMessages([]);
                setHasMoreMessages(false);
                setMessageCursor(null);
                isNearBottomRef.current = true;

                const result = await chatService.getMessages(chatRoom.id, { limit: 50 });
                setMessages(result.messages);
                setHasMoreMessages(result.hasMore);
                setMessageCursor(result.cursor);

                // Mark as read
                await chatService.markRoomAsRead(chatRoom.id);
            } catch (error) {
                console.error("Failed to load messages:", error);
            } finally {
                setMessagesLoading(false);
            }
        };

        loadMessages();
    }, [chatRoom?.id]);

    // WebSocket connection
    useEffect(() => {
        if (!chatRoom || !user) return;

        const wsUrl = `ws/chat/${chatRoom.id}/`;

        const onMessage = (event: ChatWebSocketEvent) => {
            switch (event.type) {
                case "message_new":
                    if (event.message.user.id !== user?.id) {
                        setMessages((prev) => [...prev, event.message]);
                        if (isNearBottomRef.current && messagesContainerRef.current) {
                            messagesContainerRef.current.scrollTop = 0;
                        }
                    }
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
            }
        };

        const onError = (error: Event) => {
            console.error("WebSocket error:", error);
        };

        const onClose = () => {
            // Handle reconnection if needed
        };

        setTimeout(() => {
            webSocketService.connect(wsUrl, onMessage, onError, onClose);
            const ws = (webSocketService as any).connections;
            if (ws && ws[wsUrl]) {
                wsRef.current = ws[wsUrl];
            }
        }, 100);

        return () => {
            webSocketService.disconnect(wsUrl);
            wsRef.current = null;
        };
    }, [chatRoom?.id, user?.id]);

    const refreshChatRoom = async () => {
        if (!ticket.id) return;
        try {
            const room = await chatService.getTicketChatRoom(ticket.id);
            setChatRoom(room);
        } catch (error) {
            console.error("Failed to refresh chat room", error);
        }
    };

    // Scroll handler
    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        const { scrollTop } = messagesContainerRef.current;
        isNearBottomRef.current = Math.abs(scrollTop) < 150;
    }, []);

    // Load older messages
    const loadOlderMessages = useCallback(async () => {
        if (!chatRoom || loadingOlder || !hasMoreMessages || !messageCursor) return;

        setLoadingOlder(true);
        try {
            const result = await chatService.getMessages(chatRoom.id, {
                limit: 50,
                before: messageCursor,
            });
            setMessages((prev) => [...result.messages, ...prev]);
            setHasMoreMessages(result.hasMore);
            setMessageCursor(result.cursor);
        } catch (error) {
            console.error("Failed to load older messages:", error);
        } finally {
            setLoadingOlder(false);
        }
    }, [chatRoom, loadingOlder, hasMoreMessages, messageCursor]);

    // Send message
    const handleSendMessage = async () => {
        if ((!messageInput.trim() && !uploadFile) || !chatRoom) return;

        try {
            const content = messageInput.trim();
            setMessageInput("");
            setUploading(true);

            const newMessage = await chatService.sendMessage({
                room: chatRoom.id,
                content: content || "File attachment",
                type: uploadFile
                    ? uploadFile.type.startsWith("image/")
                        ? "image"
                        : "file"
                    : "text",
                attachment: uploadFile || undefined,
            });

            setMessages((prev) => [...prev, newMessage]);

            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = 0;
            }

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
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            antMessage.error("File size must be less than 10MB");
            return false;
        }
        setUploadFile(file);
        return false;
    };

    // Create chat room
    const handleCreateChat = async () => {
        try {
            setCreating(true);
            const room = await chatService.createTicketChatRoom(ticket.id);
            setChatRoom(room);
            onChatCreated?.();
            antMessage.success("Chat room created");
        } catch (error: any) {
            console.error("Failed to create chat:", error);
            antMessage.error(error?.response?.data?.error || "Failed to create chat room");
        } finally {
            setCreating(false);
        }
    };

    // Participant Management
    const handleAddParticipant = async () => {
        if (!chatRoom || !selectedUserId) return;
        setParticipantsLoading(true);
        try {
            await chatService.addParticipant(chatRoom.id, selectedUserId);
            antMessage.success("User added to chat");
            setSelectedUserId(null);
            setAddingParticipant(false);
            // Refresh room to get updated participants
            await refreshChatRoom();
        } catch (error) {
            antMessage.error("Failed to add participant");
        } finally {
            setParticipantsLoading(false);
        }
    };

    const handleRemoveParticipant = async (userId: number) => {
        if (!chatRoom) return;
        setParticipantsLoading(true);
        try {
            await chatService.removeParticipant(chatRoom.id, userId);
            antMessage.success("User removed from chat");
            await refreshChatRoom();
        } catch (error) {
            antMessage.error("Failed to remove participant");
        } finally {
            setParticipantsLoading(false);
        }
    };

    // Format time
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString();
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups: { [key: string]: ChatMessage[] }, message) => {
        const date = formatDate(message.created_at);
        if (!groups[date]) groups[date] = [];
        groups[date].push(message);
        return groups;
    }, {});

    // Render Participants List
    const renderParticipantsContent = () => {
        const canManage = user?.id === chatRoom?.created_by || user?.is_superuser;
        const currentParticipants = chatRoom?.participants || [];

        return (
            <div style={{ width: 300, padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text strong>Participants ({currentParticipants.length})</Text>
                </div>

                <List
                    itemLayout="horizontal"
                    dataSource={currentParticipants}
                    renderItem={(p: any) => (
                        <List.Item
                            actions={
                                canManage && p.user.id !== user?.id ? [
                                    <Popconfirm title="Remove user?" onConfirm={() => handleRemoveParticipant(p.user.id)}>
                                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                ] : []
                            }
                        >
                            <List.Item.Meta
                                avatar={<Avatar>{p.user.username[0]}</Avatar>}
                                title={p.user.display_name || p.user.username}
                                description={p.user.email}
                            />
                        </List.Item>
                    )}
                />

                <Divider style={{ margin: '12px 0' }} />

                {addingParticipant ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Select
                            showSearch
                            placeholder="Select user"
                            style={{ width: '100%' }}
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                            onChange={setSelectedUserId}
                            value={selectedUserId}
                        >
                            {availableUsers
                                .filter(u => !currentParticipants.some((p: any) => p.user.id === u.id))
                                .map(u => (
                                    <Option key={u.id} value={u.id}>{u.username}</Option>
                                ))
                            }
                        </Select>
                        <Space>
                            <Button type="primary" size="small" onClick={handleAddParticipant} loading={participantsLoading}>Add</Button>
                            <Button size="small" onClick={() => setAddingParticipant(false)}>Cancel</Button>
                        </Space>
                    </Space>
                ) : (
                    <Button type="dashed" block icon={<UserAddOutlined />} onClick={() => setAddingParticipant(true)}>
                        Add Participant
                    </Button>
                )}
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="ticket-chat-panel ticket-chat-loading">
                <Spin />
            </div>
        );
    }

    // No chat room exists - show create option
    if (!chatRoom) {
        return (
            <div className="ticket-chat-panel ticket-chat-empty">
                <Empty
                    image={<MessageOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                    description={
                        <div>
                            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                                No chat room for this ticket yet
                            </Text>
                            {canCreateChat ? (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Create a chat to communicate with the team
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    A chat room will be created when assigned
                                </Text>
                            )}
                        </div>
                    }
                >
                    {canCreateChat && (
                        <Button
                            type="primary"
                            icon={<UserAddOutlined />}
                            onClick={handleCreateChat}
                            loading={creating}
                        >
                            Create Chat
                        </Button>
                    )}
                </Empty>
            </div>
        );
    }

    // Chat room exists - show chat
    return (
        <div className="ticket-chat-panel">
            {/* Chat Header */}
            <div className="ticket-chat-header">
                <div>
                    <Text strong>Ticket Chat</Text>
                </div>
                <div>
                    <Popover
                        content={renderParticipantsContent()}
                        title={null}
                        trigger="click"
                        open={participantsOpen}
                        onOpenChange={setParticipantsOpen}
                        placement="bottomRight"
                    >
                        <Tooltip title="Participants">
                            <Button type="text" icon={<TeamOutlined />} size="small">
                                {chatRoom.participants?.length || 0}
                            </Button>
                        </Tooltip>
                    </Popover>
                </div>
            </div>

            {/* Messages */}
            <div
                className="ticket-chat-messages"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {messagesLoading ? (
                    <div className="ticket-chat-loading">
                        <Spin />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="ticket-chat-no-messages">
                        <Text type="secondary">No messages yet. Start the conversation!</Text>
                    </div>
                ) : (
                    <div className="ticket-chat-messages-inner">
                        {/* Load more button */}
                        {hasMoreMessages && (
                            <div className="ticket-chat-load-more">
                                <Button
                                    size="small"
                                    onClick={loadOlderMessages}
                                    loading={loadingOlder}
                                >
                                    Load older messages
                                </Button>
                            </div>
                        )}

                        {/* Messages grouped by date */}
                        {Object.entries(groupedMessages).map(([date, msgs]) => (
                            <div key={date}>
                                <div className="ticket-chat-date-divider">
                                    <span>{date}</span>
                                </div>
                                {msgs.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`ticket-chat-message ${msg.user.id === user?.id ? "own" : ""
                                            }`}
                                    >
                                        {msg.user.id !== user?.id && (
                                            <Avatar size={32} style={{ backgroundColor: "#1890ff" }}>
                                                {msg.user.first_name?.[0] || msg.user.username[0]}
                                            </Avatar>
                                        )}
                                        <div className="ticket-chat-message-content">
                                            {msg.user.id !== user?.id && (
                                                <Text className="ticket-chat-message-author">
                                                    {msg.user.display_name || msg.user.username}
                                                </Text>
                                            )}
                                            <div className="ticket-chat-message-bubble">
                                                {msg.content}
                                                {msg.attachment_url && (
                                                    <div className="ticket-chat-attachment">
                                                        {msg.type === "image" ? (
                                                            <img
                                                                src={msg.attachment_url}
                                                                alt="attachment"
                                                                style={{ maxWidth: 200, borderRadius: 4 }}
                                                            />
                                                        ) : (
                                                            <a
                                                                href={msg.attachment_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                📎 {msg.attachment_name || "Download file"}
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <Text className="ticket-chat-message-time">
                                                {formatTime(msg.created_at)}
                                            </Text>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="ticket-chat-input">
                {uploadFile && (
                    <div className="ticket-chat-upload-preview">
                        <Text ellipsis style={{ flex: 1 }}>
                            📎 {uploadFile.name}
                        </Text>
                        <Button
                            size="small"
                            type="text"
                            onClick={() => setUploadFile(null)}
                        >
                            ✕
                        </Button>
                    </div>
                )}
                <div className="ticket-chat-input-row">
                    <Upload
                        showUploadList={false}
                        beforeUpload={handleFileSelect}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    >
                        <Button icon={<PaperClipOutlined />} type="text" />
                    </Upload>
                    <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onPressEnter={(e) => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        disabled={uploading}
                    />
                    <Popover
                        content={
                            <EmojiPicker
                                onEmojiClick={(emoji) => {
                                    setMessageInput((prev) => prev + emoji.emoji);
                                    setEmojiPickerVisible(false);
                                }}
                            />
                        }
                        trigger="click"
                        open={emojiPickerVisible}
                        onOpenChange={setEmojiPickerVisible}
                    >
                        <Button icon={<SmileOutlined />} type="text" />
                    </Popover>
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSendMessage}
                        loading={uploading}
                        disabled={!messageInput.trim() && !uploadFile}
                    />
                </div>
            </div>
        </div>
    );
};

export default TicketChatPanel;
