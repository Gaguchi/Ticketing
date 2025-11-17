import React from "react";
import { Layout, Avatar, Dropdown, Typography, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { UserOutlined, LogoutOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import type { MenuProps } from "antd";

const { Header } = Layout;
const { Text } = Typography;

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    {
      key: "change-password",
      icon: <LockOutlined />,
      label: "Change Password",
      onClick: () => navigate("/change-password"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
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
        Service Desk
      </div>

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
