import { useState, useEffect, useRef, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { PageContainer } from "../components/layout";
import { Card, Button, Spinner, Avatar } from "../components/ui";
import { ProgressChain } from "../components/tickets";
import { Ticket, Comment, User } from "../types";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

// Map column names to status keys
function getStatusKey(columnName: string): string {
  const statusMap: Record<string, string> = {
    open: "open",
    "to do": "open",
    "in progress": "in_progress",
    in_progress: "in_progress",
    waiting: "waiting",
    "on hold": "waiting",
    resolved: "resolved",
    done: "resolved",
    closed: "resolved",
  };
  return statusMap[columnName.toLowerCase()] || "open";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUserName(user?: User): string {
  if (!user) return "Unknown";
  return `${user.first_name} ${user.last_name}`.trim() || user.username;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchComments();
    }
  }, [id]);

  useEffect(() => {
    // Scroll to bottom when comments change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const fetchTicket = async () => {
    try {
      const data = await apiService.get<Ticket>(
        API_ENDPOINTS.TICKET_DETAIL(Number(id))
      );
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await apiService.get<
        Comment[] | { results: Comment[]; count?: number }
      >(API_ENDPOINTS.TICKET_COMMENTS(Number(id)));
      // Handle both array and paginated response formats
      const commentList = Array.isArray(data) ? data : data.results || [];
      setComments(commentList);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const comment = await apiService.post<Comment>(
        API_ENDPOINTS.TICKET_COMMENTS(Number(id)),
        {
          content: newMessage.trim(),
        }
      );
      setComments((prev) => [...prev, comment]);
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error || !ticket) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Failed to load ticket
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Link to="/">
            <Button variant="secondary">Back to Tickets</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const statusKey = getStatusKey(ticket.column_name || ticket.status);
  const isResolved = statusKey === "resolved";

  return (
    <PageContainer maxWidth="lg">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Tickets
      </Link>

      {/* Ticket Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span className="font-medium">
            #{ticket.ticket_key || ticket.key}
          </span>
          {ticket.type && (
            <>
              <span>·</span>
              <span>{ticket.type}</span>
            </>
          )}
          {isResolved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-2">
              ✓ Resolved
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {ticket.name}
        </h1>
        <ProgressChain currentStatus={statusKey} />
      </div>

      {/* Ticket Info Card */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Created</p>
            <p className="font-medium text-gray-900">
              {formatDate(ticket.created_at)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Status</p>
            <p className="font-medium text-gray-900 capitalize">
              {ticket.column_name || ticket.status}
            </p>
          </div>
          {ticket.assignees && ticket.assignees.length > 0 && (
            <div>
              <p className="text-gray-500 mb-1">Assigned To</p>
              <p className="font-medium text-gray-900">
                {getUserName(ticket.assignees[0])}
              </p>
            </div>
          )}
          {ticket.due_date && (
            <div>
              <p className="text-gray-500 mb-1">Due Date</p>
              <p className="font-medium text-gray-900">
                {formatDate(ticket.due_date)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Description */}
      {ticket.description && (
        <Card className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            Description
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap">
            {ticket.description}
          </p>
        </Card>
      )}

      {/* Conversation */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Conversation
        </h2>

        <div className="space-y-4 mb-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No messages yet. Start the conversation below.</p>
            </div>
          ) : (
            comments.map((comment) => {
              const author = comment.author || comment.user;
              const isCurrentUser = author?.id === user?.id;

              return (
                <div
                  key={comment.id}
                  className={`flex gap-3 ${
                    isCurrentUser ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar
                    name={getUserName(author)}
                    size="sm"
                    className="flex-shrink-0 mt-1"
                  />
                  <div
                    className={`flex-1 max-w-[80%] ${
                      isCurrentUser ? "text-right" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-medium text-gray-900 ${
                          isCurrentUser ? "order-2" : ""
                        }`}
                      >
                        {isCurrentUser ? "You" : getUserName(author)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <div
                      className={`inline-block rounded-md px-4 py-2 text-left ${
                        isCurrentUser
                          ? "bg-brand-400 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {!isResolved && (
          <form onSubmit={handleSendMessage}>
            <Card padding="sm">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  loading={sending}
                  disabled={!newMessage.trim()}
                >
                  Send
                </Button>
              </div>
            </Card>
          </form>
        )}

        {isResolved && (
          <Card className="bg-gray-50 text-center">
            <p className="text-gray-600">This ticket has been resolved.</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
