import React, { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
} from "antd";
import { CreateTicketData } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

const { TextArea } = Input;

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: CreateTicketData) => {
    try {
      setLoading(true);
      
      // Map priority string to priority_id
      const priorityMap: Record<string, number> = {
        'Low': 1,
        'Medium': 2,
        'High': 3,
        'Critical': 4,
      };
      
      const payload = {
        name: values.name,
        description: values.description,
        priority_id: priorityMap[values.priority] || 2, // Default to Medium
      };
      
      console.log('Creating ticket with payload:', payload);
      
      // Send minimal data - backend should handle company/project assignment
      await apiService.post(API_ENDPOINTS.MY_TICKETS, payload);
      
      message.success("Ticket created successfully!");
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Create ticket error:", error);
      const errorMessage = error.message || "Failed to create ticket";
      message.error(errorMessage);
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
      title="Create Support Ticket"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          priority: "Medium",
        }}
      >
        <Form.Item
          label="Subject"
          name="name"
          rules={[
            { required: true, message: "Please enter a subject" },
            { min: 5, message: "Subject must be at least 5 characters" },
          ]}
        >
          <Input
            placeholder="Brief description of your issue"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Priority"
          name="priority"
          rules={[
            { required: true, message: "Please select a priority" },
          ]}
        >
          <Select size="large">
            <Select.Option value="Low">Low - Can wait</Select.Option>
            <Select.Option value="Medium">
              Medium - Normal priority
            </Select.Option>
            <Select.Option value="High">High - Important</Select.Option>
            <Select.Option value="Critical">
              Critical - Urgent
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          rules={[
            { required: true, message: "Please provide a description" },
            {
              min: 20,
              message: "Description must be at least 20 characters",
            },
          ]}
        >
          <TextArea
            rows={8}
            placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant information."
          />
        </Form.Item>

        <Form.Item>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={handleCancel} size="large">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
            >
              Create Ticket
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateTicketModal;
