/**
 * User Review Modal
 * Modal for creating/editing admin reviews of users
 * 
 * Features:
 * - Star rating input (1-5)
 * - Feedback textarea
 * - Optional ticket link
 */

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Rate,
  Input,
  Typography,
  Space,
  Avatar,
  message,
} from 'antd';
import { UserOutlined, StarOutlined } from '@ant-design/icons';
import kpiService from '../services/kpi.service';
import type { CreateUserReviewData, UserReview } from '../types/kpi';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface UserReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  userId: number;
  username: string;
  projectId: number;
  ticketId?: number;
  ticketKey?: string;
  /** If provided, this is an edit operation */
  existingReview?: UserReview;
}

const ratingDescriptions = [
  '',
  'Needs Improvement',
  'Below Expectations',
  'Meets Expectations',
  'Exceeds Expectations',
  'Outstanding',
];

const UserReviewModal: React.FC<UserReviewModalProps> = ({
  open,
  onClose,
  onSubmit,
  userId,
  username,
  projectId,
  ticketId,
  ticketKey,
  existingReview,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  
  const isEditing = !!existingReview;
  
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (isEditing && existingReview) {
        // Update existing review
        await kpiService.updateUserReview(existingReview.id, {
          rating: values.rating,
          feedback: values.feedback,
        });
      } else {
        // Create new review
        const reviewData: CreateUserReviewData = {
          user: userId,
          project: projectId,
          rating: values.rating,
          feedback: values.feedback || '',
          ticket: ticketId || null,
        };
        await kpiService.createUserReview(reviewData);
      }
      
      onSubmit();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else if (error.errorFields) {
        // Form validation error - don't show message
      } else {
        message.error('Failed to submit review');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      open={open}
      title={
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          {isEditing ? 'Edit Review' : 'Review User'}
        </Space>
      }
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditing ? 'Update Review' : 'Submit Review'}
      confirmLoading={loading}
      destroyOnClose
    >
      {/* User Info Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        marginBottom: 24,
        padding: 16,
        backgroundColor: 'var(--color-bg-sidebar)',
        borderRadius: 8,
      }}>
        <Avatar size={48} icon={<UserOutlined />} />
        <div>
          <Title level={5} style={{ margin: 0 }}>@{username}</Title>
          {ticketKey && (
            <Text type="secondary">
              For ticket: {ticketKey}
            </Text>
          )}
        </div>
      </div>
      
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          rating: existingReview?.rating || undefined,
          feedback: existingReview?.feedback || '',
        }}
      >
        {/* Rating */}
        <Form.Item
          name="rating"
          label="Rating"
          rules={[{ required: true, message: 'Please provide a rating' }]}
        >
          <div>
            <Rate
              value={rating}
              onChange={(value) => {
                setRating(value);
                form.setFieldsValue({ rating: value });
              }}
              style={{ fontSize: 32 }}
            />
            {rating > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">{ratingDescriptions[rating]}</Text>
              </div>
            )}
          </div>
        </Form.Item>
        
        {/* Feedback */}
        <Form.Item
          name="feedback"
          label="Feedback (Optional)"
          extra="Private notes visible only to managers and superadmins"
        >
          <TextArea
            rows={4}
            placeholder="Add any additional feedback or notes..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
      
      {/* Privacy Notice */}
      <div style={{
        padding: 12,
        backgroundColor: '#fff7e6',
        borderRadius: 6,
        border: '1px solid #ffe58f',
      }}>
        <Text style={{ fontSize: 12 }}>
          <strong>Note:</strong> This review is private and will NOT be visible to {username}. 
          Only managers and superadmins can view user reviews.
        </Text>
      </div>
    </Modal>
  );
};

export default UserReviewModal;
