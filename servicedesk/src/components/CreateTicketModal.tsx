import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
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
        Low: 1,
        Medium: 2,
        High: 3,
        Critical: 4,
      };

      const payload = {
        name: values.name,
        description: values.description,
        priority_id: priorityMap[values.priority] || 2, // Default to Medium
      };

      console.log("Creating ticket with payload:", payload);

      // Send minimal data - backend should handle company/project assignment
      await apiService.post(API_ENDPOINTS.MY_TICKETS, payload);

      // message.success("Ticket created successfully!");
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
      title={null}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      className="rounded-xl overflow-hidden"
      style={{ paddingBottom: 0 }}
      styles={{
        content: { padding: 0, borderRadius: "1rem" },
        wrapper: {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "80px",
        },
      }}
      closeIcon={null}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center">
          <div className="text-xl font-bold text-slate-800">
            Create Support Ticket
          </div>
          <Button
            type="text"
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 bg-white">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{
              priority: "Medium",
            }}
            requiredMark={false}
          >
            <Form.Item
              label={
                <span className="text-slate-700 font-medium">Subject</span>
              }
              name="name"
              rules={[
                { required: true, message: "Please enter a subject" },
                { min: 5, message: "Subject must be at least 5 characters" },
              ]}
            >
              <Input
                placeholder="Brief description of your issue"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-slate-700 font-medium">Priority</span>
              }
              name="priority"
              rules={[{ required: true, message: "Please select a priority" }]}
            >
              <Select size="large" className="rounded-lg">
                <Select.Option value="Low">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Low - Can wait
                  </span>
                </Select.Option>
                <Select.Option value="Medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Medium - Normal priority
                  </span>
                </Select.Option>
                <Select.Option value="High">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    High - Important
                  </span>
                </Select.Option>
                <Select.Option value="Critical">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Critical - Urgent
                  </span>
                </Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={
                <span className="text-slate-700 font-medium">Description</span>
              }
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
                className="rounded-lg"
              />
            </Form.Item>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-8">
              <Button
                onClick={handleCancel}
                size="large"
                className="rounded-lg border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                className="bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-600/20"
              >
                Create Ticket
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

export default CreateTicketModal;
