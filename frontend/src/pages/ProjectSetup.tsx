import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Steps } from 'antd';
import { ProjectOutlined, KeyOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './ProjectSetup.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ProjectFormValues {
  key: string;
  name: string;
  description: string;
  leadUsername: string;
}

const ProjectSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: ProjectFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // TODO: Replace with actual API call
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: values.key.toUpperCase(),
          name: values.name,
          description: values.description,
          lead_username: values.leadUsername,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      const project = await response.json();
      
      // Store current project
      localStorage.setItem('currentProject', JSON.stringify(project));

      // Navigate to dashboard
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the project');
    } finally {
      setLoading(false);
    }
  };

  const validateProjectKey = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Project key is required'));
    }
    if (!/^[A-Z]{2,10}$/.test(value.toUpperCase())) {
      return Promise.reject(new Error('Key must be 2-10 uppercase letters'));
    }
    return Promise.resolve();
  };

  const steps = [
    {
      title: 'Welcome',
      description: 'Let\'s set up your first project',
    },
    {
      title: 'Project Details',
      description: 'Configure your project',
    },
    {
      title: 'Ready',
      description: 'Start managing tickets',
    },
  ];

  return (
    <div className="setup-container">
      <div className="setup-background">
        <div className="setup-card-wrapper">
          <Card className="setup-card">
            <div className="setup-header">
              <div className="logo-section">
                <div className="logo-icon">T</div>
                <Title level={2} className="app-title">Welcome to Ticketing</Title>
              </div>
              <Paragraph type="secondary" className="subtitle">
                Let's get started by creating your first project
              </Paragraph>
            </div>

            <Steps
              current={currentStep}
              items={steps}
              className="setup-steps"
              size="small"
            />

            {error && (
              <Alert
                message={error}
                type="error"
                closable
                onClose={() => setError(null)}
                style={{ marginTop: 24, marginBottom: 24 }}
              />
            )}

            {currentStep === 0 && (
              <div className="welcome-content">
                <div className="feature-list">
                  <div className="feature-item">
                    <ProjectOutlined className="feature-icon" />
                    <div>
                      <Title level={5}>Organize Your Work</Title>
                      <Text type="secondary">
                        Create projects to organize tickets, track progress, and collaborate with your team.
                      </Text>
                    </div>
                  </div>
                  <div className="feature-item">
                    <KeyOutlined className="feature-icon" />
                    <div>
                      <Title level={5}>Unique Project Keys</Title>
                      <Text type="secondary">
                        Each project has a unique key (e.g., "PROJ") used to identify tickets like PROJ-1, PROJ-2.
                      </Text>
                    </div>
                  </div>
                  <div className="feature-item">
                    <UserOutlined className="feature-icon" />
                    <div>
                      <Title level={5}>Team Collaboration</Title>
                      <Text type="secondary">
                        Assign tickets, add comments, track progress, and keep everyone on the same page.
                      </Text>
                    </div>
                  </div>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => setCurrentStep(1)}
                  className="setup-button"
                >
                  Get Started
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <Form
                form={form}
                name="project-setup"
                onFinish={onFinish}
                layout="vertical"
                className="setup-form"
              >
                <Form.Item
                  name="key"
                  label="Project Key"
                  rules={[{ validator: validateProjectKey }]}
                  tooltip="A short, unique identifier for your project (2-10 uppercase letters)"
                  normalize={(value) => value.toUpperCase()}
                >
                  <Input
                    prefix={<KeyOutlined />}
                    placeholder="PROJ"
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>

                <Form.Item
                  name="name"
                  label="Project Name"
                  rules={[{ required: true, message: 'Please enter a project name' }]}
                >
                  <Input
                    prefix={<ProjectOutlined />}
                    placeholder="My First Project"
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Description (Optional)"
                >
                  <TextArea
                    placeholder="Describe what this project is about..."
                    rows={4}
                  />
                </Form.Item>

                <Form.Item
                  name="leadUsername"
                  label="Project Lead (Optional)"
                  tooltip="Username of the person responsible for this project"
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Enter username"
                  />
                </Form.Item>

                <div style={{ display: 'flex', gap: 12 }}>
                  <Button
                    onClick={() => setCurrentStep(0)}
                    style={{ flex: 1 }}
                  >
                    Back
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    style={{ flex: 2 }}
                    className="setup-button"
                  >
                    Create Project
                  </Button>
                </div>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectSetup;
