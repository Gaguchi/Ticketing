import React, { useState, useEffect, useRef } from "react";
import { Modal, Tag, Input, Spin, message, Button, Rate, Avatar } from "antd";
import {
  ClockCircleOutlined,
  SendOutlined,
  CloseOutlined,
  MessageOutlined,
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

interface TicketDetailModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: number | null;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  open,
  onClose,
  ticketId,
}) => {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Feedback State for Modal
  const [feedbackView, setFeedbackView] = useState<"none" | "accept" | "reject">("none");
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (open && ticketId) {
      fetchTicket();
      loadChatRoom();
    }
  }, [open, ticketId]);

  useEffect(() => {
    if (!chatRoom?.id || !open) return;

    const wsPath = `ws/chat/${chatRoom.id}/`;
    wsPathRef.current = wsPath;

    const ws = webSocketService.connect(
      wsPath,
      handleWebSocketMessage,
      (error) => console.error("WebSocket error:", error),
      () => console.log("WebSocket connected for modal")
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
  }, [chatRoom?.id, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTicket = async () => {
    if (!ticketId) return;

    try {
      setLoading(true);
      const data = await apiService.get<Ticket>(
        API_ENDPOINTS.TICKET_DETAIL(ticketId)
      );
      setTicket(data);
    } catch (error: any) {
      message.error("Failed to load ticket");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const loadChatRoom = async () => {
    if (!ticketId) return;

    try {
      let room = await chatService.getTicketChatRoom(ticketId);
      if (!room) {
        room = await chatService.createTicketChatRoom(ticketId);
      }
      setChatRoom(room);
    } catch (error) {
      console.error("Failed to load chat room:", error);
    }
  };

  const loadMessages = async () => {
    if (!chatRoom?.id) return;

    setMessagesLoading(true);
    try {
      const result = await chatService.getMessages(chatRoom.id, { limit: 50 });
      setMessages(result.messages);
    } catch (error) {
      console.error("Failed to load messages:", error);
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
    if (!messageText.trim() || submitting || !chatRoom?.id) return;

    try {
      setSubmitting(true);
      await chatService.sendMessage({
        room: chatRoom.id,
        content: messageText.trim(),
        type: "text",
      });
      setMessageText("");
    } catch (error: any) {
      message.error(error.message || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    if (!ticketId || feedbackView === "none") return;
    if (feedbackView === "reject" && !feedbackText.trim()) {
      message.warning("Please provide a reason for rejection");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await apiService.post(
        `${API_ENDPOINTS.TICKET_DETAIL(ticketId)}resolve/`,
        {
          action: feedbackView === "accept" ? "accepted" : "rejected",
          feedback: feedbackText,
          rating: feedbackView === "accept" ? rating : undefined,
        }
      );
      message.success(
        feedbackView === "accept"
          ? "Ticket resolved successfully"
          : "Ticket reopened"
      );
      setFeedbackView("none");
      fetchTicket();
    } catch (error: any) {
      message.error(error.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleClose = () => {
    if (wsPathRef.current) {
      webSocketService.disconnect(wsPathRef.current);
      wsPathRef.current = null;
    }
    setTicket(null);
    setChatRoom(null);
    setMessages([]);
    setMessageText("");
    setFeedbackView("none");
    onClose();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={1200}
      className="rounded-xl overflow-hidden"
      style={{ top: 20, paddingBottom: 0 }}
      styles={{
        content: {
          padding: 0,
          borderRadius: "0.75rem",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F8FAFC", // slate-50
        },
        body: {
          flex: 1,
          overflow: "hidden",
          display: "flex",
        },
      }}
      closeIcon={null}
    >
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spin size="large" />
        </div>
      ) : ticket ? (
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="bg-white px-5 py-3 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {ticket.ticket_key || ticket.key}
              </div>
              <h2 className="text-lg font-bold text-slate-800 truncate" title={ticket.name}>
                {ticket.name}
              </h2>
              <Tag color={getStatusColor(ticket.status)} className="m-0 rounded border-0 text-xs font-semibold px-2">{ticket.status}</Tag>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined className="text-lg" />}
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full w-8 h-8 flex items-center justify-center"
            />
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden h-full">

            {/* LEFT Col: Details (30%) */}
            <div className="w-[30%] min-w-[300px] overflow-y-auto p-4 space-y-4 border-r border-slate-200 bg-white">

              {/* Info Bar */}
              <div className="flex flex-col gap-3 text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide">Created</span>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <ClockCircleOutlined className="text-slate-400" />
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide">Priority</span>
                  <Tag color={getPriorityColor(ticket.priority_id)} className="m-0 border-0 rounded text-xs">{getPriorityLabel(ticket.priority_id)}</Tag>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide">Project</span>
                  <span className="font-medium text-slate-800">{ticket.project_name}</span>
                </div>
              </div>

              {/* Resolution Action */}
              {ticket.resolution_status === "awaiting_review" && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <InfoCircleOutlined className="text-amber-600" />
                    <h3 className="font-bold text-amber-900 text-xs uppercase">Review Required</h3>
                  </div>
                  <p className="text-slate-700 mb-3 text-xs leading-relaxed">Agent marked as resolved. Please review.</p>
                  <div className="flex gap-2">
                    <Button
                      type="text"
                      size="small"
                      className="flex-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setFeedbackView("reject")}
                    >
                      Not Resolved
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none"
                      onClick={() => setFeedbackView("accept")}
                    >
                      Accept
                    </Button>
                  </div>

                  {feedbackView !== "none" && (
                    <div className="mt-3 pt-3 border-t border-amber-200/50">
                      {feedbackView === "accept" && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-amber-900 block mb-1">Rate Service</span>
                          <Rate value={rating} onChange={setRating} className="text-amber-500 text-sm" />
                        </div>
                      )}
                      <TextArea
                        placeholder={feedbackView === "accept" ? "Optional feedback..." : "Reason for rejection..."}
                        rows={2}
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        className="mb-2 bg-white text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="small" onClick={() => setFeedbackView("none")}>Cancel</Button>
                        <Button
                          type="primary"
                          size="small"
                          onClick={submitFeedback}
                          loading={submittingFeedback}
                          className={feedbackView === "accept" ? "bg-emerald-600" : "bg-red-600"}
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                <div className="prose prose-slate max-w-none text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                  {ticket.description || "No description provided."}
                </div>

                {ticket.attachment && (
                  <a
                    href={ticket.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-100"
                  >
                    <PaperClipOutlined />
                    Attachment
                  </a>
                )}
              </div>

              {/* Resolution History */}
              {ticket.resolution_feedbacks && ticket.resolution_feedbacks.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">History</h3>
                  <div className="space-y-3">
                    {ticket.resolution_feedbacks.map(fb => (
                      <div key={fb.id} className="p-3 bg-slate-50 rounded border border-slate-200">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <Tag color={fb.feedback_type === 'accepted' ? 'success' : 'error'} className="m-0 border-0 text-[10px] px-1 font-bold">{fb.feedback_type}</Tag>
                            {fb.rating && <Rate disabled defaultValue={fb.rating} className="text-xs text-amber-500" style={{ fontSize: 10 }} />}
                          </div>
                          <span className="text-[10px] text-slate-400">{formatDate(fb.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">{fb.feedback || "No feedback provided"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT Col: Chat (70%) */}
            <div className="flex-[7] bg-slate-50 flex flex-col min-w-[320px]">
              <div className="p-3 border-b border-slate-200 bg-white z-10 flex justify-between items-center shadow-sm">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 ml-2">
                  <MessageOutlined className="text-blue-500" />
                  Discussion
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8"><Spin size="small" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.user?.username === user?.username;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-end gap-2">
                            {!isMe && (
                              <Avatar size="small" className="bg-slate-200 text-slate-600 text-[10px] mb-1">
                                {msg.user?.first_name?.[0] || msg.user?.username?.[0] || "?"}
                              </Avatar>
                            )}
                            <div className={`
                                  px-4 py-2 text-sm shadow-sm
                                  ${isMe
                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm'}
                                `}>
                              {msg.content}
                            </div>
                          </div>
                          <span className={`text-[10px] text-slate-400 mt-1 px-1 ${isMe ? 'mr-1' : 'ml-8'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-3">
                  <TextArea
                    placeholder="Type a message..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    className="flex-1 py-2.5 px-3 rounded-lg border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 resize-none text-sm"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    className="h-auto rounded-lg px-4 bg-blue-600 hover:bg-blue-700 border-none shadow-sm"
                    onClick={handleSendMessage}
                    loading={submitting}
                    disabled={!messageText.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default TicketDetailModal;
