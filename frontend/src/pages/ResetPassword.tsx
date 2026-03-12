import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Typography, Alert, Result, Spin } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authService } from "../services/auth.service";
import { LogoIcon } from "../components/Logo";
import { useTranslation } from "react-i18next";
import "./Login.css";

const { Title, Text } = Typography;

type TokenStatus = "validating" | "valid" | "invalid";

const ResetPassword: React.FC = () => {
  const { t } = useTranslation("common");
  const { t: tSettings } = useTranslation("settings");
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("validating");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!uid || !token) {
      setTokenStatus("invalid");
      return;
    }

    const validateToken = async () => {
      try {
        const result = await authService.validateResetToken(uid, token);
        setTokenStatus(result.valid ? "valid" : "invalid");
      } catch {
        setTokenStatus("invalid");
      }
    };

    validateToken();
  }, [uid, token]);

  const onFinish = async (values: { password: string }) => {
    if (!uid || !token) return;

    setLoading(true);
    setError(null);

    try {
      await authService.confirmPasswordReset(uid, token, values.password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      let errorMessage = t("msg.error.generic");

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
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (tokenStatus === "validating") {
      return (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">{t("auth.resetTokenValidating")}</Text>
          </div>
        </div>
      );
    }

    if (tokenStatus === "invalid") {
      return (
        <>
          <Result
            status="error"
            title={t("auth.resetTokenInvalid")}
            style={{ padding: "16px 0" }}
          />
          <div className="register-section">
            <Link to="/forgot-password" className="register-link">
              {t("auth.requestNewReset")}
            </Link>
          </div>
        </>
      );
    }

    if (success) {
      return (
        <>
          <Result
            status="success"
            title={t("auth.resetSuccess")}
            style={{ padding: "16px 0" }}
          />
          <div className="register-section">
            <Link to="/login" className="register-link">
              {t("auth.backToLogin")}
            </Link>
          </div>
        </>
      );
    }

    return (
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
          name="reset-password"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="password"
            rules={[
              { required: true, message: t("validation.required") },
              { min: 8, message: t("validation.minLength", { min: 8 }) },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t("auth.newPassword")}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: t("validation.required") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(tSettings("password.mismatch"))
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t("auth.confirmPassword")}
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
              {t("auth.resetPassword")}
            </Button>
          </Form.Item>

          <div className="register-section">
            <Link to="/login" className="register-link">
              {t("auth.backToLogin")}
            </Link>
          </div>
        </Form>
      </>
    );
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
                  {t("auth.resetPasswordTitle")}
                </Title>
              </div>
              {tokenStatus === "valid" && !success && (
                <Text type="secondary" className="subtitle">
                  {t("auth.resetPasswordSubtitle")}
                </Text>
              )}
            </div>

            {renderContent()}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
