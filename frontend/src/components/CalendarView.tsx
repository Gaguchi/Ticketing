import React from "react";
import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { theme, Tooltip, Avatar } from "antd";
import dayjs from "dayjs";
import type { Ticket, TicketColumn } from "../types/api";
import { getPriorityIcon } from "./PriorityIcons";

// Setup the localizer
const localizer = dayjsLocalizer(dayjs);

interface CalendarViewProps {
  tickets: Ticket[];
  columns: TicketColumn[];
  onTicketClick: (ticket: Ticket) => void;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Ticket;
  allDay?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tickets,
  onTicketClick,
}) => {
  const { token } = theme.useToken();

  // Transform tickets to calendar events
  const events: CalendarEvent[] = React.useMemo(() => {
    return tickets
      .filter((t) => t.due_date) // Only show tickets with due dates
      .map((ticket) => {
        // Parse date and ensure it's treated as local time for the calendar
        const date = dayjs(ticket.due_date).toDate();
        return {
          id: ticket.id,
          title: `${ticket.ticket_key}: ${ticket.name}`,
          start: date,
          end: date,
          resource: ticket,
          allDay: true,
        };
      });
  }, [tickets]);

  const getStatusColor = (columnName: string) => {
    const colorMap: Record<string, string> = {
      "To Do": "#1890ff", // blue
      New: "#1890ff",
      "In Progress": "#2f54eb", // geekblue
      Review: "#722ed1", // purple
      Done: "#52c41a", // green
    };
    return colorMap[columnName] || token.colorFillSecondary;
  };

  const eventPropGetter = (event: CalendarEvent) => {
    const ticket = event.resource;
    const statusColor = getStatusColor(ticket.column_name);

    return {
      style: {
        backgroundColor: token.colorBgContainer,
        borderLeft: `4px solid ${statusColor}`,
        color: token.colorText,
        borderRadius: token.borderRadiusSM,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid" as const,
        borderLeftColor: statusColor,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        fontSize: "12px",
        padding: "0",
        marginBottom: "4px",
        overflow: "hidden",
      },
    };
  };

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const ticket = event.resource;
    return (
      <Tooltip
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>
              <strong>{ticket.ticket_key}:</strong> {ticket.name}
            </div>
            <div>Status: {ticket.column_name}</div>
            {ticket.assignees && ticket.assignees.length > 0 && (
              <div>
                Assignees: {ticket.assignees.map((a) => a.username).join(", ")}
              </div>
            )}
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflow: "hidden",
            height: "100%",
            padding: "2px 6px",
          }}
        >
          <span style={{ flexShrink: 0, display: "flex" }}>
            {getPriorityIcon(ticket.priority_id)}
          </span>
          <span
            style={{
              fontWeight: 600,
              flexShrink: 0,
              color: token.colorTextSecondary,
              fontSize: "11px",
            }}
          >
            {ticket.ticket_key}
          </span>
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              fontWeight: 500,
            }}
          >
            {ticket.name}
          </span>
          {ticket.assignees && ticket.assignees.length > 0 && (
            <div style={{ flexShrink: 0, marginLeft: "auto" }}>
              <Avatar.Group maxCount={1} size={18}>
                {ticket.assignees.map((assignee) => (
                  <Avatar
                    key={assignee.id}
                    style={{
                      backgroundColor: token.colorPrimary,
                      fontSize: 10,
                      border: `1px solid ${token.colorBgContainer}`,
                    }}
                  >
                    {assignee.first_name?.[0] ||
                      assignee.username[0].toUpperCase()}
                  </Avatar>
                ))}
              </Avatar.Group>
            </div>
          )}
        </div>
      </Tooltip>
    );
  };

  return (
    <div
      style={{
        height: "100%",
        padding: "24px",
        backgroundColor: token.colorBgLayout,
      }}
    >
      <div
        style={{
          height: "100%",
          backgroundColor: token.colorBgContainer,
          padding: "20px",
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadow,
        }}
      >
        <style>
          {`
          .rbc-calendar {
            font-family: ${token.fontFamily};
          }
          .rbc-toolbar {
            margin-bottom: 20px;
          }
          .rbc-toolbar button {
            color: ${token.colorText};
            border-color: ${token.colorBorder};
            border-radius: ${token.borderRadius}px;
            transition: all 0.2s;
          }
          .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
            background-color: ${token.colorPrimary} !important;
            border-color: ${token.colorPrimary} !important;
            color: #fff !important;
            box-shadow: ${token.boxShadowSecondary};
          }
          .rbc-toolbar button:hover {
            background-color: ${token.colorBgTextHover};
            color: ${token.colorPrimary};
            border-color: ${token.colorPrimary};
            z-index: 1;
          }
          .rbc-header {
            padding: 12px 8px;
            font-weight: 600;
            color: ${token.colorTextSecondary};
            border-bottom: 1px solid ${token.colorBorderSecondary};
            background-color: ${token.colorFillQuaternary};
          }
          .rbc-month-view {
            border: 1px solid ${token.colorBorderSecondary};
            border-radius: ${token.borderRadiusLG}px;
            overflow: hidden;
          }
          .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid ${token.colorBorderSecondary};
          }
          .rbc-month-row + .rbc-month-row {
            border-top: 1px solid ${token.colorBorderSecondary};
          }
          .rbc-off-range-bg {
            background-color: ${token.colorFillQuaternary};
          }
          .rbc-today {
            background-color: ${token.colorFillQuaternary} !important;
          }
          .rbc-event {
            background: none;
            padding: 0 !important;
          }
          .rbc-event:focus {
            outline: none;
          }
          .rbc-time-view {
            border: 1px solid ${token.colorBorderSecondary};
            border-radius: ${token.borderRadiusLG}px;
          }
          .rbc-time-header-content {
            border-left: 1px solid ${token.colorBorderSecondary};
          }
          .rbc-time-content {
            border-top: 1px solid ${token.colorBorderSecondary};
          }
          .rbc-timeslot-group {
            border-bottom: 1px solid ${token.colorBorderSecondary};
          }
          .rbc-day-slot .rbc-time-slot {
            border-top: 1px solid ${token.colorBorderSecondary};
          }
        `}
        </style>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "calc(100% - 20px)" }}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          defaultView={Views.MONTH}
          onSelectEvent={(event) => onTicketClick(event.resource)}
          eventPropGetter={eventPropGetter}
          components={{
            event: EventComponent,
          }}
          popup
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 18, 0, 0)}
        />
      </div>
    </div>
  );
};
