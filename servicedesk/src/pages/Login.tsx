import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

const Login: React.FC = () => {
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      await login(values.username, values.password);
      message.success(t('login.msg.welcome'));
      navigate("/tickets");
    } catch (error: any) {
      message.error(
        error.message || t('login.msg.failed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-slate-900 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>

        <div className="relative z-10 p-12 text-white max-w-lg">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30">
            <span className="text-3xl font-bold">SD</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            {t('login.branding.title')}
          </h1>
          <p className="text-lg text-blue-100 leading-relaxed">
            {t('login.branding.description')}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {t('login.welcome')}
            </h2>
            <p className="text-slate-500">{t('login.subtitle')}</p>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              label={
                <span className="text-slate-700 font-medium">{t('login.username')}</span>
              }
              rules={[
                { required: true, message: t('login.validation.username') },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder={t('login.usernamePlaceholder')}
                className="rounded-lg py-2.5"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={
                <span className="text-slate-700 font-medium">{t('login.password')}</span>
              }
              rules={[
                { required: true, message: t('login.validation.password') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder={t('login.passwordPlaceholder')}
                className="rounded-lg py-2.5"
              />
            </Form.Item>

            <Form.Item className="mb-4">
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="h-12 bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-base font-semibold shadow-md shadow-blue-600/20"
              >
                {t('login.submit')}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {t('login.needHelp')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
