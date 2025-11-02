import React, { useState } from "react";
import { Modal, Form, Input, message } from "antd";
import { projectService, type CreateProjectData } from "../services";
import { useAuth } from "../contexts/AppContext";
import { useProject } from "../contexts/AppContext";

const { TextArea } = Input;

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { refreshProjects } = useProject();

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const projectData: CreateProjectData = {
        key: values.key.toUpperCase().trim(),
        name: values.name.trim(),
        description: values.description?.trim() || "",
        lead_username: user?.username,
      };

      console.log("Creating project:", projectData);
      const newProject = await projectService.createProject(projectData);

      message.success({
        content: `Project "${newProject.name}" created successfully with default columns!`,
        duration: 3,
      });

      // Refresh projects in context to include the new project
      await refreshProjects();

      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to create project:", error);
      message.error(
        error.response?.data?.detail ||
          error.response?.data?.key?.[0] ||
          error.message ||
          "Failed to create project"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Create New Project"
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      okText="Create Project"
      confirmLoading={saving}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="key"
          label="Project Key"
          rules={[
            { required: true, message: "Project key is required" },
            {
              pattern: /^[A-Z0-9]{2,10}$/,
              message:
                "Project key must be 2-10 uppercase letters or numbers (e.g., PROJ, TICKET)",
            },
          ]}
          tooltip="Short identifier for the project (2-10 uppercase characters)"
        >
          <Input
            placeholder="e.g., PROJ, TICKET"
            maxLength={10}
            style={{ textTransform: "uppercase" }}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              form.setFieldValue("key", value);
            }}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Project Name"
          rules={[
            { required: true, message: "Project name is required" },
            { min: 3, message: "Project name must be at least 3 characters" },
            {
              max: 100,
              message: "Project name must be less than 100 characters",
            },
          ]}
        >
          <Input placeholder="e.g., Customer Support System" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
          rules={[
            {
              max: 500,
              message: "Description must be less than 500 characters",
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Describe the purpose and scope of this project..."
            maxLength={500}
          />
        </Form.Item>

        <div
          style={{
            background: "#f0f7ff",
            border: "1px solid #91d5ff",
            borderRadius: "4px",
            padding: "12px",
            marginTop: "16px",
          }}
        >
          <p style={{ margin: 0, fontSize: "13px", color: "#1890ff" }}>
            <strong>Note:</strong> Default columns (To Do, In Progress, Review,
            Done) will be automatically created for this project.
          </p>
        </div>
      </Form>
    </Modal>
  );
};
