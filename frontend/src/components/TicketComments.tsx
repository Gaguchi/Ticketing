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
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  EnterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "../contexts/AppContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { webSocketService } from "../services/websocket.service";
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
  const commentsListRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Scroll to bottom when new comments arrive
  const scrollToBottom = () => {
    if (commentsListRef.current) {
      commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  // Load comments from API
  useEffect(() => {
    const loadComments = async () => {
      setLoading(true);
      console.log("📖 [TicketComments] Loading comments for ticket:", ticketId);

      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/api/tickets/tickets/${ticketId}/comments/`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );

        console.log(
          "📥 [TicketComments] Load response status:",
          response.status
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ [TicketComments] Load error:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error("Failed to load comments");
        }

        const data = await response.json();
        const commentsList = data.results || data;
        console.log(
          "✅ [TicketComments] Loaded comments:",
          commentsList.length,
          "comments"
        );
        setComments(commentsList);
      } catch (error) {
        console.error("❌ [TicketComments] Failed to load comments:", error);
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

    const path = `ws/projects/${projectId}/tickets/`;

    const handleWebSocketMessage = (data: any) => {
      try {
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
        console.error("Failed to process WebSocket message:", error);
      }
    };

    // Subscribe to WebSocket messages
    const unsubscribe = webSocketService.subscribe(
      path,
      handleWebSocketMessage
    );

    return () => {
      unsubscribe();
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

    console.log("💬 [TicketComments] Sending comment:", {
      ticketId,
      content: newComment,
      url: `${
        import.meta.env.VITE_API_BASE_URL
      }/api/tickets/tickets/${ticketId}/comments/`,
      hasToken: !!localStorage.getItem("access_token"),
    });

    setSending(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/tickets/tickets/${ticketId}/comments/`,
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

      console.log("📥 [TicketComments] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [TicketComments] Error response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Failed to send comment: ${response.status}`);
      }

      const comment = await response.json();
      console.log("✅ [TicketComments] Comment created successfully:", comment);

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
      console.error("❌ [TicketComments] Failed to send comment:", error);
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
        }/api/tickets/tickets/${ticketId}/comments/${commentId}/`,
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
        }/api/tickets/tickets/${ticketId}/comments/${commentId}/`,
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
      {/* Comment Input - Moved to top */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
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
          {/* Quick Comment Suggestions */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
              flexWrap: "wrap",
            }}
          >
            {QUICK_COMMENTS.map((qc, idx) => (
              <Tooltip key={idx} title="Click to use this suggestion">
                <Button
                  size="small"
                  onClick={() => setNewComment(qc.text)}
                  className="quick-comment-btn"
                  style={{
                    fontSize: "12px",
                    height: "28px",
                    padding: "0 12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "6px",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#4096ff";
                    e.currentTarget.style.backgroundColor = "#f0f7ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#dfe1e6";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {qc.emoji} {qc.text}
                </Button>
              </Tooltip>
            ))}
          </div>

          <div style={{ position: "relative" }}>
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
              autoSize={{ minRows: 2, maxRows: 6 }}
              style={{
                fontSize: "14px",
                color: "#172b4d",
                border: "2px solid #dfe1e6",
                borderRadius: "8px",
                paddingRight: "40px",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#4096ff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#dfe1e6";
              }}
              disabled={sending}
            />
            {/* Enter icon hint */}
            <Tooltip title="Press Enter to send">
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "8px",
                  color: "#9E9E9E",
                  fontSize: "16px",
                  pointerEvents: "none",
                  opacity: newComment.trim() ? 1 : 0.5,
                  transition: "opacity 0.3s",
                }}
              >
                <EnterOutlined />
              </div>
            </Tooltip>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "8px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#9E9E9E" }}>
              <kbd
                style={{
                  padding: "2px 6px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f5f5f5",
                  fontSize: "11px",
                }}
              >
                Enter
              </kbd>{" "}
              to send,{" "}
              <kbd
                style={{
                  padding: "2px 6px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f5f5f5",
                  fontSize: "11px",
                }}
              >
                Shift+Enter
              </kbd>{" "}
              for new line
            </span>
            <Button
              type="primary"
              onClick={handleSendComment}
              disabled={!newComment.trim() || sending}
              loading={sending}
              style={{
                boxShadow: newComment.trim()
                  ? "0 2px 4px rgba(64, 150, 255, 0.3)"
                  : "none",
              }}
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div
          style={{
            fontSize: "12px",
            color: "#9E9E9E",
            fontStyle: "italic",
            marginBottom: "12px",
            paddingLeft: "44px",
          }}
        >
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
          typing...
        </div>
      )}

      {/* Comments List */}
      <div
        className="comments-list"
        ref={commentsListRef}
        style={{ maxHeight: "400px", overflowY: "auto" }}
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
                  padding: "0",
                  border: "none",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    gap: "12px",
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #f0f0f0",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0, 0, 0, 0.08)";
                    e.currentTarget.style.borderColor = "#e6e6e6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 1px 2px rgba(0, 0, 0, 0.04)";
                    e.currentTarget.style.borderColor = "#f0f0f0";
                  }}
                >
                  {/* Avatar */}
                  <Avatar
                    size={40}
                    style={{
                      backgroundColor: "#4096ff",
                      flexShrink: 0,
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {getUserInitials(comment.user)}
                  </Avatar>

                  {/* Comment Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#172b4d",
                            fontSize: "14px",
                          }}
                        >
                          {getUserDisplayName(comment.user)}
                        </span>
                        <Tooltip
                          title={dayjs(comment.created_at).format(
                            "MMM D, YYYY [at] h:mm A"
                          )}
                        >
                          <span
                            style={{
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
                              fontSize: "11px",
                              color: "#9E9E9E",
                              backgroundColor: "#f5f5f5",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            edited
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
                            style={{
                              color: "#9E9E9E",
                              opacity: 0.6,
                              transition: "opacity 0.3s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = "0.6";
                            }}
                          />
                        </Dropdown>
                      )}
                    </div>

                    {/* Comment Body */}
                    {editingCommentId === comment.id ? (
                      <div style={{ marginTop: "8px" }}>
                        <TextArea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          style={{
                            marginBottom: "8px",
                            borderRadius: "8px",
                            border: "2px solid #4096ff",
                          }}
                          autoFocus
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleEditComment(comment.id)}
                            style={{ borderRadius: "6px" }}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingContent("");
                            }}
                            style={{ borderRadius: "6px" }}
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
                              style={{ borderRadius: "6px" }}
                            >
                              Delete
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#172b4d",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: "1.6",
                          backgroundColor: "#fafbfc",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #f0f0f0",
                        }}
                      >
                        {comment.content}
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};
