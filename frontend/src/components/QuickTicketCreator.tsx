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

  const { selectedProject } = useProject();

  // Fetch users for assignee picker (only users in current project)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!selectedProject) return;

      try {
        const response = await userService.getUsers();
        console.log("All users from API:", response.results);
        console.log("Selected project ID:", selectedProject.id);
        console.log(
          "First user object keys:",
          response.results[0] ? Object.keys(response.results[0]) : "No users"
        );

        // Filter to only show users who are members of the current project
        // Note: API returns project_memberships as array of project IDs
        const projectUsers = response.results.filter((user) => {
          const isMember = user.project_memberships?.includes(
            selectedProject.id
          );
          console.log(
            `User ${user.username}:`,
            `project_memberships=${JSON.stringify(user.project_memberships)}`,
            `isMember=${isMember}`
          );
          return isMember;
        });

        console.log("Filtered project users:", projectUsers);
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
      if (
        typePickerRef.current &&
        !typePickerRef.current.contains(event.target as Node)
      ) {
        setShowTypePicker(false);
      }
      if (
        assigneePickerRef.current &&
        !assigneePickerRef.current.contains(event.target as Node)
      ) {
        setShowAssigneePicker(false);
      }
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      // Only add optional fields if they have values
      if (assignee) {
        ticketData.assignee_ids = [assignee];
      }

      if (dueDate) {
        ticketData.due_date = dueDate.format("YYYY-MM-DD");
      }

      const newTicket = await ticketService.createTicket(ticketData);
      message.success("Ticket created!");

      // Reset form
      setSummary("");
      setTicketType("task");
      setAssignee(undefined);
      setDueDate(null);

      onSuccess?.(newTicket);

      // Close the quick creator after successful creation
      onClose?.();

      // Focus back on input (if still open)
      textareaRef.current?.focus();
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
    <div className="quick-ticket-creator">
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
