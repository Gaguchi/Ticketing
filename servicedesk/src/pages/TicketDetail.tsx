import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Tag,
  Button,
  message,
  Spin,
  Avatar,
  Input,
  Modal,
  Rate,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  PaperClipOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Ticket } from "../types";
import { ChatRoom, ChatMessage } from "../types/chat";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";
import { chatService } from "../services/chat.service";
import { webSocketService } from "../services/websocket.service";
import {
  formatDate,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
} from "../utils/helpers";
import { useAuth } from "../contexts/AuthContext";

const { TextArea } = Input;

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolution Feedback State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"accepted" | "rejected" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Chat State
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsPathRef = useRef<string | null>(null);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (ticket?.id) {
      loadChatRoom();
    }
  }, [ticket?.id]);

  // Connect WebSocket
  useEffect(() => {
    if (!chatRoom?.id) return;

    const wsPath = `ws/chat/${chatRoom.id}/`;
    wsPathRef.current = wsPath;

    const ws = webSocketService.connect(
      wsPath,
      handleWebSocketMessage,
      (error) => console.error("WebSocket error:", error),
      () => {
        // Reconnect logic is handled by service, but we can log user activity
        console.log("Chat connected");
      }
    );

    if (ws) {
      loadMessages();
    }

    return () => {
      if (wsPathRef.current) {
        webSocketService.disconnect(wsPathRef.current);
        wsPathRef.current = null;
      }
    };
  }, [chatRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<Ticket>(
        API_ENDPOINTS.TICKET_DETAIL(Number(id))
      );
      setTicket(data);
    } catch (error: any) {
      message.error("Failed to load ticket details");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadChatRoom = async () => {
    if (!ticket?.id) return;
    try {
      let room = await chatService.getTicketChatRoom(ticket.id);
      if (!room) {
        room = await chatService.createTicketChatRoom(ticket.id);
      }
      setChatRoom(room);
    } catch (err) {
      console.error("Failed to load chat room:", err);
    }
  };

  const loadMessages = async () => {
    if (!chatRoom?.id) return;

    setMessagesLoading(true);
    try {
      const result = await chatService.getMessages(chatRoom.id, { limit: 50 });
      setMessages(result.messages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    // Backend sends 'message_new' with message object in 'message' field
    if (data.type === "message_new" && data.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    } else if (data.type === "message_deleted" && data.message_id) {
      setMessages((prev) => prev.filter((m) => m.id !== data.message_id));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !chatRoom?.id) return;

    try {
      setSending(true);
      await chatService.sendMessage({
        room: chatRoom.id,
        content: newMessage.trim(),
        type: "text",
      });
      setNewMessage("");
      // Message update will come via WebSocket
    } catch (error: any) {
      message.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleResolutionAction = (type: "accepted" | "rejected") => {
    setFeedbackType(type);
    setFeedbackModalOpen(true);
  };

  const submitResolutionFeedback = async () => {
    if (!id || !feedbackType) return;
    if (feedbackType === "rejected" && !feedbackText.trim()) {
      message.warning("Please provide a reason for rejection");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await apiService.post(
        `${API_ENDPOINTS.TICKET_DETAIL(Number(id))}resolve/`,
        {
          action: feedbackType,
          feedback: feedbackText,
          rating: feedbackType === "accepted" ? rating : undefined,
        }
      );
      message.success(
        feedbackType === "accepted"
          ? "Ticket resolved successfully"
          : "Ticket reopened"
      );
      setFeedbackModalOpen(false);
      setFeedbackText("");
      setRating(0);
      fetchTicket();
    } catch (error: any) {
      message.error(error.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-80px)]">
      {/* Back Button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        className="mb-4 hover:bg-slate-100 text-slate-500 font-medium"
      >
        Back to Tickets
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-4">

        {/* Left Sidebar: Ticket Info (3 cols - 25%) */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Header Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {ticket.ticket_key || `#${ticket.id}`}
                </span>
                <Tag
                  color={getStatusColor(ticket.status)}
                  className="m-0 px-2 py-0.5 text-xs rounded font-semibold border-0"
                >
                  {ticket.status}
                </Tag>
              </div>

              <h1 className="text-xl font-bold text-slate-800 leading-snug">
                {ticket.name}
              </h1>

              <div className="flex items-center gap-2">
                <Tag
                  color={getPriorityColor(ticket.priority_id)}
                  className="m-0 border-0 px-2 py-0.5 text-xs rounded font-medium"
                >
                  {getPriorityLabel(ticket.priority_id)}
                </Tag>
              </div>
            </div>

            <Divider className="my-4" />

            {/* Metadata */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Project</span>
                <span className="text-sm font-semibold text-slate-800">{ticket.project_name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Created</span>
                <span className="text-sm text-slate-800">{formatDate(ticket.created_at)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Assignees</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ticket.assignees && ticket.assignees.length > 0 ? (
                    ticket.assignees.map(a => (
                      <div key={a.id} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        <Avatar size={20} className="bg-blue-100 text-blue-600 text-[10px]">
                          {a.first_name?.[0] || a.username[0]}
                        </Avatar>
                        <span className="text-xs font-medium text-slate-700">
                          {a.first_name ? `${a.first_name} ${a.last_name}` : a.username}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400 italic">No assignees</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions / Resolution Status */}
          {ticket.resolution_status === "awaiting_review" && (
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <InfoCircleOutlined className="text-lg text-amber-600" />
                <h3 className="font-bold text-amber-900 text-sm">Review Pending</h3>
              </div>
              <p className="text-amber-800 text-xs mb-4">Please review the proposed resolution.</p>
              <div className="flex gap-2">
                <Button
                  type="text"
                  size="small"
                  className="flex-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleResolutionAction("rejected")}
                >
                  Not Resolved
                </Button>
                <Button
                  type="primary"
                  size="small"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none"
                  onClick={() => handleResolutionAction("accepted")}
                >
                  Accept
                </Button>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Description</h3>
            <div className="prose prose-slate prose-sm max-w-none text-slate-700">
              <p className="whitespace-pre-wrap break-words">
                {ticket.description || <span className="text-slate-400 italic">No description provided.</span>}
              </p>
            </div>
            {ticket.attachment && (
              <a
                href={ticket.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium p-2 bg-blue-50 rounded-lg border border-blue-100 transition-colors"
              >
                <PaperClipOutlined />
                View Attachment
              </a>
            )}
          </div>

          {/* Resolution History */}
          {ticket.resolution_feedbacks && ticket.resolution_feedbacks.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">History</h3>
              <div className="space-y-4">
                {ticket.resolution_feedbacks.map((fb) => (
                  <div key={fb.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <Tag color={fb.feedback_type === 'accepted' ? 'success' : 'error'} className="m-0 rounded border-0 text-[10px] font-bold uppercase px-1.5">
                        {fb.feedback_type}
                      </Tag>
                      <span className="text-[10px] text-slate-400">{formatDate(fb.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2 whitespace-pre-wrap">{fb.feedback || "No comment"}</p>
                    {fb.rating && <Rate disabled defaultValue={fb.rating} className="text-xs text-amber-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chat Panel (9 cols - 75%) */}
        {/* We make this section expansive and central */}
        <div className="lg:col-span-9 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center z-10">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                Discussion
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time collaboration</p>
            </div>
            <div className="flex -space-x-2">
              {/* Avatars of active participants could go here */}
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            {messagesLoading ? (
              <div className="flex justify-center py-10"><Spin /></div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-10 text-slate-400 opacity-60">
                <InfoCircleOutlined className="text-4xl mb-4" />
                <p className="text-base font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation with the team</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.user?.username === user?.username;
                const isSystem = msg.is_system || msg.type === 'system';
                
                // System messages (status/assignment changes)
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
                        <span>{msg.content}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400">{formatTime(msg.created_at)}</span>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-end gap-2 mb-1">
                        {!isMe && (
                          <Avatar size="small" className="bg-slate-200 text-slate-600 text-xs translate-y-1">
                            {msg.user?.first_name?.[0] || msg.user?.username?.[0] || "?"}
                          </Avatar>
                        )}
                        <div className={`
                                  px-5 py-3 text-sm shadow-sm
                                  ${isMe
                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm'}
                               `}>
                          {msg.content}
                        </div>
                      </div>
                      <span className={`text-[10px] text-slate-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'mr-2' : 'ml-8'}`}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-5 bg-white border-t border-slate-200">
            <div className="flex gap-4 items-end max-w-5xl mx-auto">
              <div className="flex-1 relative">
                <TextArea
                  placeholder="Type your message..."
                  autoSize={{ minRows: 1, maxRows: 6 }}
                  className="w-full py-3 px-4 rounded-xl border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:shadow-sm resize-none text-sm transition-all"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                className="h-[46px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 border-none shadow-sm flex-shrink-0"
                onClick={handleSendMessage}
                loading={sending}
                disabled={!newMessage.trim()}
              >
                Send
              </Button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-400">
                Press <kbd className="font-sans border border-slate-200 rounded px-1 bg-slate-50">Enter</kbd> to send
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Resolution Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            {feedbackType === "accepted" ? (
              <CheckCircleOutlined className="text-emerald-500" />
            ) : (
              <CloseCircleOutlined className="text-red-500" />
            )}
            <span className="font-bold">
              {feedbackType === "accepted" ? "Accept Resolution" : "Reject Resolution"}
            </span>
          </div>
        }
        open={feedbackModalOpen}
        onCancel={() => setFeedbackModalOpen(false)}
        onOk={submitResolutionFeedback}
        confirmLoading={submittingFeedback}
        okText="Submit"
        okButtonProps={{
          className: feedbackType === "accepted" ? "bg-emerald-500" : "bg-red-500",
        }}
      >
        <div className="py-4">
          {feedbackType === "accepted" && (
            <div className="mb-6 text-center">
              <p className="text-slate-500 mb-2 font-medium">Rate your experience</p>
              <Rate
                value={rating}
                onChange={setRating}
                className="text-3xl text-amber-500"
              />
            </div>
          )}
          <div className="mb-2">
            <span className="block text-sm font-bold text-slate-700 mb-2">
              {feedbackType === "accepted" ? "Comments (Optional)" : "Reason for Rejection"}
            </span>
            <TextArea
              rows={4}
              value={feedbackText}
              onChange={(e: any) => setFeedbackText(e.target.value)}
              placeholder={
                feedbackType === "accepted"
                  ? "Any additional feedback..."
                  : "Please explain why the resolution isn't satisfactory..."
              }
              className="rounded-lg border-slate-200"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TicketDetail;
