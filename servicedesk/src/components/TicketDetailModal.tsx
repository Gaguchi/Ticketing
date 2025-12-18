import React, { useState, useEffect } from "react";
import { Modal, Tag, Input, Avatar, Spin, Empty, message, Button } from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  SendOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Ticket, Comment } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";
import {
  formatDate,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
} from "../utils/helpers";

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
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && ticketId) {
      fetchTicket();
      fetchComments();
    }
  }, [open, ticketId]);

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

  const fetchComments = async () => {
    if (!ticketId) return;

    try {
      const data = await apiService.get<any>(
        API_ENDPOINTS.TICKET_COMMENTS(ticketId)
      );
      // Handle paginated response from backend
      const commentsArray = data.results || data;
      setComments(Array.isArray(commentsArray) ? commentsArray : []);
    } catch (error: any) {
      console.error("Failed to load comments:", error);
      setComments([]); // Set to empty array on error
    }
  };

  const handleSubmitComment = async () => {
    if (!ticketId || !commentText.trim()) {
      message.warning("Please enter a comment");
      return;
    }

    try {
      setSubmitting(true);
      await apiService.post(API_ENDPOINTS.TICKET_COMMENTS(ticketId), {
        content: commentText,
      });
      message.success("Comment added");
      setCommentText("");
      fetchComments();
    } catch (error: any) {
      message.error(error.message || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setTicket(null);
    setComments([]);
    setCommentText("");
    onClose();
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      className="rounded-xl overflow-hidden"
      style={{ paddingBottom: 0 }}
      styles={{
        content: {
          padding: 0,
          borderRadius: "1rem",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
        wrapper: {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "80px",
        },
      }}
      closeIcon={null}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : ticket ? (
        <div className="flex flex-col h-full">
          {/* Resolution Status Alert */}
          {ticket.resolution_status === "rejected" && (
            <div className="bg-red-50 px-6 py-2 border-b border-red-100 flex items-center gap-2 text-red-700 text-sm">
              <span className="font-bold">Resolution Rejected:</span>{" "}
              {ticket.resolution_feedback}
            </div>
          )}
          {ticket.resolution_status === "awaiting_review" && (
            <div className="bg-amber-50 px-6 py-2 border-b border-amber-100 flex items-center gap-2 text-amber-700 text-sm">
              <span className="font-bold">Action Required:</span> Please review
              the resolution of this ticket.
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-10 shrink-0">
            <div className="flex-1 pr-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {ticket.ticket_key || ticket.key}
                </span>
                <Tag
                  color={getPriorityColor(ticket.priority_id)}
                  className="m-0 border-0"
                >
                  {getPriorityLabel(ticket.priority_id)}
                </Tag>
                <Tag color={getStatusColor(ticket.status)} className="m-0">
                  {ticket.status}
                </Tag>
                <Tag className="m-0 bg-slate-100 text-slate-600 border-slate-200">
                  {ticket.type}
                </Tag>
              </div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">
                {ticket.name}
              </h2>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Created
                  </div>
                  <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <ClockCircleOutlined className="text-slate-400" />
                    {formatDate(ticket.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Last Updated
                  </div>
                  <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <ClockCircleOutlined className="text-slate-400" />
                    {formatDate(ticket.updated_at)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Assigned To
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ticket.assignees && ticket.assignees.length > 0 ? (
                      ticket.assignees.map((assignee) => (
                        <div
                          key={assignee.id}
                          className="flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200"
                        >
                          <UserOutlined className="text-blue-500" />
                          {assignee.first_name || assignee.username}
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400 italic">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                  Description
                </h3>
                <div className="prose prose-slate max-w-none text-slate-600 bg-white">
                  <p className="whitespace-pre-wrap">
                    {ticket.description?.replace(/<[^>]*>/g, "") ||
                      "No description provided"}
                  </p>
                </div>
              </div>

              {/* Resolution Feedback History */}
              {ticket.resolution_feedbacks &&
                ticket.resolution_feedbacks.length > 0 && (
                  <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">
                      Resolution Feedback History
                    </h3>
                    <div className="space-y-4">
                      {ticket.resolution_feedbacks.map((fb) => (
                        <div
                          key={fb.id}
                          className={`p-4 rounded-xl border ${
                            fb.feedback_type === "rejected"
                              ? "bg-red-50 border-red-200"
                              : "bg-green-50 border-green-200"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                fb.feedback_type === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {fb.feedback_type === "rejected"
                                ? "✗ Rejected"
                                : "✓ Accepted"}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDate(fb.created_at)}
                            </span>
                          </div>
                          {fb.rating && (
                            <div className="mb-2">
                              <span className="text-sm text-slate-600">
                                Rating:{" "}
                              </span>
                              <span className="text-amber-500">
                                {"★".repeat(fb.rating)}
                                {"☆".repeat(5 - fb.rating)}
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {fb.feedback || (
                              <span className="text-slate-400 italic">
                                No feedback provided
                              </span>
                            )}
                          </p>
                          {fb.created_by && (
                            <p className="mt-2 text-xs text-slate-400">
                              —{" "}
                              {fb.created_by.first_name
                                ? `${fb.created_by.first_name} ${fb.created_by.last_name}`
                                : fb.created_by.username}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="border-t border-slate-100 pt-8">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">
                  Comments ({Array.isArray(comments) ? comments.length : 0})
                </h3>

                <div className="space-y-6 mb-8">
                  {!Array.isArray(comments) || comments.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No comments yet"
                      />
                    </div>
                  ) : (
                    comments.map((comment) => {
                      const author = comment.user || comment.author;
                      return (
                        <div key={comment.id} className="flex gap-4 group">
                          <Avatar
                            icon={<UserOutlined />}
                            className="bg-blue-100 text-blue-600 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 group-hover:border-slate-200 transition-colors">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-slate-800 text-sm">
                                  {author?.first_name && author?.last_name
                                    ? `${author.first_name} ${author.last_name}`
                                    : author?.username || "Unknown"}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <ClockCircleOutlined />
                                  {formatDate(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-slate-600 text-sm whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer / Comment Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-4">
              <div className="flex-1">
                <TextArea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="rounded-lg resize-none"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                />
              </div>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitComment}
                loading={submitting}
                className="h-auto px-6 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 rounded-lg"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default TicketDetailModal;
