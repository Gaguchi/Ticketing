/**
 * Accept Invitation Page
 * Public page where users can accept project invitations
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  Button,
  Alert,
  Spin,
  Result,
  Typography,
  Descriptions,
  Tag,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { invitationService } from "../services";
import { useAuth } from "../contexts/AppContext";
import type { CheckInvitationResponse } from "../services";

const { Title, Paragraph, Text } = Typography;

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<CheckInvitationResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await invitationService.checkInvitation(token);
      setInvitation(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load invitation:", err);
      setError(err.response?.data?.error || "Invalid or expired invitation");
      setInvitation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token || !isAuthenticated) {
      navigate(`/login?redirect=/invite/accept?token=${token}`);
      return;
    }

    try {
      setAccepting(true);
      const response = await invitationService.acceptInvitation({ token });

      if (response.success) {
        setSuccess(true);

        // Redirect to the project after 2 seconds
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Failed to accept invitation:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to accept invitation";
      setError(errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    navigate(`/login?redirect=/invite/accept?token=${token}`);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f0f2f5",
        }}
      >
        <Card style={{ maxWidth: 500, width: "100%", margin: 20 }}>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16, color: "#666" }}>
              Loading invitation...
            </Paragraph>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f0f2f5",
        }}
      >
        <Card style={{ maxWidth: 500, width: "100%", margin: 20 }}>
          <Result
            status="success"
            title="Welcome to the Team!"
            subTitle={
              invitation
                ? `You've been added to ${invitation.project_name}`
                : "You have successfully joined the project"
            }
            extra={[
              <Button
                type="primary"
                key="dashboard"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f0f2f5",
        }}
      >
        <Card style={{ maxWidth: 500, width: "100%", margin: 20 }}>
          <Result
            status="error"
            title="Invalid Invitation"
            subTitle={error || "This invitation link is invalid or has expired"}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate("/")}>
                Go Home
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  if (!invitation.valid) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f0f2f5",
        }}
      >
        <Card style={{ maxWidth: 500, width: "100%", margin: 20 }}>
          <Result
            status="warning"
            title="Invitation Expired"
            subTitle={`This invitation is ${invitation.status}. Please contact the project admin for a new invitation.`}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate("/")}>
                Go Home
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
      }}
    >
      <Card style={{ maxWidth: 600, width: "100%", margin: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <TeamOutlined style={{ fontSize: 48, color: "#0052cc" }} />
          <Title level={2} style={{ marginTop: 16, marginBottom: 8 }}>
            You're Invited!
          </Title>
          <Text type="secondary">
            {invitation.invited_by
              ? `${invitation.invited_by} has invited you to join`
              : "You have been invited to join"}
          </Text>
        </div>

        <Descriptions
          bordered
          column={1}
          size="small"
          style={{ marginBottom: 24 }}
        >
          <Descriptions.Item label="Project">
            <Text strong>{invitation.project_name}</Text>
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {invitation.project_key}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color="green">{invitation.role}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Invited Email">
            {invitation.email}
          </Descriptions.Item>
          <Descriptions.Item label="Expires">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {new Date(invitation.expires_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Descriptions.Item>
        </Descriptions>

        {!isAuthenticated && (
          <Alert
            message="Login Required"
            description="You need to be logged in to accept this invitation. Please login or create an account."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {isAuthenticated &&
          user &&
          user.email.toLowerCase() !== invitation.email.toLowerCase() && (
            <Alert
              message="Email Mismatch"
              description={`This invitation was sent to ${invitation.email}, but you're logged in as ${user.email}. Only the invited email can accept this invitation.`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {!isAuthenticated ? (
            <>
              <Button type="primary" size="large" onClick={handleLogin}>
                Login to Accept
              </Button>
              <Button size="large" onClick={() => navigate("/register")}>
                Create Account
              </Button>
            </>
          ) : user &&
            user.email.toLowerCase() === invitation.email.toLowerCase() ? (
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleAccept}
              loading={accepting}
            >
              Accept Invitation
            </Button>
          ) : (
            <Alert
              message="Please login with the invited email address to accept this invitation"
              type="error"
              showIcon
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default AcceptInvitationPage;
