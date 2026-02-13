import React, { useState } from "react";
import { Layout, Typography, Card, Form, Input, Button, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import { ChangePasswordData } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

const { Content } = Layout;
const { Title } = Typography;

const ChangePassword: React.FC = () => {
  const { t } = useTranslation('auth');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: ChangePasswordData) => {
    if (values.new_password !== values.confirm_password) {
      message.error(t('password.validation.mismatch'));
      return;
    }

    try {
      setLoading(true);
      await apiService.post(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, {
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success(t('password.msg.success'));
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || t('password.msg.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Navbar />
      <Content style={{ padding: "24px 48px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Title level={2}>{t('password.title')}</Title>

          <Card>
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                label={t('password.current')}
                name="old_password"
                rules={[
                  {
                    required: true,
                    message: t('password.validation.current'),
                  },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                label={t('password.new')}
                name="new_password"
                rules={[
                  { required: true, message: t('password.validation.new') },
                  { min: 6, message: t('password.validation.minLength') },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                label={t('password.confirm')}
                name="confirm_password"
                rules={[
                  {
                    required: true,
                    message: t('password.validation.confirm'),
                  },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {t('password.title')}
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
