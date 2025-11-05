import React, { useState, useEffect, useRef } from "react";
import {
  Input,
  Button,
  Avatar,
  List,
  message,
  Spin,
  Empty,
  Tooltip,
  Dropdown,
  Popconfirm,
} from "antd";
import {
  SendOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "../contexts/AppContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import "./TicketComments.css";

dayjs.extend(relativeTime);

const { TextArea } = Input;

// Quick comment suggestions
const QUICK_COMMENTS = [
  { emoji: "👍", text: "Looks good!" },
  { emoji: "👋", text: "Need help?" },
  { emoji: "🚫", text: "This is blocked..." },
  { emoji: "🔍", text: "Can you clarify...?" },
  { emoji: "✅", text: "This is done!" },
  { emoji: "⏰", text: "Working on it..." },
  { emoji: "💡", text: "I have an idea..." },
  { emoji: "🐛", text: "Found a bug..." },
];

export interface Comment {
  id: number;
  ticket: number;
  user: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  content: string;
  created_at: string;
  updated_at: string;
}

interface TicketCommentsProps {
  ticketId: number;
  projectId?: number;
}

export const TicketComments: React.FC<TicketCommentsProps> = ({
  ticketId,
  projectId,
}) => {
  const { user } = useAuth();
  const { sendTicketMessage } = useWebSocketContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Scroll to bottom when new comments arrive
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  // Load comments from API
  useEffect(() => {
    const loadComments = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/tickets/${ticketId}/comments/`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load comments");
        const data = await response.json();
        setComments(data.results || data);
      } catch (error) {
        console.error("Failed to load comments:", error);
        message.error("Failed to load comments");
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      loadComments();
    }
  }, [ticketId]);

  // Listen for WebSocket comment updates
  useEffect(() => {
    if (!projectId) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Handle comment added
        if (
          data.type === "comment_added" &&
          data.comment?.ticket === ticketId
        ) {
          const newCommentData = data.comment;
          setComments((prev) => {
            // Avoid duplicates
            if (prev.some((c) => c.id === newCommentData.id)) {
              return prev;
            }
            return [...prev, newCommentData];
          });
        }

        // Handle comment updated
        if (
          data.type === "comment_updated" &&
          data.comment?.ticket === ticketId
        ) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === data.comment.id ? { ...c, ...data.comment } : c
            )
          );
        }

        // Handle comment deleted
        if (data.type === "comment_deleted" && data.comment_id) {
          setComments((prev) => prev.filter((c) => c.id !== data.comment_id));
        }

        // Handle typing indicators
        if (data.type === "user_typing" && data.ticket_id === ticketId) {
          const username = data.user?.username || "Someone";
          if (username !== user?.username) {
            setTypingUsers((prev) => {
              if (!prev.includes(username)) {
                return [...prev, username];
              }
              return prev;
            });

            // Remove typing indicator after 3 seconds
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u !== username));
            }, 3000);
          }
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    // Subscribe to WebSocket messages
    // Note: This is a simple implementation. In production, you'd use the WebSocket service's subscribe method
    window.addEventListener("message", handleWebSocketMessage);

    return () => {
      window.removeEventListener("message", handleWebSocketMessage);
    };
  }, [ticketId, projectId, user]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      sendTicketMessage({
        type: "typing",
        ticket_id: ticketId,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  // Send new comment
  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    setSending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/tickets/${ticketId}/comments/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            content: newComment.trim(),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send comment");
      const comment = await response.json();

      // Add comment to local state
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      message.success("Comment added!");

      // Send WebSocket notification
      sendTicketMessage({
        type: "comment_added",
        ticket_id: ticketId,
        comment,
      });
    } catch (error) {
      console.error("Failed to send comment:", error);
      message.error("Failed to send comment");
    } finally {
      setSending(false);
    }
  };

  // Edit comment
  const handleEditComment = async (commentId: number) => {
    if (!editingContent.trim()) return;

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/tickets/${ticketId}/comments/${commentId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            content: editingContent.trim(),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update comment");
      const updatedComment = await response.json();

      // Update local state
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updatedComment : c))
      );
      setEditingCommentId(null);
      setEditingContent("");
      message.success("Comment updated!");

      // Send WebSocket notification
      sendTicketMessage({
        type: "comment_updated",
        ticket_id: ticketId,
        comment: updatedComment,
      });
    } catch (error) {
      console.error("Failed to update comment:", error);
      message.error("Failed to update comment");
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/tickets/${ticketId}/comments/${commentId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete comment");

      // Remove from local state
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      message.success("Comment deleted!");

      // Send WebSocket notification
      sendTicketMessage({
        type: "comment_deleted",
        ticket_id: ticketId,
        comment_id: commentId,
      });
    } catch (error) {
      console.error("Failed to delete comment:", error);
      message.error("Failed to delete comment");
    }
  };

  // Get user display name
  const getUserDisplayName = (commentUser: Comment["user"]) => {
    if (commentUser.first_name && commentUser.last_name) {
      return `${commentUser.first_name} ${commentUser.last_name}`;
    }
    return commentUser.username;
  };

  // Get user initials
  const getUserInitials = (commentUser: Comment["user"]) => {
    if (commentUser.first_name && commentUser.last_name) {
      return `${commentUser.first_name[0]}${commentUser.last_name[0]}`.toUpperCase();
    }
    return commentUser.username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="ticket-comments">
      {/* Comments List */}
      <div
        className="comments-list"
        style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "16px" }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "24px" }}>
            <Spin />
          </div>
        ) : comments.length === 0 ? (
          <Empty
            description="No comments yet"
            style={{ padding: "24px" }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={comments}
            renderItem={(comment) => (
              <List.Item
                key={comment.id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #f0f0f0",
                  alignItems: "flex-start",
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: "#2C3E50" }}>
                      {getUserInitials(comment.user)}
                    </Avatar>
                  }
                  title={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: "#172b4d" }}>
                          {getUserDisplayName(comment.user)}
                        </span>
                        <Tooltip
                          title={dayjs(comment.created_at).format(
                            "MMM D, YYYY [at] h:mm A"
                          )}
                        >
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "12px",
                              color: "#9E9E9E",
                            }}
                          >
                            {dayjs(comment.created_at).fromNow()}
                          </span>
                        </Tooltip>
                        {comment.updated_at !== comment.created_at && (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "12px",
                              color: "#9E9E9E",
                            }}
                          >
                            (edited)
                          </span>
                        )}
                      </div>

                      {/* Comment actions (only for comment owner) */}
                      {user && comment.user.id === user.id && (
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: "edit",
                                label: "Edit",
                                icon: <EditOutlined />,
                                onClick: () => {
                                  setEditingCommentId(comment.id);
                                  setEditingContent(comment.content);
                                },
                              },
                              {
                                key: "delete",
                                label: "Delete",
                                icon: <DeleteOutlined />,
                                danger: true,
                                onClick: () => {
                                  // Will use Popconfirm
                                },
                              },
                            ],
                          }}
                          trigger={["click"]}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            style={{ color: "#9E9E9E" }}
                          />
                        </Dropdown>
                      )}
                    </div>
                  }
                  description={
                    editingCommentId === comment.id ? (
                      <div style={{ marginTop: "8px" }}>
                        <TextArea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          style={{ marginBottom: "8px" }}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleEditComment(comment.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingContent("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Popconfirm
                            title="Delete comment?"
                            description="Are you sure you want to delete this comment?"
                            onConfirm={() => handleDeleteComment(comment.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              Delete
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "14px",
                          color: "#172b4d",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {comment.content}
                      </div>
                    )
                  }
                />
              </List.Item>
            )}
          />
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div
          style={{
            fontSize: "12px",
            color: "#9E9E9E",
            fontStyle: "italic",
            marginBottom: "8px",
            paddingLeft: "40px",
          }}
        >
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
          typing...
        </div>
      )}

      {/* Comment Input */}
      <div style={{ display: "flex", gap: "12px" }}>
        <Avatar size={32} style={{ backgroundColor: "#2C3E50", flexShrink: 0 }}>
          {user
            ? getUserInitials({
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
              })
            : "?"}
        </Avatar>
        <div style={{ flex: 1 }}>
          <TextArea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              handleTyping();
            }}
            onPressEnter={(e) => {
              if (e.shiftKey) {
                // Allow new line with Shift+Enter
                return;
              }
              e.preventDefault();
              handleSendComment();
            }}
            placeholder="Add a comment... (Press Enter to send, Shift+Enter for new line)"
            autoSize={{ minRows: 2, maxRows: 10 }}
            style={{
              fontSize: "14px",
              color: "#172b4d",
              border: "1px solid #dfe1e6",
              borderRadius: "3px",
              marginBottom: "8px",
            }}
            disabled={sending}
          />

          {/* Quick Comment Buttons */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "8px",
            }}
          >
            {QUICK_COMMENTS.map((qc, idx) => (
              <Tooltip key={idx} title="Click to use this suggestion">
                <Button
                  size="small"
                  type="text"
                  onClick={() => setNewComment(qc.text)}
                  style={{
                    fontSize: "12px",
                    color: "#9E9E9E",
                    border: "1px solid #dfe1e6",
                    borderRadius: "3px",
                    padding: "2px 8px",
                    height: "auto",
                  }}
                >
                  {qc.emoji} {qc.text}
                </Button>
              </Tooltip>
            ))}
          </div>

          {/* Send Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendComment}
              loading={sending}
              disabled={!newComment.trim() || sending}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
