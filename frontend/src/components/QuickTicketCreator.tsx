import React, { useState, useRef, useEffect } from "react";
import { Input, DatePicker, Avatar, Tooltip, message } from "antd";
import { UserOutlined, CalendarOutlined } from "@ant-design/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { Dayjs } from "dayjs";
import { useProject } from "../contexts/AppContext";
import { ticketService, userService } from "../services";
import type { Ticket, User, TicketType } from "../types/api";
import "./QuickTicketCreator.css";

const { TextArea } = Input;

interface QuickTicketCreatorProps {
  columnId: number;
  statusKey?: string; // NEW: Status key for new status-based system
  onSuccess?: (ticket: Ticket) => void;
  onClose?: () => void;
}

const getTypeConfig = (type: string) => {
  switch (type) {
    case "task":
      return { icon: faCheckSquare, color: "#4bade8", label: "Task" };
    case "bug":
      return { icon: faBug, color: "#e5493a", label: "Bug" };
    case "story":
      return { icon: faBookmark, color: "#63ba3c", label: "Story" };
    case "epic":
      return { icon: faBolt, color: "#904ee2", label: "Epic" };
    default:
      return { icon: faCheckSquare, color: "#4bade8", label: "Task" };
  }
};

export const QuickTicketCreator: React.FC<QuickTicketCreatorProps> = ({
  columnId,
  statusKey,
  onSuccess,
  onClose,
}) => {
  const [summary, setSummary] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>("task");
  const [assignee, setAssignee] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const textareaRef = useRef<any>(null);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const assigneePickerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedProject } = useProject();

  // Fetch users for assignee picker (only users in current project)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!selectedProject) return;

      try {
        const response = await userService.getUsers();

        // Filter to only show users who are members of the current project
        // Note: API returns project_memberships as array of project IDs
        const projectUsers = response.results.filter((user) => {
          return user.project_memberships?.includes(selectedProject.id);
        });

        setUsers(projectUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, [selectedProject]);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Close type picker
      if (typePickerRef.current && !typePickerRef.current.contains(target)) {
        setShowTypePicker(false);
      }

      // Close assignee picker
      if (
        assigneePickerRef.current &&
        !assigneePickerRef.current.contains(target)
      ) {
        setShowAssigneePicker(false);
      }

      // Close date picker
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setShowDatePicker(false);
      }

      // Close entire component when clicking outside
      // BUT exclude clicks on the pickers themselves or Ant Design dropdowns
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Check if click is on an Ant Design dropdown/picker
        const isAntDropdown = (target as HTMLElement).closest(
          ".ant-picker-dropdown, .ant-select-dropdown, .quick-ticket-dropdown"
        );

        if (!isAntDropdown) {
          onClose?.();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Auto-focus textarea when ready (on mount or after creation)
  useEffect(() => {
    if (!isCreating) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCreating]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!summary.trim()) {
      message.warning("Please enter a summary");
      return;
    }

    if (!selectedProject) {
      message.error("No project selected");
      return;
    }

    setIsCreating(true);

    try {
      const ticketData: any = {
        name: summary.trim(),
        description: "",
        type: ticketType,
        priority_id: 3, // Medium
        urgency: "normal",
        importance: "normal",
        column: columnId,
        project: selectedProject.id,
      };

      // NEW: If using status-based system, include status key
      if (statusKey) {
        ticketData.status_key = statusKey;
      }

      // Only add optional fields if they have values
      if (assignee) {
        ticketData.assignee_ids = [assignee];
      }

      if (dueDate) {
        ticketData.due_date = dueDate.format("YYYY-MM-DD");
      }

      const newTicket = await ticketService.createTicket(ticketData);
      // message.success("Ticket created!");

      // Reset form
      setSummary("");
      setTicketType("task");
      setAssignee(undefined);
      setDueDate(null);

      onSuccess?.(newTicket);

      // Keep the quick creator open for multiple ticket creation
      // onClose?.();
    } catch (error: any) {
      console.error("Failed to create ticket:", error);
      message.error(error.message || "Failed to create ticket");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setSummary("");
      setTicketType("task");
      setAssignee(undefined);
      setDueDate(null);
    }
  };

  const typeConfig = getTypeConfig(ticketType);
  const selectedUser = users.find((u) => u.id === assignee);

  return (
    <div className="quick-ticket-creator" ref={containerRef}>
      <form onSubmit={handleSubmit} className="quick-ticket-form">
        <div className="quick-ticket-input-container">
          <TextArea
            ref={textareaRef}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What needs to be done?"
            rows={2}
            maxLength={255}
            disabled={isCreating}
            className="quick-ticket-textarea"
            autoFocus
          />

          <div className="quick-ticket-actions">
            <div className="quick-ticket-pickers">
              {/* Type Picker */}
              <div className="quick-ticket-picker" ref={typePickerRef}>
                <Tooltip title="Change type">
                  <button
                    type="button"
                    className="quick-ticket-picker-btn"
                    onClick={() => setShowTypePicker(!showTypePicker)}
                    disabled={isCreating}
                  >
                    <FontAwesomeIcon
                      icon={typeConfig.icon}
                      style={{ color: typeConfig.color }}
                    />
                    <span className="quick-ticket-type-label">
                      {typeConfig.label}
                    </span>
                    <span className="quick-ticket-dropdown-icon">▼</span>
                  </button>
                </Tooltip>

                {showTypePicker && (
                  <div className="quick-ticket-dropdown">
                    {(["task", "bug", "story", "epic"] as TicketType[]).map(
                      (type) => {
                        const config = getTypeConfig(type);
                        return (
                          <div
                            key={type}
                            className={`quick-ticket-dropdown-item ${
                              type === ticketType ? "active" : ""
                            }`}
                            onClick={() => {
                              setTicketType(type);
                              setShowTypePicker(false);
                            }}
                          >
                            <FontAwesomeIcon
                              icon={config.icon}
                              style={{ color: config.color }}
                            />
                            <span>{config.label}</span>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* Due Date Picker */}
              <div className="quick-ticket-picker" ref={datePickerRef}>
                <Tooltip title="Set due date">
                  <button
                    type="button"
                    className="quick-ticket-icon-btn"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    disabled={isCreating}
                  >
                    <CalendarOutlined />
                  </button>
                </Tooltip>

                {showDatePicker && (
                  <div
                    className="quick-ticket-dropdown quick-ticket-date-dropdown"
                    ref={datePickerRef}
                  >
                    <DatePicker
                      value={dueDate}
                      onChange={(date) => {
                        setDueDate(date);
                        setShowDatePicker(false);
                      }}
                      format="MMM DD, YYYY"
                      open={true}
                      showToday={false}
                    />
                  </div>
                )}
              </div>

              {/* Assignee Picker */}
              <div className="quick-ticket-picker" ref={assigneePickerRef}>
                <Tooltip title="Assign to">
                  <button
                    type="button"
                    className="quick-ticket-icon-btn"
                    onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                    disabled={isCreating}
                  >
                    {selectedUser ? (
                      <Avatar size="small">
                        {selectedUser.username.charAt(0).toUpperCase()}
                      </Avatar>
                    ) : (
                      <UserOutlined />
                    )}
                  </button>
                </Tooltip>

                {showAssigneePicker && (
                  <div className="quick-ticket-dropdown quick-ticket-assignee-dropdown">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className={`quick-ticket-dropdown-item ${
                          assignee === user.id ? "active" : ""
                        }`}
                        onClick={() => {
                          setAssignee(user.id);
                          setShowAssigneePicker(false);
                        }}
                      >
                        <Avatar size="small">
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <span>{user.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="quick-ticket-submit"
              disabled={!summary.trim() || isCreating}
            >
              <span className="quick-ticket-submit-icon">⏎</span>
              <span className="quick-ticket-submit-text">Create</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuickTicketCreator;
