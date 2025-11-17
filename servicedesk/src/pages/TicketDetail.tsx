import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Card,
  Tag,
  Space,
  Button,
  Input,
  List,
  Avatar,
  Spin,
  Empty,
  Row,
  Col,
  message,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import Navbar from "../components/Navbar";
import { Ticket, Comment } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";
import { formatDate, getPriorityColor, getPriorityLabel, getStatusColor } from "../utils/helpers";

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchComments();
    const cleanDescription =
      ticket.description?.replace(/<[^>]*>/g, "").trim() || "No description provided";

    const infoTiles = [
      { label: "Created", value: formatDate(ticket.created_at) },
      { label: "Updated", value: formatDate(ticket.updated_at) },
      { label: "Due", value: ticket.due_date ? formatDate(ticket.due_date) : "Not set" },
      { label: "Company", value: ticket.company?.name || "—" },
      { label: "Type", value: ticket.type },
      { label: "Comments", value: comments.length.toString() },
    ];

    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Navbar />
        <Content style={{ padding: "24px 48px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/tickets")}
              style={{ marginBottom: 20 }}
            >
              Back to Tickets
            </Button>

            <Space direction="vertical" size={24} style={{ width: "100%" }}>
              <Card bodyStyle={{ padding: 24 }}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <Space wrap size={[8, 8]}>
                    <Tag color={getPriorityColor(ticket.priority_id)}>
                      {getPriorityLabel(ticket.priority_id)}
                    </Tag>
                    <Tag color={getStatusColor(ticket.status)}>{ticket.status}</Tag>
                    <Tag>{ticket.type}</Tag>
                  </Space>
                  <div>
                    <Text type="secondary">{ticket.key}</Text>
                    <Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>
                      {ticket.name}
                    </Title>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {infoTiles.map((tile) => (
                      <div
                        key={tile.label}
                        style={{
                          background: "#f8fafc",
                          borderRadius: 12,
                          padding: "12px 16px",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {tile.label}
                        </Text>
                        <div style={{ marginTop: 4 }}>
                          <Text strong>{tile.value}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </Space>
              </Card>

              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <Card title="Description" bodyStyle={{ padding: 24 }}>
                    <Paragraph style={{ marginBottom: 0 }}>{cleanDescription}</Paragraph>
                  </Card>

                  <Card
                    title={`Comments (${comments.length})`}
                    bodyStyle={{ padding: 0 }}
                    style={{ marginTop: 24 }}
                  >
                    <div style={{ padding: 24 }}>
                      {comments.length === 0 ? (
                        <Empty description="No comments yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <List
                          itemLayout="horizontal"
                          dataSource={comments}
                          renderItem={(comment) => (
                            <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                              <List.Item.Meta
                                avatar={<Avatar icon={<UserOutlined />} />}
                                title={
                                  <Space size={8} wrap>
                                    <Text strong>
                                      {comment.author.first_name && comment.author.last_name
                                        ? `${comment.author.first_name} ${comment.author.last_name}`
                                        : comment.author.username}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                                      {formatDate(comment.created_at)}
                                    </Text>
                                  </Space>
                                }
                                description={<Paragraph style={{ marginBottom: 0 }}>{comment.content}</Paragraph>}
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </div>
                    <div style={{ borderTop: "1px solid #f1f5f9", padding: 24 }}>
                      <TextArea
                        rows={4}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment"
                      />
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSubmitComment}
                        loading={submitting}
                        style={{ marginTop: 12 }}
                      >
                        Add Comment
                      </Button>
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={8}>
                  <Card title="Ticket Details" bodyStyle={{ padding: 24 }}>
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                      <div>
                        <Text type="secondary">Status</Text>
                        <div style={{ marginTop: 4 }}>
                          <Tag color={getStatusColor(ticket.status)}>{ticket.status}</Tag>
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Priority</Text>
                        <div style={{ marginTop: 4 }}>
                          <Tag color={getPriorityColor(ticket.priority_id)}>
                            {getPriorityLabel(ticket.priority_id)}
                          </Tag>
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Company</Text>
                        <div style={{ marginTop: 4 }}>
                          <Text strong>{ticket.company?.name || "Not linked"}</Text>
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Due date</Text>
                        <div style={{ marginTop: 4 }}>
                          <Text strong>
                            {ticket.due_date ? formatDate(ticket.due_date) : "Not set"}
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </Card>

                  <Card title="People" style={{ marginTop: 24 }} bodyStyle={{ padding: 24 }}>
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                      <div>
                        <Text type="secondary">Reporter</Text>
                        <Space size={12} style={{ marginTop: 6 }}>
                          <Avatar icon={<UserOutlined />} />
                          <div>
                            <Text strong>
                              {ticket.reporter?.first_name && ticket.reporter?.last_name
                                ? `${ticket.reporter.first_name} ${ticket.reporter.last_name}`
                                : ticket.reporter?.username}
                            </Text>
                            <Text style={{ display: "block", fontSize: 12, color: "#64748b" }}>
                              {ticket.reporter?.email}
                            </Text>
                          </div>
                        </Space>
                      </div>
                      <div>
                        <Text type="secondary">Assignees</Text>
                        <div style={{ marginTop: 6 }}>
                          {ticket.assignees && ticket.assignees.length > 0 ? (
                            <Space wrap size={8}>
                              {ticket.assignees.map((assignee) => (
                                <Tag key={assignee.id} icon={<UserOutlined />}>
                                  {assignee.first_name || assignee.username}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Text>No assignees yet</Text>
                          )}
                        </div>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Space>
          </div>
        </Content>
      </Layout>
    );
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
                <Title level={5}>Comments ({comments.length})</Title>

                {comments.length === 0 ? (
                  <Empty description="No comments yet" />
                ) : (
                  <List
                    dataSource={comments}
                    renderItem={(comment) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} />}
                          title={
                            <Space>
                              <Text strong>
                                {comment.author.first_name &&
                                comment.author.last_name
                                  ? `${comment.author.first_name} ${comment.author.last_name}`
                                  : comment.author.username}
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
                    )}
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
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default TicketDetail;
