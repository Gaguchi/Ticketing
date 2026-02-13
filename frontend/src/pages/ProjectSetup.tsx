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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
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
        // This will be implemented when we add the invitation API
      }

      // Navigate to dashboard
      navigate("/");
    } catch (err: any) {
      setError(err?.message || t('createProject.msg.failed'));
    } finally {
      setLoading(false);
    }
  };

  const validateProjectKey = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error(tCommon('validation.required')));
    }
    if (!/^[A-Z]{2,10}$/.test(value.toUpperCase())) {
      return Promise.reject(new Error(t('projectKeyHelp')));
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
                  {t('setup.createProject')}
                </Title>
              </div>
              <Paragraph type="secondary" className="subtitle">
                {t('setup.welcome')}
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
                label={t('projectName')}
                rules={[
                  { required: true, message: tCommon('validation.required') },
                ]}
              >
                <Input
                  prefix={<ProjectOutlined />}
                  placeholder={t('projectNamePlaceholder')}
                  onChange={handleNameChange}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="key"
                label={t('projectKey')}
                rules={[{ validator: validateProjectKey }]}
                tooltip={t('setup.keyTooltip')}
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

              <Form.Item name="description" label={t('projectDescription')}>
                <TextArea
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                />
              </Form.Item>

              <Form.Item
                name="collaborators"
                label={t('setup.inviteCollaborators')}
                tooltip={t('setup.inviteTooltip')}
              >
                <Select
                  mode="tags"
                  placeholder={t('setup.emailPlaceholder')}
                  onChange={(emails: string[]) => {
                    // Validate emails as they're added
                    const validEmails = emails.filter((email: string) =>
                      validateEmail(email)
                    );
                    if (validEmails.length !== emails.length) {
                      form.setFields([
                        {
                          name: "collaborators",
                          errors: [tCommon('validation.email')],
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
                  {t('setup.createProject')}
                </Button>
              </Form.Item>

              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('setup.helperText')}
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
