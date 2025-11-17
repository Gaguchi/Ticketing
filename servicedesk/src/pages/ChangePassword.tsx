import React, { useState } from "react";
import { Layout, Typography, Card, Form, Input, Button, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import Navbar from "../components/Navbar";
import { ChangePasswordData } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

const { Content } = Layout;
const { Title } = Typography;

const ChangePassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: ChangePasswordData) => {
    if (values.new_password !== values.confirm_password) {
      message.error("New passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await apiService.post(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, {
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success("Password changed successfully");
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Navbar />
      <Content style={{ padding: "24px 48px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Title level={2}>Change Password</Title>

          <Card>
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                label="Current Password"
                name="old_password"
                rules={[
                  {
                    required: true,
                    message: "Please enter your current password",
                  },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                label="New Password"
                name="new_password"
                rules={[
                  { required: true, message: "Please enter a new password" },
                  { min: 6, message: "Password must be at least 6 characters" },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                label="Confirm New Password"
                name="confirm_password"
                rules={[
                  {
                    required: true,
                    message: "Please confirm your new password",
                  },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Change Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default ChangePassword;
