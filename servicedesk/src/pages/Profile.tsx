import React from "react";
import { Layout, Typography, Card, Descriptions, Avatar, Space } from "antd";
import { UserOutlined, MailOutlined, IdcardOutlined } from "@ant-design/icons";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";

const { Content } = Layout;
const { Title } = Typography;

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Navbar />
      <Content style={{ padding: "24px 48px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Title level={2}>My Profile</Title>

          <Card>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <Avatar
                  size={100}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#1890ff" }}
                />
              </div>

              <Descriptions bordered column={1}>
                <Descriptions.Item
                  label={
                    <>
                      <IdcardOutlined /> Username
                    </>
                  }
                >
                  {user.username}
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <>
                      <MailOutlined /> Email
                    </>
                  }
                >
                  {user.email}
                </Descriptions.Item>
                <Descriptions.Item label="First Name">
                  {user.first_name || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Last Name">
                  {user.last_name || "—"}
                </Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default Profile;
