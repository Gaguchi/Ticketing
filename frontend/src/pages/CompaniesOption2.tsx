import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Input,
  Modal,
  Form,
  Select,
  Empty,
  Dropdown,
  Avatar,
  Row,
  Col,
  Statistic,
  Divider,
  Spin,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  BuildOutlined,
  FileTextOutlined,
  RocketOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface Company {
  id: number;
  name: string;
  description: string;
  ticket_count: number;
  admin_count: number;
  user_count: number;
  project_count: number;
  admins: Array<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  }>;
  users: Array<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  }>;
}

const CompaniesOption2: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // For now, simulating empty state
      setTimeout(() => {
        setCompanies([]);
        setLoading(false);
      }, 500);
    } catch (error) {
      message.error("Failed to load companies");
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    setEditingCompany(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    form.setFieldsValue({
      name: company.name,
      description: company.description,
    });
    setIsModalOpen(true);
  };

  const handleDeleteCompany = (company: Company) => {
    Modal.confirm({
      title: `Delete ${company.name}?`,
      content:
        "This action cannot be undone. All associated data will be removed.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          // TODO: API call to delete
          message.success("Company deleted successfully");
          fetchCompanies();
        } catch (error) {
          message.error("Failed to delete company");
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      await form.validateFields();
      // TODO: API call to create/update
      message.success(
        editingCompany
          ? "Company updated successfully"
          : "Company created successfully"
      );
      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const getActionMenu = (company: Company): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Edit Company",
      onClick: () => handleEditCompany(company),
    },
    {
      key: "manage-admins",
      icon: <UserOutlined />,
      label: "Manage Admins",
    },
    {
      key: "manage-users",
      icon: <TeamOutlined />,
      label: "Manage Users",
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete Company",
      danger: true,
      onClick: () => handleDeleteCompany(company),
    },
  ];

  const columns: ColumnsType<Company> = [
    {
      title: "Company Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Company) => (
        <Space>
          <Avatar
            style={{ background: "#1890ff" }}
            icon={<BuildOutlined />}
            size="small"
          />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            {record.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description.length > 50
                  ? `${record.description.substring(0, 50)}...`
                  : record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => {
        const searchValue = (value as string).toLowerCase();
        return (
          record.name.toLowerCase().includes(searchValue) ||
          (record.description &&
            record.description.toLowerCase().includes(searchValue)) ||
          false
        );
      },
    },
    {
      title: "IT Admins",
      dataIndex: "admin_count",
      key: "admin_count",
      width: 120,
      render: (count: number) => (
        <Space>
          <UserOutlined style={{ color: "#1890ff" }} />
          <Text>{count}</Text>
        </Space>
      ),
    },
    {
      title: "Users",
      dataIndex: "user_count",
      key: "user_count",
      width: 120,
      render: (count: number) => (
        <Space>
          <TeamOutlined style={{ color: "#52c41a" }} />
          <Text>{count}</Text>
        </Space>
      ),
    },
    {
      title: "Projects",
      dataIndex: "project_count",
      key: "project_count",
      width: 120,
      render: (count: number) => (
        <Space>
          <FileTextOutlined style={{ color: "#722ed1" }} />
          <Text>{count}</Text>
        </Space>
      ),
    },
    {
      title: "Tickets",
      dataIndex: "ticket_count",
      key: "ticket_count",
      width: 120,
      render: (count: number) => (
        <Tag color={count > 20 ? "red" : count > 10 ? "orange" : "blue"}>
          {count} tickets
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenu(record) }} trigger={["click"]}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (company.description &&
        company.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  // ============================================
  // DESIGN OPTION 2: Empty State with Quick Setup
  // ============================================
  const EmptyStateOption2 = () => (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <Card
        style={{
          marginTop: 60,
          borderRadius: 12,
          border: "2px dashed #d9d9d9",
        }}
      >
        <Empty
          image={
            <BuildOutlined
              style={{ fontSize: 100, color: "#d9d9d9", marginBottom: 16 }}
            />
          }
          description={
            <div>
              <Title level={3}>No Companies Yet</Title>
              <Paragraph
                style={{ color: "#8c8c8c", maxWidth: 500, margin: "0 auto" }}
              >
                Start managing your IT services for multiple clients by creating
                your first company. Companies help you organize projects,
                tickets, and team members by client.
              </Paragraph>
            </div>
          }
        >
          <Space size="middle">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleCreateCompany}
            >
              Create Company
            </Button>
            <Button size="large" icon={<RocketOutlined />}>
              Watch Tutorial
            </Button>
          </Space>
        </Empty>

        <Divider />

        <div style={{ marginTop: 32 }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            Quick Setup Guide:
          </Title>
          <Row gutter={[24, 24]}>
            <Col span={8}>
              <Card
                size="small"
                bordered={false}
                style={{ background: "#fafafa" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#1890ff",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    fontWeight: "bold",
                  }}
                >
                  1
                </div>
                <Text strong>Create Company</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Add your client organization
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                size="small"
                bordered={false}
                style={{ background: "#fafafa" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#52c41a",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    fontWeight: "bold",
                  }}
                >
                  2
                </div>
                <Text strong>Add Users</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Invite IT admins and client users
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                size="small"
                bordered={false}
                style={{ background: "#fafafa" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#722ed1",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    fontWeight: "bold",
                  }}
                >
                  3
                </div>
                <Text strong>Link Projects</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Associate projects with companies
                </Text>
              </Card>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );

  // ============================================
  // LIST VIEW (With Data)
  // ============================================
  const ListView = () => (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Companies
          </Title>
          <Text type="secondary">
            Manage your client organizations and their teams
          </Text>
        </div>
        <Space>
          <Button.Group>
            <Button
              icon={<UnorderedListOutlined />}
              type={viewMode === "list" ? "primary" : "default"}
              onClick={() => setViewMode("list")}
            />
            <Button
              icon={<AppstoreOutlined />}
              type={viewMode === "grid" ? "primary" : "default"}
              onClick={() => setViewMode("grid")}
            />
          </Button.Group>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateCompany}
          >
            Create Company
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Companies"
              value={companies.length}
              prefix={<BuildOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total IT Admins"
              value={companies.reduce((sum, c) => sum + c.admin_count, 0)}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Users"
              value={companies.reduce((sum, c) => sum + c.user_count, 0)}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Active Tickets"
              value={companies.reduce((sum, c) => sum + c.ticket_count, 0)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <Card style={{ marginBottom: 16 }}>
        <Search
          placeholder="Search companies by name or description..."
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 600 }}
        />
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCompanies}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} companies`,
          }}
        />
      </Card>
    </div>
  );

  // ============================================
  // GRID VIEW (With Data)
  // ============================================
  const GridView = () => (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Companies
          </Title>
          <Text type="secondary">
            Manage your client organizations and their teams
          </Text>
        </div>
        <Space>
          <Search
            placeholder="Search..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button.Group>
            <Button
              icon={<UnorderedListOutlined />}
              type={viewMode === "list" ? "primary" : "default"}
              onClick={() => setViewMode("list")}
            />
            <Button
              icon={<AppstoreOutlined />}
              type={viewMode === "grid" ? "primary" : "default"}
              onClick={() => setViewMode("grid")}
            />
          </Button.Group>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateCompany}
          >
            Create Company
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {filteredCompanies.map((company) => (
          <Col key={company.id} xs={24} sm={12} lg={8} xl={6}>
            <Card
              hoverable
              style={{ height: "100%" }}
              actions={[
                <EditOutlined
                  key="edit"
                  onClick={() => handleEditCompany(company)}
                />,
                <SettingOutlined key="settings" />,
                <Dropdown
                  menu={{ items: getActionMenu(company) }}
                  trigger={["click"]}
                  key="more"
                >
                  <MoreOutlined />
                </Dropdown>,
              ]}
            >
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <Avatar
                  size={64}
                  style={{ background: "#1890ff" }}
                  icon={<BuildOutlined />}
                />
              </div>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <Title level={5} style={{ marginBottom: 4 }}>
                  {company.name}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {company.description}
                </Text>
              </div>
              <Divider style={{ margin: "12px 0" }} />
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Statistic
                    title="Tickets"
                    value={company.ticket_count}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Projects"
                    value={company.project_count}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Admins"
                    value={company.admin_count}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Users"
                    value={company.user_count}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  // ============================================
  // RENDER LOGIC
  // ============================================
  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Show empty state (Design Option 2: Quick Setup Guide)
  if (companies.length === 0) {
    return <EmptyStateOption2 />;
  }

  // Render with data
  return (
    <>
      {viewMode === "list" ? <ListView /> : <GridView />}

      {/* Create/Edit Modal */}
      <Modal
        title={editingCompany ? "Edit Company" : "Create Company"}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => setIsModalOpen(false)}
        okText={editingCompany ? "Update" : "Create"}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="Company Name"
            rules={[{ required: true, message: "Please enter company name" }]}
          >
            <Input
              placeholder="e.g., Acme Corporation"
              size="large"
              prefix={<BuildOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <Input.TextArea
              placeholder="Brief description of the client company..."
              rows={4}
            />
          </Form.Item>

          {!editingCompany && (
            <Form.Item
              name="admin_ids"
              label="Assign IT Admins"
              tooltip="Select IT staff who will manage this company's tickets"
            >
              <Select
                mode="multiple"
                placeholder="Select IT admins..."
                options={[
                  { value: 1, label: "John Doe (john@it.com)" },
                  { value: 2, label: "Jane Smith (jane@it.com)" },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default CompaniesOption2;
