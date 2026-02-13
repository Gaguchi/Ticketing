import React from "react";
import { Layout, Avatar, Dropdown, Typography, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { UserOutlined, LogoutOutlined, LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";
import type { MenuProps } from "antd";

const { Header } = Layout;
const { Text } = Typography;

const Navbar: React.FC = () => {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: t('user.profile'),
      onClick: () => navigate("/profile"),
    },
    {
      key: "change-password",
      icon: <LockOutlined />,
      label: t('user.changePassword'),
      onClick: () => navigate("/change-password"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t('user.logout'),
      danger: true,
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: 20,
          fontWeight: "bold",
          cursor: "pointer",
        }}
        onClick={() => navigate("/tickets")}
      >
        {t('appName')}
      </div>

      <LanguageSwitcher />
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <Space style={{ cursor: "pointer" }}>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: "#1890ff" }}
          />
          <Text style={{ color: "white" }}>
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.username}
          </Text>
        </Space>
      </Dropdown>
    </Header>
  );
};

export default Navbar;
