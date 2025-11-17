import React, { useState, useEffect } from "react";
import {
  Modal,
  Typography,
  Tag,
  Space,
  Divider,
  Input,
  List,
  Avatar,
  Spin,
  Empty,
  message,
  Button,
} from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  SendOutlined,
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

const { Title, Text, Paragraph } = Typography;
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
      console.log("Fetched comments data:", data);
      console.log("Comments array:", commentsArray);
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
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : ticket ? (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div>
            <Space wrap>
              <Tag color={getPriorityColor(ticket.priority_id)}>
                {getPriorityLabel(ticket.priority_id)}
              </Tag>
              <Tag color={getStatusColor(ticket.status)}>{ticket.status}</Tag>
              <Tag>{ticket.type}</Tag>
            </Space>
            <Title level={4} style={{ marginTop: 8 }}>
              {ticket.key} - {ticket.name}
            </Title>
          </div>

          {/* Metadata */}
          <Space direction="vertical" size="small">
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <Text type="secondary">Created:</Text>
                <br />
                <Text>{formatDate(ticket.created_at)}</Text>
              </div>
              <div>
                <Text type="secondary">Last Updated:</Text>
                <br />
                <Text>{formatDate(ticket.updated_at)}</Text>
              </div>
              {ticket.assignees &&
                Array.isArray(ticket.assignees) &&
                ticket.assignees.length > 0 && (
                  <div>
                    <Text type="secondary">Assigned To:</Text>
                    <br />
                    <Space>
                      {ticket.assignees.map((assignee) => (
                        <Tag key={assignee.id} icon={<UserOutlined />}>
                          {assignee.first_name || assignee.username}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
            </div>
          </Space>

          <Divider />

          {/* Description */}
          <div>
            <Title level={5}>Description</Title>
            <Paragraph>
              {ticket.description?.replace(/<[^>]*>/g, "") ||
                "No description provided"}
            </Paragraph>
          </div>

          <Divider />

          {/* Comments */}
          <div>
            <Title level={5}>
              Comments ({Array.isArray(comments) ? comments.length : 0})
            </Title>

            {!Array.isArray(comments) || comments.length === 0 ? (
              <Empty description="No comments yet" />
            ) : (
              <List
                dataSource={comments}
                renderItem={(comment) => {
                  const author = comment.user || comment.author;
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={
                          <Space>
                            <Text strong>
                              {author?.first_name && author?.last_name
                                ? `${author.first_name} ${author.last_name}`
                                : author?.username || "Unknown"}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <ClockCircleOutlined />{" "}
                              {formatDate(comment.created_at)}
                            </Text>
                          </Space>
                        }
                        description={comment.content}
                      />
                    </List.Item>
                  );
                }}
              />
            )}

            {/* Add Comment */}
            <div style={{ marginTop: 24 }}>
              <TextArea
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitComment}
                loading={submitting}
                style={{ marginTop: 8 }}
              >
                Add Comment
              </Button>
            </div>
          </div>
        </Space>
      ) : null}
    </Modal>
  );
};

export default TicketDetailModal;
