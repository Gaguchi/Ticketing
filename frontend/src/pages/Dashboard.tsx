import React from "react";
import { Row, Col, Card, Statistic, Table, Tag, Progress } from "antd";
import {
  InboxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface TicketData {
  key: string;
  id: string;
  subject: string;
  customer: string;
  status: string;
  urgency: string;
  importance: string;
  assignee: string;
}

const Dashboard: React.FC = () => {
  const columns: ColumnsType<TicketData> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      width: 140,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const colors: Record<string, string> = {
          Open: "blue",
          "In Progress": "orange",
          Resolved: "green",
          Closed: "default",
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: "Urgency",
      dataIndex: "urgency",
      key: "urgency",
      width: 100,
      render: (urgency: string) => {
        const colors: Record<string, string> = {
          Critical: "red",
          High: "orange",
          Medium: "blue",
          Low: "default",
        };
        return <Tag color={colors[urgency]}>{urgency}</Tag>;
      },
    },
    {
      title: "Assignee",
      dataIndex: "assignee",
      key: "assignee",
      width: 120,
    },
  ];

  const recentTickets: TicketData[] = [
    {
      key: "1",
      id: "#T-1001",
      subject: "Cannot login to account",
      customer: "John Doe",
      status: "Open",
      urgency: "Critical",
      importance: "High",
      assignee: "Agent Smith",
    },
    {
      key: "2",
      id: "#T-1002",
      subject: "Email not receiving",
      customer: "Jane Smith",
      status: "In Progress",
      urgency: "High",
      importance: "Medium",
      assignee: "Agent Johnson",
    },
    {
      key: "3",
      id: "#T-1003",
      subject: "Feature request: Dark mode",
      customer: "Bob Wilson",
      status: "Open",
      urgency: "Low",
      importance: "Low",
      assignee: "Unassigned",
    },
    {
      key: "4",
      id: "#T-1004",
      subject: "Payment processing issue",
      customer: "Alice Brown",
      status: "In Progress",
      urgency: "Critical",
      importance: "Critical",
      assignee: "Agent Davis",
    },
    {
      key: "5",
      id: "#T-1005",
      subject: "App crashes on iOS",
      customer: "Charlie Green",
      status: "Resolved",
      urgency: "High",
      importance: "High",
      assignee: "Agent Wilson",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ color: "#8c8c8c", fontSize: 13 }}>
          Welcome back! Here's what's happening with your support today.
        </p>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            bordered
            style={{
              borderRadius: 2,
              border: "1px solid #e8e8e8",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Statistic
              title="Total Tickets"
              value={156}
              prefix={<InboxOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#262626", fontSize: 24, fontWeight: 600 }}
              suffix={
                <span
                  style={{ fontSize: 13, color: "#52c41a", fontWeight: 500 }}
                >
                  <ArrowUpOutlined /> 12%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            bordered
            style={{
              borderRadius: 2,
              border: "1px solid #e8e8e8",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Statistic
              title="Open Tickets"
              value={48}
              prefix={<ClockCircleOutlined style={{ color: "#fa8c16" }} />}
              valueStyle={{ color: "#262626", fontSize: 24, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            bordered
            style={{
              borderRadius: 2,
              border: "1px solid #e8e8e8",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Statistic
              title="Critical"
              value={12}
              prefix={
                <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />
              }
              valueStyle={{ color: "#262626", fontSize: 24, fontWeight: 600 }}
              suffix={
                <span
                  style={{ fontSize: 13, color: "#ff4d4f", fontWeight: 500 }}
                >
                  <ArrowUpOutlined /> 8%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            bordered
            style={{
              borderRadius: 2,
              border: "1px solid #e8e8e8",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Statistic
              title="Resolved Today"
              value={28}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#262626", fontSize: 24, fontWeight: 600 }}
              suffix={
                <span
                  style={{ fontSize: 13, color: "#52c41a", fontWeight: 500 }}
                >
                  <ArrowUpOutlined /> 15%
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Recent Tickets
              </span>
            }
            size="small"
            bordered
            style={{
              borderRadius: 2,
              border: "1px solid #e8e8e8",
            }}
          >
            <Table
              columns={columns}
              dataSource={recentTickets}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                SLA Compliance
              </span>
            }
            size="small"
            bordered
            style={{
              marginBottom: 12,
              borderRadius: 2,
              border: "1px solid #e8e8e8",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: "#595959" }}>
                  First Response
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>85%</span>
              </div>
              <Progress
                percent={85}
                strokeColor="#1890ff"
                showInfo={false}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: "#595959" }}>
                  Resolution Time
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>78%</span>
              </div>
              <Progress
                percent={78}
                strokeColor="#fa8c16"
                showInfo={false}
                size="small"
              />
            </div>
            <div>
              <div
                style={{
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: "#595959" }}>
                  Customer Satisfaction
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>92%</span>
              </div>
              <Progress
                percent={92}
                strokeColor="#52c41a"
                showInfo={false}
                size="small"
              />
            </div>
          </Card>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Team Performance
              </span>
            }
            size="small"
            bordered
            style={{
              borderRadius: 2,
              border: "1px solid #e8e8e8",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 13 }}>Agent Smith</span>
                <span
                  style={{ color: "#52c41a", fontWeight: 600, fontSize: 13 }}
                >
                  24 resolved
                </span>
              </div>
              <Progress
                percent={96}
                strokeColor="#52c41a"
                showInfo={false}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 13 }}>Agent Johnson</span>
                <span
                  style={{ color: "#1890ff", fontWeight: 600, fontSize: 13 }}
                >
                  18 resolved
                </span>
              </div>
              <Progress
                percent={72}
                strokeColor="#1890ff"
                showInfo={false}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 13 }}>Agent Davis</span>
                <span
                  style={{ color: "#fa8c16", fontWeight: 600, fontSize: 13 }}
                >
                  15 resolved
                </span>
              </div>
              <Progress
                percent={60}
                strokeColor="#fa8c16"
                showInfo={false}
                size="small"
              />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 13 }}>Agent Wilson</span>
                <span
                  style={{ color: "#1890ff", fontWeight: 600, fontSize: 13 }}
                >
                  12 resolved
                </span>
              </div>
              <Progress
                percent={48}
                strokeColor="#1890ff"
                showInfo={false}
                size="small"
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
