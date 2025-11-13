import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert, Checkbox } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AppContext";
import { authService } from "../services/auth.service";
import { Turnstile } from "../components/Turnstile";
import "./Login.css";

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const turnstileEnabled = import.meta.env.VITE_TURNSTILE_ENABLED === "true";

  // Clear any invalid tokens when login page loads
  React.useEffect(() => {
    console.log("🧹 [Login] Clearing any existing tokens");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }, []);

  const onFinish = async (values: LoginFormValues) => {
    if (turnstileEnabled && turnstileSiteKey && !captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loginData: any = {
        username: values.username,
        password: values.password,
      };

      // Only include captcha_token if CAPTCHA is enabled
      if (turnstileEnabled && captchaToken) {
        loginData.captcha_token = captchaToken;
      }

      const response = await authService.login(loginData);

      console.log("✅ [Login] Login response:", response);
      console.log("✅ [Login] User:", response.user.username);
      console.log(
        "✅ [Login] User projects:",
        response.user.projects?.length || 0
      );
      console.log("✅ [Login] User has_projects:", response.user.has_projects);

      // Update auth context with initial login response
      login(response.tokens.access, response.user);

      // Immediately fetch fresh user data to get projects
      // The login response doesn't always include projects, but /auth/me/ does
      console.log("✅ [Login] Fetching fresh user data with projects...");
      const freshUser = await authService.getCurrentUser();
      console.log(
        "✅ [Login] Fresh user projects:",
        freshUser.projects?.length || 0
      );
      console.log(
        "✅ [Login] Fresh user has_projects:",
        freshUser.has_projects
      );

      // Update auth context again with fresh data that includes projects
      login(response.tokens.access, freshUser);

      if (values.remember) {
        localStorage.setItem("remember", "true");
      }

      // Navigate based on whether user has projects
      // Use the freshUser we just fetched instead of making another API call
      if (freshUser.has_projects) {
        console.log("✅ [Login] User has projects, navigating to dashboard");
        navigate("/");
      } else {
        console.log("✅ [Login] User has no projects, navigating to setup");
        navigate("/setup");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      // Extract detailed error message
      let errorMessage = "Invalid username or password";

      if (err?.details) {
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
        <div className="login-card-wrapper">
          <Card className="login-card">
            <div className="login-header">
              <div className="logo-section">
                <div className="logo-icon">T</div>
                <Title level={2} className="app-title">
                  Ticketing
                </Title>
              </div>
              <Text type="secondary" className="subtitle">
                Project management inspired by Jira
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
              name="login"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: "Please input your username!" },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Username"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "Please input your password!" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Remember me</Checkbox>
                  </Form.Item>
                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>
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
                  Log in
                </Button>
              </Form.Item>

              <div className="register-section">
                <Text type="secondary">Don't have an account? </Text>
                <Link to="/register" className="register-link">
                  Sign up
                </Link>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
