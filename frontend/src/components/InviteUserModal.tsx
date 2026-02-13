/**
 * Invite User Modal
 * Modal for adding existing users to a project by email
 */

import React, { useState } from "react";
import { Modal, Form, Input, Select, message, Alert } from "antd";
import { invitationService } from "../services";
import type { SendInvitationRequest } from "../services";

const { Option } = Select;

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onSuccess?: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  open,
  onClose,
  projectId,
  projectName,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { email: string; role: string }) => {
    setLoading(true);

    try {
      const requestData: SendInvitationRequest = {
        project_id: projectId,
        email: values.email,
        role: values.role as any,
      };

      const response = await invitationService.sendInvitation(requestData);

      if (response.success) {
        // Show success message with user details
        message.success(
          response.message || `User added to ${projectName} successfully`
        );

        form.resetFields();

        if (onSuccess) {
          onSuccess();
        }

        // Close modal after 1.5 seconds
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      console.error("Failed to add user:", error);

      if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else {
        message.error("Failed to add user to project");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={`Add User to ${projectName}`}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      okText="Add User"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ role: "user" }}
      >
        <Alert
          message="Add Existing User"
          description="Enter the email address of an existing user to add them to this project. The user must already have an account."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: "Please enter an email address" },
            { type: "email", message: "Please enter a valid email address" },
          ]}
        >
          <Input placeholder="user@example.com" autoFocus />
        </Form.Item>

        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: "Please select a role" }]}
          tooltip="The role determines what permissions the user will have in this project"
        >
          <Select placeholder="Select a role">
            <Option value="user">
              <div>
                <div style={{ fontWeight: 500 }}>User</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  Can create and edit own tickets
                </div>
              </div>
            </Option>
            <Option value="admin">
              <div>
                <div style={{ fontWeight: 500 }}>Admin</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  Can manage tickets and assign work
                </div>
              </div>
            </Option>
            <Option value="manager">
              <div>
                <div style={{ fontWeight: 500 }}>Manager</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  Read-only access with KPI and reports
                </div>
              </div>
            </Option>
            <Option value="superadmin">
              <div>
                <div style={{ fontWeight: 500 }}>Superadmin</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  Full project control
                </div>
              </div>
            </Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InviteUserModal;
