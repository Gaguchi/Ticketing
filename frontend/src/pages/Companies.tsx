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
  Upload,
} from "antd";
import type { UploadFile } from "antd";
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
  AppstoreOutlined,
  UnorderedListOutlined,
  MailOutlined,
  PhoneOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface Company {
  id: number;
  name: string;
  description: string;
  logo?: string;
  primary_contact_email?: string;
  phone?: string;
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

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await apiService.get<Company[]>(API_ENDPOINTS.COMPANIES);
      setCompanies(response);
      setLoading(false);
    } catch (error: any) {
      message.error(error.message || "Failed to load companies");
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    setEditingCompany(null);
    form.resetFields();
    setFileList([]);
    setIsModalOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    form.setFieldsValue({
      name: company.name,
      description: company.description,
      primary_contact_email: company.primary_contact_email,
      phone: company.phone,
    });
    setFileList([]);
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
          await apiService.delete(API_ENDPOINTS.COMPANY_DETAIL(company.id));
          message.success("Company deleted successfully");
          fetchCompanies();
        } catch (error: any) {
          message.error(error.message || "Failed to delete company");
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      // Prepare form data for file upload
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description);

      if (values.primary_contact_email) {
        formData.append("primary_contact_email", values.primary_contact_email);
      }

      if (values.phone) {
        formData.append("phone", values.phone);
      }

      // Handle logo upload
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append("logo", fileList[0].originFileObj);
      }

      // Handle admin assignments (only for create)
      if (!editingCompany && values.admin_ids && values.admin_ids.length > 0) {
        values.admin_ids.forEach((id: number) => {
          formData.append("admin_ids", id.toString());
        });
      }

      if (editingCompany) {
        // Update existing company
        await fetch(API_ENDPOINTS.COMPANY_DETAIL(editingCompany.id), {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: formData,
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to update company");
          }
          return response.json();
        });
        message.success("Company updated successfully");
      } else {
        // Create new company
        await fetch(API_ENDPOINTS.COMPANIES, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: formData,
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to create company");
          }
          return response.json();
        });
        message.success("Company created successfully");
      }

      setIsModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchCompanies();
    } catch (error: any) {
      console.error("Error:", error);
      if (error.errorFields) {
        // Form validation error
        return;
      }
      message.error(error.message || "Failed to save company");
    } finally {
      setSubmitting(false);
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
      title: "Admins",
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
  // Empty State with Quick Setup Guide
  // ============================================
  const EmptyState = () => (
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
            <Button size="large" icon={<FileTextOutlined />}>
              View Guide
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
                  Invite admins and client users
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
                <Text strong>Organize Work</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Manage tasks by company
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
              title="Total Admins"
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

  // Choose which empty state to show
  if (companies.length === 0) {
    return <EmptyState />;
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
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setFileList([]);
        }}
        okText={editingCompany ? "Update" : "Create"}
        confirmLoading={submitting}
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="primary_contact_email"
                label="Primary Contact Email"
                rules={[
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  placeholder="contact@company.com"
                  prefix={<MailOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input
                  placeholder="+1 (555) 123-4567"
                  prefix={<PhoneOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="logo"
            label="Company Logo"
            tooltip="Upload a logo image for this company (optional)"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={() => false} // Prevent auto upload
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
              maxCount={1}
              accept="image/*"
            >
              {fileList.length === 0 && (
                <div>
                  <PictureOutlined />
                  <div style={{ marginTop: 8 }}>Upload Logo</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          {!editingCompany && (
            <Form.Item
              name="admin_ids"
              label="Assign Admins"
              tooltip="Select staff who will manage this company's tickets"
            >
              <Select
                mode="multiple"
                placeholder="Select admins..."
                prefix={<UserOutlined />}
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

export default Companies;
