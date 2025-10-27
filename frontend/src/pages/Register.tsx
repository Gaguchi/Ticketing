import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth.service";
import "./Login.css";

const { Title, Text } = Typography;

interface RegisterFormValues {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form] = Form.useForm();

  const onFinish = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.register({
        username: values.username,
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        password: values.password,
      });

      // Update auth context
      login(response.access, response.user);

      // Check if user has existing projects
      try {
        const { projectService } = await import("../services/project.service");
        const projects = await projectService.getProjects();

        // If user has projects, go to dashboard, otherwise go to setup
        if (projects && projects.length > 0) {
          navigate("/");
        } else {
          navigate("/setup");
        }
      } catch (projectError) {
        // If there's an error checking projects, default to setup
        navigate("/setup");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card-wrapper" style={{ maxWidth: 500 }}>
          <Card className="login-card">
            <div className="login-header">
              <div className="logo-section">
                <div className="logo-icon">T</div>
                <Title level={2} className="app-title">
                  Create Account
                </Title>
              </div>
              <Text type="secondary" className="subtitle">
                Get started with Ticketing
              </Text>
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
              name="register"
              onFinish={onFinish}
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: "Please input your username!" },
                  { min: 3, message: "Username must be at least 3 characters" },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Username"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Please input your email!" },
                  { type: "email", message: "Please enter a valid email!" },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Email"
                  autoComplete="email"
                />
              </Form.Item>

              <div style={{ display: "flex", gap: 12 }}>
                <Form.Item
                  name="firstName"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ flex: 1, marginBottom: 16 }}
                >
                  <Input placeholder="First name" autoComplete="given-name" />
                </Form.Item>

                <Form.Item
                  name="lastName"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ flex: 1, marginBottom: 16 }}
                >
                  <Input placeholder="Last name" autoComplete="family-name" />
                </Form.Item>
              </div>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "Please input your password!" },
                  { min: 8, message: "Password must be at least 8 characters" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Please confirm your password!" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Passwords do not match!")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="login-button"
                >
                  Create Account
                </Button>
              </Form.Item>

              <div className="register-section">
                <Text type="secondary">Already have an account? </Text>
                <Link to="/login" className="register-link">
                  Log in
                </Link>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
