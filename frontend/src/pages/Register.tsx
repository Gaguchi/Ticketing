import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AppContext";
import { authService } from "../services/auth.service";
import { Turnstile } from "../components/Turnstile";
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const turnstileEnabled = import.meta.env.VITE_TURNSTILE_ENABLED === "true";

  const onFinish = async (values: RegisterFormValues) => {
    if (turnstileEnabled && turnstileSiteKey && !captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registerData: any = {
        username: values.username,
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        password: values.password,
        password_confirm: values.confirmPassword,
      };

      // Only include captcha_token if CAPTCHA is enabled
      if (turnstileEnabled && captchaToken) {
        registerData.captcha_token = captchaToken;
      }

      console.log("📤 Registration request data:", registerData);

      const response = await authService.register(registerData);

      console.log("✅ Registration response:", response);
      console.log("✅ [Register] User:", response.user.username);
      console.log(
        "✅ [Register] User projects:",
        response.user.projects?.length || 0
      );
      console.log(
        "✅ [Register] User has_projects:",
        response.user.has_projects
      );

      // Update auth context with initial registration response
      login(response.tokens.access, response.user);

      // Immediately fetch fresh user data to get projects
      // The registration response doesn't always include projects, but /auth/me/ does
      console.log("✅ [Register] Fetching fresh user data with projects...");
      const freshUser = await authService.getCurrentUser();
      console.log(
        "✅ [Register] Fresh user projects:",
        freshUser.projects?.length || 0
      );
      console.log(
        "✅ [Register] Fresh user has_projects:",
        freshUser.has_projects
      );

      // Update auth context again with fresh data that includes projects
      login(response.tokens.access, freshUser);

      // Navigate based on whether user has projects
      // Use the freshUser we just fetched instead of making another API call
      if (freshUser.has_projects) {
        console.log("✅ [Register] User has projects, navigating to dashboard");
        navigate("/");
      } else {
        console.log("✅ [Register] User has no projects, navigating to setup");
        navigate("/setup");
      }
    } catch (err: any) {
      console.error("Registration error:", err);

      // Extract detailed error message
      let errorMessage = "An error occurred during registration";

      if (err?.details) {
        // Handle field-specific errors
        const details = err.details;
        if (typeof details === "object") {
          const fieldErrors = [];
          for (const [field, messages] of Object.entries(details)) {
            if (Array.isArray(messages)) {
              fieldErrors.push(`${field}: ${messages.join(", ")}`);
            } else if (typeof messages === "string") {
              fieldErrors.push(`${field}: ${messages}`);
            }
          }
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join("\n");
          }
        } else if (typeof details === "string") {
          errorMessage = details;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setCaptchaToken(null); // Reset captcha on error
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

              {/* Cloudflare Turnstile CAPTCHA */}
              {turnstileEnabled && turnstileSiteKey && (
                <Form.Item style={{ marginBottom: 16 }}>
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    theme="light"
                  />
                </Form.Item>
              )}

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
