import React, { useState, useEffect } from "react";
import {
  Modal,
  Rate,
  Input,
  Button,
  Typography,
  message,
  Badge,
  Progress,
} from "antd";
import {
  StarFilled,
  CheckCircleOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import { Ticket } from "../types";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ReviewModalProps {
  tickets: Ticket[];
  onReviewComplete: (ticketId: number, updates?: Partial<Ticket>) => void;
  onAllReviewsComplete: () => void;
}

const ratingLabels: { [key: number]: string } = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const ReviewModal: React.FC<ReviewModalProps> = ({
  tickets,
  onReviewComplete,
  onAllReviewsComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  const currentTicket = tickets[currentIndex];
  const totalPending = tickets.length;
  const remaining = totalPending - currentIndex;

  useEffect(() => {
    if (tickets.length > 0) {
      setVisible(true);
      setCurrentIndex(0);
      setRating(0);
      setFeedback("");
    } else {
      setVisible(false);
    }
  }, [tickets]);

  const handleSubmit = async () => {
    if (!currentTicket) return;

    // Rating is mandatory (logic implies it must be > 0 to see buttons)
    if (rating === 0) return;

    setSubmitting(true);
    try {
      await apiService.post(API_ENDPOINTS.TICKET_REVIEW(currentTicket.id), {
        rating,
        feedback: feedback.trim() || undefined,
      });

      message.success(
        `Review submitted for ${currentTicket.ticket_key || currentTicket.key}`
      );
      onReviewComplete(currentTicket.id, {
        resolution_rating: rating,
        resolution_status: 'accepted',
        resolution_feedback: feedback
      });

      handleNext();
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      message.error(error.response?.data?.error || "Failed to submit review");
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentTicket) return;

    if (!feedback.trim()) {
      message.warning("Please provide a description explaining why the issue is not resolved");
      return;
    }

    setSubmitting(true);
    try {
      await apiService.post(API_ENDPOINTS.TICKET_REJECT_RESOLUTION(currentTicket.id), {
        feedback: feedback.trim(),
      });

      message.info(
        `Resolution rejected for ${currentTicket.ticket_key || currentTicket.key}`
      );
      onReviewComplete(currentTicket.id, {
        resolution_status: 'rejected',
        resolution_feedback: feedback,
        resolution_rating: undefined,
        resolved_at: undefined
      });

      handleNext();
    } catch (error: any) {
      console.error("Failed to reject resolution:", error);
      message.error(error.response?.data?.error || "Failed to reject resolution");
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalPending - 1) {
      setCurrentIndex(currentIndex + 1);
      setRating(0);
      setFeedback("");
      setSubmitting(false);
    } else {
      setVisible(false);
      onAllReviewsComplete();
    }
  };

  if (!currentTicket || !visible) return null;

  // Logic for progressive disclosure
  const showFeedback = rating > 0;
  const showRejectButton = rating > 0 && rating < 3;
  const showConfirmButton = rating >= 3 || (rating > 0 && rating < 3); // Basically rating > 0, but allows Reject if < 3

  return (
    <Modal
      open={visible}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      width={520}
      centered
      styles={{
        body: { padding: "32px 40px" },
      }}
    >
      {/* Progress indicator for multiple reviews */}
      {totalPending > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Badge
              count={remaining}
              style={{ backgroundColor: "#E67E22" }}
              overflowCount={99}
            >
              <Text type="secondary" style={{ paddingRight: 16 }}>
                Reviews pending
              </Text>
            </Badge>
            <Text type="secondary">
              {currentIndex + 1} of {totalPending}
            </Text>
          </div>
          <Progress
            percent={Math.round((currentIndex / totalPending) * 100)}
            showInfo={false}
            strokeColor="#2C3E50"
            size="small"
          />
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "#E8F5E9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            transition: "all 0.3s ease"
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 32, color: "#27AE60" }} />
        </div>
        <Title level={4} style={{ margin: 0, color: "#2C3E50" }}>
          Your ticket has been resolved!
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Please take a moment to rate your experience
        </Text>
      </div>

      {/* Ticket Info */}
      <div
        style={{
          backgroundColor: "#F5F7FA",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <Text strong style={{ display: "block", marginBottom: 4 }}>
          {currentTicket.ticket_key || currentTicket.key}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 14 }}>
          {currentTicket.name}
        </Text>
      </div>

      {/* Star Rating - Always Visible */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Text
          strong
          style={{ display: "block", marginBottom: 12, fontSize: 15 }}
        >
          How would you rate the resolution?
        </Text>
        <Rate
          value={rating}
          onChange={setRating}
          style={{ fontSize: 36 }}
          character={<StarFilled />}
        />
        {rating > 0 && (
          <Text
            style={{
              display: "block",
              marginTop: 8,
              color: "#E67E22",
              fontWeight: 500,
            }}
          >
            {ratingLabels[rating]}
          </Text>
        )}
      </div>

      {/* Feedback & Actions - Conditional on Rating */}
      {showFeedback && (
        <div className="animate-fade-in">
          {/* Feedback */}
          <div style={{ marginBottom: 32 }}>
            <Text
              strong
              style={{ display: "block", marginBottom: 8, fontSize: 15 }}
            >
              <CommentOutlined style={{ marginRight: 8 }} />
              {rating < 3 ? "What could go better?" : "Additional feedback"}
              {rating >= 3 && (
                <Text type="secondary" style={{ fontWeight: 400 }}>
                  {" "}(optional)
                </Text>
              )}
              {rating < 3 && (
                <Text type="secondary" style={{ fontWeight: 400, color: '#E74C3C' }}>
                  {" "}(required for rejection)
                </Text>
              )}
            </Text>
            <TextArea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={rating < 3 ? "Please explain why the issue is not resolved or what we can improve..." : "Share your thoughts about how your issue was handled..."}
              rows={3}
              maxLength={500}
              showCount
              style={{ borderRadius: 8 }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Reject Button (Visible if rating < 3) */}
            {showRejectButton && (
              <Button
                type="text"
                size="large"
                onClick={handleReject}
                loading={submitting}
                style={{
                  height: 48,
                  borderRadius: 8,
                  fontWeight: 500,
                  fontSize: 16,
                  color: "#94a3b8", // slate-400
                  transition: "all 0.2s"
                }}
                className="hover:text-red-500 hover:bg-red-50 flex-1"
              >
                No, Not Resolved
              </Button>
            )}

            {/* Accept/Submit Button */}
            {showConfirmButton && (
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={submitting}
                style={{
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: "#2C3E50",
                  borderColor: "#2C3E50",
                  fontWeight: 500,
                  fontSize: 16,
                  flex: showRejectButton ? 1 : undefined,
                  width: showRejectButton ? undefined : '100%'
                }}
                block={!showRejectButton}
              >
                {remaining > 1 ? "Submit & Continue" : "Confirm Resolution"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Skip hint for multiple reviews */}
      {totalPending > 1 && (
        <Text
          type="secondary"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 12,
            fontSize: 13,
          }}
        >
          You have {remaining} ticket{remaining !== 1 ? "s" : ""} awaiting your
          feedback
        </Text>
      )}
    </Modal>
  );
};

export default ReviewModal;
