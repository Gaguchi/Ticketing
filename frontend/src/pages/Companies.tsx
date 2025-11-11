import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Spin,
  message,
  Upload,
  Badge,
} from "antd";
import type { UploadFile } from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ShopOutlined,
  MailOutlined,
  PhoneOutlined,
  PictureOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  TableOutlined,
  SettingOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";
import { debug, LogLevel, LogCategory } from "../utils/debug";
import { useApp } from "../contexts/AppContext";

const { Title, Text } = Typography;

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
  const { selectedProject, projectLoading } = useApp();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  // New state for detailed company view
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyTickets, setCompanyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketViewMode, setTicketViewMode] = useState<
    "table" | "kanban" | "timeline"
  >("table");

  // Prevent duplicate initialization in React Strict Mode
  const fetchInProgressRef = useRef(false);

  const fetchCompanies = useCallback(async () => {
    // Prevent concurrent identical requests
    if (fetchInProgressRef.current) {
      debug.log(
        LogCategory.COMPANY,
        LogLevel.INFO,
        "Fetch already in progress, skipping"
      );
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      debug.log(LogCategory.COMPANY, LogLevel.INFO, "Fetching companies...");

      // Build URL with project filter if selected
      let url = API_ENDPOINTS.COMPANIES;
      if (selectedProject) {
        url = `${url}?project=${selectedProject.id}`;
      }

      const response = await apiService.get<any>(url);
      // API returns paginated response: {count, next, previous, results}
      const companiesData = response.results || response;
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      debug.log(
        LogCategory.COMPANY,
        LogLevel.INFO,
        `Loaded ${
          Array.isArray(companiesData) ? companiesData.length : 0
        } companies${
          selectedProject ? ` for project ${selectedProject.name}` : ""
        }`
      );
      setLoading(false);
    } catch (error: any) {
      message.error(error.message || "Failed to load companies");
      setLoading(false);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [selectedProject]);

  // Fetch companies when project is loaded or changes
  useEffect(() => {
    // Wait for project loading to complete before fetching
    if (projectLoading) {
      debug.log(
        LogCategory.COMPANY,
        LogLevel.INFO,
        "Waiting for project to load..."
      );
      return;
    }

    debug.log(
      LogCategory.COMPANY,
      LogLevel.INFO,
      selectedProject
        ? `Fetching companies for project: ${selectedProject.name}`
        : "Fetching all companies (no project selected)"
    );
    fetchCompanies();
  }, [selectedProject, projectLoading, fetchCompanies]);

  const handleCompanyClick = async (company: Company) => {
    setSelectedCompany(company);
    setLoadingTickets(true);
    try {
      // Fetch tickets for this company
      // Assuming tickets have a company field - adjust API endpoint as needed
      const response = await apiService.get<any>(
        `${API_ENDPOINTS.TICKETS}?company=${company.id}`
      );
      const tickets = response.results || response;
      setCompanyTickets(Array.isArray(tickets) ? tickets : []);
    } catch (error: any) {
      message.error(error.message || "Failed to load company tickets");
      setCompanyTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleBackToList = () => {
    setSelectedCompany(null);
    setCompanyTickets([]);
  };

  const handleCreateCompany = () => {
    setEditingCompany(null);
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
        await apiService.patchFormData(
          API_ENDPOINTS.COMPANY_DETAIL(editingCompany.id),
          formData
        );
        message.success("Company updated successfully");
      } else {
        // Create new company
        await apiService.postFormData(API_ENDPOINTS.COMPANIES, formData);
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

  // ============================================
  // Empty State (Simplified - Design Bible v1.0)
  // ============================================
  const EmptyState = () => (
    <div
      style={{
        padding: 24,
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Empty
        image={<ShopOutlined style={{ fontSize: 64, color: "#9E9E9E" }} />}
        description="No companies yet"
      >
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={handleCreateCompany}
        >
          Create Company
        </Button>
      </Empty>
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

  // Render content based on whether there are companies
  return (
    <>
      {companies.length === 0 ? (
        <EmptyState />
      ) : selectedCompany ? (
        // Detailed Company View
        <div style={{ padding: 24 }}>
          {/* Back Button */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToList}
            style={{ marginBottom: 16 }}
          >
            Back to Companies
          </Button>

          {/* Company Header Card */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={24} align="middle">
              <Col>
                <Avatar
                  size={80}
                  style={{ background: "#1890ff" }}
                  icon={<ShopOutlined />}
                />
              </Col>
              <Col flex={1}>
                <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
                  {selectedCompany.name}
                </Title>
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 16 }}
                >
                  {selectedCompany.description}
                </Text>
                <Space size={16}>
                  <Space>
                    <UserOutlined style={{ color: "#1890ff" }} />
                    <Text>{selectedCompany.admin_count} Admins</Text>
                  </Space>
                  <Space>
                    <TeamOutlined style={{ color: "#52c41a" }} />
                    <Text>{selectedCompany.user_count} Users</Text>
                  </Space>
                  <Space>
                    <ShopOutlined style={{ color: "#9E9E9E" }} />
                    <Text>{selectedCompany.project_count} Projects</Text>
                  </Space>
                  <Space>
                    <MailOutlined style={{ color: "#1565C0" }} />
                    <Text>{companyTickets.length} Tickets</Text>
                  </Space>
                </Space>
              </Col>
              <Col>
                <Space direction="vertical" align="end">
                  {selectedCompany.primary_contact_email && (
                    <Text>
                      <MailOutlined /> {selectedCompany.primary_contact_email}
                    </Text>
                  )}
                  {selectedCompany.phone && (
                    <Text>
                      <PhoneOutlined /> {selectedCompany.phone}
                    </Text>
                  )}
                  <Dropdown
                    menu={{ items: getActionMenu(selectedCompany) }}
                    trigger={["click"]}
                  >
                    <Button icon={<MoreOutlined />}>Actions</Button>
                  </Dropdown>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Tickets Section */}
          <Card
            title={
              <Space>
                <MailOutlined />
                <span>Company Tickets</span>
                <Badge count={companyTickets.length} />
              </Space>
            }
            extra={
              <Space>
                <Button
                  type={ticketViewMode === "table" ? "primary" : "default"}
                  icon={<TableOutlined />}
                  onClick={() => setTicketViewMode("table")}
                >
                  Table
                </Button>
                <Button
                  type={ticketViewMode === "kanban" ? "primary" : "default"}
                  icon={<AppstoreOutlined />}
                  onClick={() => setTicketViewMode("kanban")}
                >
                  Kanban
                </Button>
                <Button
                  type={ticketViewMode === "timeline" ? "primary" : "default"}
                  icon={<CalendarOutlined />}
                  onClick={() => setTicketViewMode("timeline")}
                >
                  Timeline
                </Button>
              </Space>
            }
          >
            {loadingTickets ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <Spin size="large" />
              </div>
            ) : ticketViewMode === "table" ? (
              companyTickets.length === 0 ? (
                <Empty description="No tickets for this company yet" />
              ) : (
                <Table
                  dataSource={companyTickets}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: "Ticket",
                      dataIndex: "name",
                      key: "name",
                    },
                    {
                      title: "Type",
                      dataIndex: "type",
                      key: "type",
                      render: (type: string) => <Tag>{type}</Tag>,
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      key: "status",
                      render: (status: string) => (
                        <Tag color="blue">{status}</Tag>
                      ),
                    },
                    {
                      title: "Priority",
                      dataIndex: "priority",
                      key: "priority",
                      render: (priority: string) => (
                        <Tag
                          color={
                            priority === "High"
                              ? "red"
                              : priority === "Medium"
                              ? "blue"
                              : "green"
                          }
                        >
                          {priority}
                        </Tag>
                      ),
                    },
                    {
                      title: "Assignees",
                      dataIndex: "assignees",
                      key: "assignees",
                      render: (assignees: any[]) => (
                        <Avatar.Group maxCount={3}>
                          {assignees?.map((a: any) => (
                            <Avatar key={a.id}>
                              {a.first_name?.[0]}
                              {a.last_name?.[0]}
                            </Avatar>
                          ))}
                        </Avatar.Group>
                      ),
                    },
                  ]}
                />
              )
            ) : ticketViewMode === "kanban" ? (
              <Empty description="Kanban view coming soon" />
            ) : (
              <Empty description="Timeline view coming soon" />
            )}
          </Card>
        </div>
      ) : (
        // Card Grid View (Default)
        <div style={{ padding: 24 }}>
          {/* Header */}
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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateCompany}
            >
              Create Company
            </Button>
          </div>

          {/* Cards Grid */}
          <Row gutter={[16, 16]}>
            {companies.map((company) => (
              <Col key={company.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  style={{ height: "100%", cursor: "pointer" }}
                  onClick={() => handleCompanyClick(company)}
                  actions={[
                    <EditOutlined
                      key="edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCompany(company);
                      }}
                    />,
                    <SettingOutlined key="settings" />,
                    <div key="more" onClick={(e) => e.stopPropagation()}>
                      <Dropdown
                        menu={{ items: getActionMenu(company) }}
                        trigger={["click"]}
                      >
                        <MoreOutlined />
                      </Dropdown>
                    </div>,
                  ]}
                >
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <Avatar
                      size={64}
                      style={{ background: "#2C3E50" }}
                      icon={<ShopOutlined />}
                    />
                  </div>
                  <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <Title level={5} style={{ marginBottom: 4 }}>
                      {company.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {company.description}
                    </Text>
                  </div>
                  <Space
                    direction="vertical"
                    size={4}
                    style={{ width: "100%" }}
                  >
                    <Space>
                      <TeamOutlined style={{ color: "#9E9E9E" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {company.admin_count} admins, {company.user_count} users
                      </Text>
                    </Space>
                    {company.project_count > 0 && (
                      <Space>
                        <ShopOutlined style={{ color: "#9E9E9E" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {company.project_count} projects
                        </Text>
                      </Space>
                    )}
                    {company.ticket_count > 0 && (
                      <Space>
                        <MailOutlined style={{ color: "#9E9E9E" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {company.ticket_count} tickets
                        </Text>
                      </Space>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

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
        afterOpenChange={(open) => {
          if (open && !editingCompany) {
            form.resetFields();
          }
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
              prefix={<ShopOutlined />}
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
