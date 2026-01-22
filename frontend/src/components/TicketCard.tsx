import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Space, Tag, Tooltip, Popover, List, Input } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  UserAddOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { getPriorityIcon } from "./PriorityIcons";
import type { Ticket, User } from "../types/api";
import { useAuth } from "../contexts/AppContext";
import { ticketService } from "../services/ticket.service";
import { message, Button } from "antd";

interface TicketCardProps {
  id: string;
  ticket: Ticket;
  disabled?: boolean;
  dragOverlay?: boolean;
  onClick?: (ticket: Ticket) => void;
}

const getTypeIcon = (type?: string) => {
  switch (type) {
    case "task":
      return { icon: faCheckSquare, color: "#4bade8" };
    case "bug":
      return { icon: faBug, color: "#e5493a" };
    case "story":
      return { icon: faBookmark, color: "#63ba3c" };
    case "epic":
      return { icon: faBolt, color: "#904ee2" };
    default:
      return { icon: faCheckSquare, color: "#4bade8" };
  }
};

// Helper function to format ticket ID with type prefix
const formatTicketId = (ticket: Ticket) => {
  // Prefer ticket_key if available (project-scoped number)
  if (ticket.ticket_key) {
    return ticket.ticket_key;
  }
  // Fallback to old format for backward compatibility
  const key = ticket.project_key || "TICK";
  const num = ticket.project_number || ticket.id;
  return `${key}-${num}`;
};

const TicketCardComponent: React.FC<TicketCardProps> = ({
  id,
  ticket,
  disabled,
  dragOverlay,
  onClick,
}) => {
  const { user } = useAuth();
  const [assigning, setAssigning] = React.useState(false);
  
  // Optimistic UI state - store full assignee objects to render immediately
  const [optimisticAssignees, setOptimisticAssignees] = React.useState<User[] | null>(null);
  const [searchText, setSearchText] = React.useState("");
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const isResolved = !!ticket.resolved_at;

  // Get assignees from optimistic state OR props
  const assigneesList = optimisticAssignees || ticket.assignees || ticket.assignees_detail || [];

  const [assignableUsers, setAssignableUsers] = React.useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);

  // Load assignable users when popover opens
  const handlePopoverOpenChange = async (open: boolean) => {
    setPopoverOpen(open);
    if (open && assignableUsers.length === 0) {
      setLoadingUsers(true);
      try {
        const users = await ticketService.getAssignableUsers(ticket.id);
        setAssignableUsers(users);
      } catch (error) {
        console.error("Failed to load assignable users", error);
        message.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  // Filter members for assignment dropdown
  const filteredMembers = React.useMemo(() => {
    if (!searchText) return assignableUsers;
    const lower = searchText.toLowerCase();
    return assignableUsers.filter(
      (m) =>
        m.username.toLowerCase().includes(lower) ||
        m.first_name.toLowerCase().includes(lower) ||
        m.last_name.toLowerCase().includes(lower)
    );
  }, [assignableUsers, searchText]);

  const handleAssign = async (targetUser: User) => {
    try {
      setAssigning(true);
      setPopoverOpen(false);
      
      // OPTIMISTIC UPDATE: Set local state immediately
      // This ensures the UI reflects the change BEFORE the API returns
      // preserving the avatar and removing "Unassigned" tag
      setOptimisticAssignees([targetUser]);

      await ticketService.updateTicket(ticket.id, {
        assignee_ids: [targetUser.id]
      });
      
      message.success(`Assigned to ${targetUser.first_name || targetUser.username}`);
      // Trigger global update event to refresh lists/boards
      window.dispatchEvent(new CustomEvent("ticketUpdate"));
    } catch (error) {
      console.error("Failed to assign ticket:", error);
      message.error("Failed to assign ticket");
      setOptimisticAssignees(null); // Revert on failure
    } finally {
      setAssigning(false);
    }
  };

  // Format due date for display
  const formatDueDate = (dueDate: string | null | undefined) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const isOverdue = dateOnly < today;
    const isToday = dateOnly.getTime() === today.getTime();
    const isTomorrow = dateOnly.getTime() === tomorrow.getTime();
    
    let text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let color = '#5e6c84';
    let bgColor = '#f4f5f7';
    
    if (isOverdue) {
      text = 'Overdue';
      color = '#de350b';
      bgColor = '#ffebe6';
    } else if (isToday) {
      text = 'Today';
      color = '#ff8b00';
      bgColor = '#fff4e6';
    } else if (isTomorrow) {
      text = 'Tomorrow';
      color = '#ff991f';
      bgColor = '#fffae6';
    }
    
    return { text, color, bgColor };
  };

  const dueDateInfo = formatDueDate(ticket.due_date);

  // Check if ticket is unassigned
  const isUnassigned = assigneesList.length === 0;

  const {
    setNodeRef,
    listeners,
    isDragging,
    transform,
    transition,
    attributes,
  } = useSortable({
    id: id,
    disabled: disabled,
    data: {
      type: "TICKET",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: dragOverlay
      ? "0 4px 8px rgba(9,30,66,0.25)"
      : "0 1px 2px rgba(9,30,66,0.2)",
    cursor: dragOverlay ? "grabbing" : "pointer",
    touchAction: "manipulation",
    padding: "8px 10px",
    borderRadius: "3px",
    backgroundColor: isUnassigned ? "#fffbe6" : "#fff",
    marginBottom: "8px",
    borderLeft: isUnassigned ? "3px solid #faad14" : undefined,
  };

  return (
    <div
      ref={disabled ? null : setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick(ticket);
        }
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = isUnassigned ? "#fff8e1" : "#f4f5f7";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isUnassigned ? "#fffbe6" : "#fff";
      }}
    >
      <div>
        {/* Resolved indicator */}
        {/* Expanded Resolution Workflow Statuses */}
        {ticket.resolution_status === "rejected" && (
          <div style={{ marginBottom: "6px" }}>
            <Tag color="#cd201f" style={{ margin: 0, fontSize: "11px" }}>
              Resolution Rejected
            </Tag>
          </div>
        )}
        {ticket.resolution_status === "awaiting_review" && (
          <div style={{ marginBottom: "6px" }}>
            <Tag color="gold" style={{ margin: 0, fontSize: "11px" }}>
              Awaiting Review
            </Tag>
          </div>
        )}
        {/* Legacy or Accepted Resolved indicator - Only show if NOT rejected/awaiting review */}
        {(isResolved || ticket.resolution_status === "accepted") &&
          ticket.resolution_status !== "rejected" &&
          ticket.resolution_status !== "awaiting_review" && (
            <div style={{ marginBottom: "6px" }}>
              <Tag
                icon={<CheckCircleOutlined />}
                color="success"
                style={{ margin: 0, fontSize: "11px" }}
              >
                Resolved
              </Tag>
            </div>
          )}

        {/* Rejection Feedback Preview - Shows latest feedback truncated */}
        {ticket.resolution_status === "rejected" &&
          ticket.resolution_feedback && (
            <div
              style={{
                marginBottom: "8px",
                padding: "6px 8px",
                backgroundColor: "#FFF1F0",
                border: "1px solid #FFCCC7",
                borderRadius: "4px",
                fontSize: "11px",
                color: "#CF1322",
              }}
              title={ticket.resolution_feedback}
            >
              <span style={{ fontWeight: 600 }}>Feedback: </span>
              {ticket.resolution_feedback.length > 80
                ? `${ticket.resolution_feedback.substring(0, 80)}...`
                : ticket.resolution_feedback}
            </div>
          )}
        <div
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "#172b4d",
            marginBottom: "8px",
            lineHeight: "20px",
          }}
        >
          {ticket.name}
        </div>

        {/* Due Date Display */}
        {dueDateInfo && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 6px",
              borderRadius: "3px",
              backgroundColor: dueDateInfo.bgColor,
              color: dueDateInfo.color,
              fontSize: "11px",
              fontWeight: 500,
              marginBottom: "8px",
            }}
          >
            <ClockCircleOutlined style={{ fontSize: "10px" }} />
            {dueDateInfo.text}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#5e6c84",
            fontSize: "12px",
          }}
        >
          <div>
            <Space align="center" size={8}>
              {/* Issue Type/Company Logo and ID */}
              <Space size={4} align="center">
                {ticket.company_logo_url ? (
                  <Avatar
                    src={ticket.company_logo_url}
                    size={16}
                    style={{
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={getTypeIcon(ticket.type).icon}
                    style={{
                      fontSize: "14px",
                      color: getTypeIcon(ticket.type).color,
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: "12px",
                    color: "#5e6c84",
                    fontWeight: 500,
                  }}
                >
                  {formatTicketId(ticket)}
                </span>
              </Space>
              {ticket.following && <EyeOutlined style={{ fontSize: "14px" }} />}
              {(ticket.comments_count ?? 0) > 0 && (
                <Space size={4}>
                  <MessageOutlined style={{ fontSize: "14px" }} />
                  <span>{ticket.comments_count}</span>
                </Space>
              )}
            </Space>
          </div>
          <div>
            <Space align="center" size={6}>
              {getPriorityIcon(ticket.priority_id ?? 3)}
              
              {/* Assignees or Assign Button */}
              {assigneesList.length > 0 ? (
                <Avatar.Group
                  size={20}
                  max={{
                    count: 2,
                    style: {
                      color: "#fff",
                      backgroundColor: "#dfe1e6",
                      fontSize: "11px",
                    },
                  }}
                >
                  {assigneesList.map((user: any) => (
                    <Tooltip
                      key={user.id}
                      title={user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                    >
                      <Avatar
                        icon={<UserOutlined />}
                        size={20}
                        style={{ backgroundColor: "#0052cc" }}
                      />
                    </Tooltip>
                  ))}
                </Avatar.Group>
              ) : (
                <Popover
                  open={popoverOpen}
                  onOpenChange={handlePopoverOpenChange}
                  trigger="click"
                  placement="bottomRight"
                  content={
                    <div style={{ width: 200 }}>
                      <Input
                        placeholder="Search..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ marginBottom: 6, fontSize: "12px" }}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={{ maxHeight: 200, overflowY: "auto", minHeight: 50 }}>
                        <List
                          size="small"
                          loading={loadingUsers}
                          dataSource={filteredMembers}
                          renderItem={(member: any) => (
                            <List.Item
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssign(member);
                              }}
                              style={{ cursor: "pointer", padding: "4px 8px" }}
                              className="assignee-item"
                            >
                              <Space size={6}>
                                <Avatar size={20} style={{ backgroundColor: "#1890ff", fontSize: "10px" }}>
                                  {member.first_name?.[0] || member.username[0]}
                                </Avatar>
                                <span style={{ fontSize: "12px" }}>
                                  {member.first_name || member.username} {member.last_name || ""}
                                </span>
                                {user?.id === member.id && (
                                  <Tag style={{ marginLeft: "auto", fontSize: "10px", lineHeight: "18px" }}>Me</Tag>
                                )}
                              </Space>
                            </List.Item>
                          )}
                        />
                      </div>
                      <style>{`
                        .assignee-item:hover { background-color: #f5f5f5; }
                      `}</style>
                    </div>
                  }
                >
                  <Tooltip title="Assign Ticket">
                    <Button
                      type="text"
                      size="small"
                      loading={assigning}
                      onClick={(e) => {
                          e.stopPropagation();
                      }}
                      icon={<UserAddOutlined />}
                      style={{ 
                        fontSize: "12px", 
                        width: "22px",
                        height: "22px", 
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        color: "#faad14",
                        border: "1px dashed #faad14"
                      }}
                    />
                  </Tooltip>
                </Popover>
              )}
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TicketCard = memo(TicketCardComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.disabled === next.disabled &&
    prev.dragOverlay === next.dragOverlay &&
    prev.ticket === next.ticket &&
    prev.onClick === next.onClick
  );
});

TicketCard.displayName = "TicketCard";
