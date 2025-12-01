import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  Select,
  Tag,
} from "antd";
import {
  ProjectOutlined,
  KeyOutlined,
  MailOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AppContext";
import { projectService } from "../services/project.service";
import { LogoIcon } from "../components/Logo";
import "./ProjectSetup.css";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ProjectFormValues {
  key: string;
  name: string;
  description: string;
  collaborators: string[];
}

const ProjectSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();

  // Auto-generate project key from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const currentKey = form.getFieldValue("key");

    // Only auto-fill if key is empty or matches previous auto-fill pattern
    if (!currentKey || currentKey.length <= 4) {
      const autoKey = name
        .trim()
        .slice(0, 4)
        .toUpperCase()
        .replace(/[^A-Z]/g, "");

      if (autoKey.length >= 2) {
        form.setFieldsValue({ key: autoKey });
      }
    }
  };

  const onFinish = async (values: ProjectFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const project = await projectService.createProject({
        key: values.key.toUpperCase(),
        name: values.name,
        description: values.description,
        lead_username: user?.username,
      });

      // Store current project
      localStorage.setItem("currentProject", JSON.stringify(project));

      // TODO: Send invitation emails to collaborators
      if (values.collaborators && values.collaborators.length > 0) {
        console.log("Sending invitations to:", values.collaborators);
        // This will be implemented when we add the invitation API
      }

      // Navigate to dashboard
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "An error occurred while creating the project");
    } finally {
      setLoading(false);
    }
  };

  const validateProjectKey = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error("Project key is required"));
    }
    if (!/^[A-Z]{2,10}$/.test(value.toUpperCase())) {
      return Promise.reject(new Error("Key must be 2-10 uppercase letters"));
    }
    return Promise.resolve();
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="setup-container">
      <div className="setup-background">
        <div className="setup-card-wrapper">
          <Card className="setup-card">
            <div className="setup-header">
              <div className="logo-section">
                <LogoIcon size={48} />
                <Title level={2} className="app-title">
                  Create Your Project
                </Title>
              </div>
              <Paragraph type="secondary" className="subtitle">
                Set up a new project to organize your tickets and collaborate
                with your team
              </Paragraph>
            </div>

            {error && (
              <Alert
                message={error}
                type="error"
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 24 }}
              />
            )}

            <Form
              form={form}
              name="project-setup"
              onFinish={onFinish}
              layout="vertical"
              className="setup-form"
              initialValues={{ collaborators: [] }}
            >
              <Form.Item
                name="name"
                label="Project Name"
                rules={[
                  { required: true, message: "Please enter a project name" },
                ]}
              >
                <Input
                  prefix={<ProjectOutlined />}
                  placeholder="My First Project"
                  onChange={handleNameChange}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="key"
                label="Project Key"
                rules={[{ validator: validateProjectKey }]}
                tooltip="A short, unique identifier for your project (2-10 uppercase letters). Auto-filled from project name."
                normalize={(value) => value.toUpperCase()}
              >
                <Input
                  prefix={<KeyOutlined />}
                  placeholder="PROJ"
                  maxLength={10}
                  style={{ textTransform: "uppercase" }}
                  size="large"
                />
              </Form.Item>

              <Form.Item name="description" label="Description (Optional)">
                <TextArea
                  placeholder="Describe what this project is about..."
                  rows={3}
                />
              </Form.Item>

              <Form.Item
                name="collaborators"
                label="Invite Collaborators (Optional)"
                tooltip="Enter email addresses to send project invitations"
              >
                <Select
                  mode="tags"
                  placeholder="Enter email addresses and press Enter"
                  onChange={(emails: string[]) => {
                    // Validate emails as they're added
                    const validEmails = emails.filter((email: string) =>
                      validateEmail(email)
                    );
                    if (validEmails.length !== emails.length) {
                      form.setFields([
                        {
                          name: "collaborators",
                          errors: ["Please enter valid email addresses"],
                        },
                      ]);
                    }
                  }}
                  tokenSeparators={[",", " "]}
                  suffixIcon={<MailOutlined />}
                  tagRender={(props) => {
                    const { label, closable, onClose } = props;
                    const isValid = validateEmail(label as string);
                    return (
                      <Tag
                        color={isValid ? "blue" : "red"}
                        closable={closable}
                        onClose={onClose}
                        style={{ marginRight: 3 }}
                      >
                        {label}
                      </Tag>
                    );
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  className="setup-button"
                  icon={<PlusOutlined />}
                >
                  Create Project
                </Button>
              </Form.Item>

              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  You'll be the project lead and can add more collaborators
                  later
                </Text>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectSetup;
