import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert, Result } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { authService } from "../services/auth.service";
import { LogoIcon } from "../components/Logo";
import { useTranslation } from "react-i18next";
import "./Login.css";

const { Title, Text } = Typography;

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    setError(null);

    try {
      await authService.requestPasswordReset(values.email);
      setSubmitted(true);
    } catch (err: any) {
      // The backend always returns 200, but handle network errors
      setError(err?.message || t("msg.error.generic"));
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
                <LogoIcon size={48} />
                <Title level={2} className="app-title">
                  {t("auth.forgotPasswordTitle")}
                </Title>
              </div>
              <Text type="secondary" className="subtitle">
                {t("auth.forgotPasswordSubtitle")}
              </Text>
            </div>

            {submitted ? (
              <>
                <Result
                  status="success"
                  title={t("auth.resetEmailSent")}
                  style={{ padding: "16px 0" }}
                />
                <div className="register-section">
                  <Link to="/login" className="register-link">
                    {t("auth.backToLogin")}
                  </Link>
                </div>
              </>
            ) : (
              <>
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
                  name="forgot-password"
                  onFinish={onFinish}
                  size="large"
                  layout="vertical"
                >
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: t("validation.required") },
                      { type: "email", message: t("validation.email") },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder={t("auth.email")}
                      autoComplete="email"
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
                      {t("auth.sendResetLink")}
                    </Button>
                  </Form.Item>

                  <div className="register-section">
                    <Link to="/login" className="register-link">
                      {t("auth.backToLogin")}
                    </Link>
                  </div>
                </Form>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
