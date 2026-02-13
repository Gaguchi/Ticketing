import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Space, Tag, Tooltip, Popover, List, Input, DatePicker } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  UserAddOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from 'react-i18next';
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
  onTicketUpdate?: (ticketId: number, fields: Partial<Ticket>) => void;
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

const priorityOptions = [
  { id: 4, label: "Urgent", color: "#BC271A" },
  { id: 3, label: "High", color: "#DB833C" },
  { id: 2, label: "Normal", color: "#F2AE3D" },
  { id: 1, label: "Backlog", color: "#7C8697" },
];

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
  let color = 'var(--color-text-muted)';
  let bgColor = 'var(--color-bg-inset)';

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

// Lightweight drag overlay — no hooks, no interactive elements, just a static visual clone
const DragOverlayCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const assigneesList = ticket.assignees || ticket.assignees_detail || [];
  const isUnassigned = assigneesList.length === 0;
  const dueDateInfo = formatDueDate(ticket.due_date);
  const currentPriority = ticket.priority_id ?? 3;

  return (
    <div
      style={{
        boxShadow: "0 4px 8px rgba(9,30,66,0.25)",
        cursor: "grabbing",
        padding: "8px 10px",
        borderRadius: "3px",
        backgroundColor: isUnassigned ? "#fffbe6" : "var(--color-bg-surface)",
        marginBottom: "8px",
        borderLeft: isUnassigned ? "3px solid #faad14" : undefined,
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 400,
          color: "var(--color-text-heading)",
          marginBottom: "8px",
          lineHeight: "20px",
        }}
      >
        {ticket.name}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--color-text-muted)",
          fontSize: "12px",
        }}
      >
        <Space align="center" size={8}>
          <Space size={4} align="center">
            {ticket.company_logo_url ? (
              <Avatar src={ticket.company_logo_url} size={16} style={{ objectFit: "contain", flexShrink: 0 }} />
            ) : (
              <FontAwesomeIcon icon={getTypeIcon(ticket.type).icon} style={{ fontSize: "14px", color: getTypeIcon(ticket.type).color }} />
            )}
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 500 }}>{formatTicketId(ticket)}</span>
          </Space>
        </Space>
        <Space align="center" size={6}>
          {getPriorityIcon(currentPriority)}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "3px",
            padding: "1px 6px", borderRadius: "3px",
            backgroundColor: dueDateInfo?.bgColor || "var(--color-bg-inset)",
            color: dueDateInfo?.color || "var(--color-text-muted)",
            fontSize: "11px", fontWeight: 500, lineHeight: "20px",
            border: dueDateInfo ? "none" : "1px dashed var(--color-border)",
          }}>
            {dueDateInfo ? (
              <ClockCircleOutlined style={{ fontSize: "10px" }} />
            ) : (
              <CalendarOutlined style={{ fontSize: "10px" }} />
            )}
            {dueDateInfo ? dueDateInfo.text : "Date"}
          </span>
          {assigneesList.length > 0 ? (
            <Avatar.Group size={20} max={{ count: 2, style: { color: "#fff", backgroundColor: "var(--color-border)", fontSize: "11px" } }}>
              {assigneesList.map((u: any) => (
                <Avatar key={u.id} icon={<UserOutlined />} size={20} style={{ backgroundColor: "var(--color-primary)" }} />
              ))}
            </Avatar.Group>
          ) : (
            <div style={{
              fontSize: "12px", width: "22px", height: "22px",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "50%", color: "#faad14", border: "1px dashed #faad14",
            }}>
              <UserAddOutlined />
            </div>
          )}
        </Space>
      </div>
    </div>
  );
};

const TicketCardComponent: React.FC<TicketCardProps> = ({
  id,
  ticket,
  disabled,
  dragOverlay,
  onClick,
  onTicketUpdate,
}) => {
  const { t } = useTranslation('tickets');

  const { user } = useAuth();
  const [assigning, setAssigning] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const [assignableUsers, setAssignableUsers] = React.useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);

  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);
  const [_updatingDate, setUpdatingDate] = React.useState(false);

  const [priorityPopoverOpen, setPriorityPopoverOpen] = React.useState(false);

  const isResolved = !!ticket.resolved_at;

  // All display values come directly from ticket props (parent-managed state)
  const assigneesList = ticket.assignees || ticket.assignees_detail || [];
  const currentPriority = ticket.priority_id ?? 3;
  const currentDueDate = ticket.due_date;
  const dueDateInfo = formatDueDate(currentDueDate);
  const isUnassigned = assigneesList.length === 0;

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
        message.error(t('card.failedLoadUsers'));
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

      // Optimistic update via parent state (survives remounts)
      onTicketUpdate?.(ticket.id, { assignees: [targetUser] as any });

      const updated = await ticketService.updateTicket(ticket.id, {
        assignee_ids: [targetUser.id]
      });

      // Only merge assignee fields from response — never positional fields (rank, status, column)
      // which may have been changed by a concurrent drag operation
      onTicketUpdate?.(ticket.id, { assignees: updated.assignees, assignee_ids: updated.assignee_ids });
      message.success(t('card.assignedTo', { name: targetUser.first_name || targetUser.username }));
    } catch (error) {
      console.error("Failed to assign ticket:", error);
      message.error(t('card.failedAssign'));
      // Revert
      onTicketUpdate?.(ticket.id, { assignees: ticket.assignees } as any);
    } finally {
      setAssigning(false);
    }
  };

  const handleDateChange = async (date: dayjs.Dayjs | null) => {
    const dateString = date ? date.format("YYYY-MM-DD") : null;
    try {
      setUpdatingDate(true);
      setDatePopoverOpen(false);

      // Optimistic update via parent
      onTicketUpdate?.(ticket.id, { due_date: dateString });

      const updated = await ticketService.updateTicket(ticket.id, { due_date: dateString });
      // Only merge the due_date field — not positional fields that may be stale
      onTicketUpdate?.(ticket.id, { due_date: updated.due_date });
      message.success(dateString ? t('card.dueDateSetTo', { date: date!.format("MMM D") }) : t('card.dueDateCleared'));
    } catch (error) {
      console.error("Failed to update due date:", error);
      message.error("Failed to update due date");
      onTicketUpdate?.(ticket.id, { due_date: ticket.due_date });
    } finally {
      setUpdatingDate(false);
    }
  };

  const handlePriorityChange = async (priorityId: number) => {
    try {
      setPriorityPopoverOpen(false);

      // Optimistic update via parent
      onTicketUpdate?.(ticket.id, { priority_id: priorityId });

      const updated = await ticketService.updateTicket(ticket.id, { priority_id: priorityId });
      // Only merge the priority field — not positional fields that may be stale
      onTicketUpdate?.(ticket.id, { priority_id: updated.priority_id });
      const label = priorityOptions.find((p) => p.id === priorityId)?.label;
      message.success(`Priority set to ${label}`);
    } catch (error) {
      console.error("Failed to update priority:", error);
      message.error("Failed to update priority");
      onTicketUpdate?.(ticket.id, { priority_id: ticket.priority_id });
    }
  };

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
    backgroundColor: isUnassigned ? "#fffbe6" : "var(--color-bg-surface)",
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
          e.currentTarget.style.backgroundColor = isUnassigned ? "#fff8e1" : "var(--color-bg-inset)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isUnassigned ? "#fffbe6" : "var(--color-bg-surface)";
      }}
    >
      <div>
        {/* Expanded Resolution Workflow Statuses */}
        {ticket.resolution_status === "rejected" && (
          <div style={{ marginBottom: "6px" }}>
            <Tag color="#cd201f" style={{ margin: 0, fontSize: "11px" }}>
              {t('card.resolutionRejected')}
            </Tag>
          </div>
        )}
        {ticket.resolution_status === "awaiting_review" && (
          <div style={{ marginBottom: "6px" }}>
            <Tag color="gold" style={{ margin: 0, fontSize: "11px" }}>
              {t('card.awaitingReview')}
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
                {t('card.resolved')}
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
              <span style={{ fontWeight: 600 }}>{t('card.feedback')} </span>
              {ticket.resolution_feedback.length > 80
                ? `${ticket.resolution_feedback.substring(0, 80)}...`
                : ticket.resolution_feedback}
            </div>
          )}
        <div
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "var(--color-text-heading)",
            marginBottom: "8px",
            lineHeight: "20px",
          }}
        >
          {ticket.name}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "var(--color-text-muted)",
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
                    color: "var(--color-text-muted)",
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
              {/* Quick Priority Selector */}
              <Popover
                open={priorityPopoverOpen}
                onOpenChange={(open) => setPriorityPopoverOpen(open)}
                trigger="click"
                placement="bottomRight"
                content={
                  <div style={{ width: 140 }} onClick={(e) => e.stopPropagation()}>
                    <List
                      size="small"
                      dataSource={priorityOptions}
                      renderItem={(item) => (
                        <List.Item
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePriorityChange(item.id);
                          }}
                          style={{
                            cursor: "pointer",
                            padding: "4px 8px",
                            backgroundColor: item.id === currentPriority ? "var(--color-bg-content)" : undefined,
                          }}
                          className="assignee-item"
                        >
                          <Space size={6} align="center">
                            {getPriorityIcon(item.id)}
                            <span style={{ fontSize: "12px" }}>{item.label}</span>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                }
              >
                <Tooltip title={priorityOptions.find((p) => p.id === currentPriority)?.label || "Priority"}>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                  >
                    {getPriorityIcon(currentPriority)}
                  </div>
                </Tooltip>
              </Popover>

              {/* Quick Date Selector */}
              <div style={{ position: "relative", display: "inline-flex" }}>
                <Tooltip title={currentDueDate ? `Due: ${dayjs(currentDueDate).format("MMM D, YYYY")}` : "Set due date"}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setDatePopoverOpen(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      backgroundColor: dueDateInfo?.bgColor || "var(--color-bg-inset)",
                      color: dueDateInfo?.color || "var(--color-text-muted)",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: "pointer",
                      lineHeight: "20px",
                      border: dueDateInfo ? "none" : "1px dashed var(--color-border)",
                    }}
                  >
                    {dueDateInfo ? (
                      <ClockCircleOutlined style={{ fontSize: "10px" }} />
                    ) : (
                      <CalendarOutlined style={{ fontSize: "10px" }} />
                    )}
                    {dueDateInfo ? dueDateInfo.text : "Date"}
                  </div>
                </Tooltip>
                {datePopoverOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: "absolute", top: 0, right: 0, zIndex: 10 }}
                  >
                    <DatePicker
                      autoFocus
                      open
                      value={currentDueDate ? dayjs(currentDueDate) : null}
                      onChange={(date) => {
                        handleDateChange(date);
                        setDatePopoverOpen(false);
                      }}
                      onOpenChange={(open) => {
                        if (!open) setDatePopoverOpen(false);
                      }}
                      size="small"
                      style={{ position: "absolute", visibility: "hidden", width: 0, height: 0 }}
                      allowClear={false}
                      renderExtraFooter={() =>
                        currentDueDate ? (
                          <Button
                            type="text"
                            size="small"
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateChange(null);
                              setDatePopoverOpen(false);
                            }}
                            style={{ width: "100%", fontSize: "12px" }}
                          >
                            Clear date
                          </Button>
                        ) : null
                      }
                    />
                  </div>
                )}
              </div>

              {/* Assignees or Assign Button */}
              {assigneesList.length > 0 ? (
                <Avatar.Group
                  size={20}
                  max={{
                    count: 2,
                    style: {
                      color: "#fff",
                      backgroundColor: "var(--color-border)",
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
                        style={{ backgroundColor: "var(--color-primary)" }}
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
                                <Avatar size={20} style={{ backgroundColor: "var(--color-primary)", fontSize: "10px" }}>
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
                        .assignee-item:hover { background-color: var(--color-bg-inset); }
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
    prev.ticket.priority_id === next.ticket.priority_id &&
    prev.ticket.due_date === next.ticket.due_date &&
    prev.ticket.assignees === next.ticket.assignees &&
    prev.ticket.name === next.ticket.name &&
    prev.ticket.rank === next.ticket.rank &&
    prev.ticket.ticket_status_key === next.ticket.ticket_status_key &&
    prev.ticket.resolved_at === next.ticket.resolved_at &&
    prev.ticket.resolution_status === next.ticket.resolution_status &&
    prev.ticket.resolution_feedback === next.ticket.resolution_feedback &&
    prev.ticket.comments_count === next.ticket.comments_count &&
    prev.ticket.following === next.ticket.following &&
    prev.onClick === next.onClick &&
    prev.onTicketUpdate === next.onTicketUpdate
  );
});

TicketCard.displayName = "TicketCard";

export { DragOverlayCard };
