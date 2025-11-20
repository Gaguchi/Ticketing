import React from "react";
import { Tag } from "antd";
import { ClockCircleOutlined, UserOutlined } from "@ant-design/icons";
import { Ticket } from "../types";
import {
  formatDate,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
} from "../utils/helpers";

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group mb-2"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {ticket.ticket_key || ticket.key}
            </span>
            <Tag
              color={getPriorityColor(ticket.priority_id)}
              className="m-0 border-0 text-[10px] px-1 leading-4"
            >
              {getPriorityLabel(ticket.priority_id)}
            </Tag>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
            {ticket.name}
          </h3>
        </div>
        <Tag
          color={getStatusColor(ticket.status)}
          className="m-0 font-medium px-1.5 py-0 text-[10px] leading-4"
        >
          {ticket.status}
        </Tag>
      </div>

      {ticket.description && (
        <p className="text-slate-500 text-xs mb-2 line-clamp-2 h-8">
          {ticket.description.replace(/<[^>]*>/g, "")}
        </p>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Tag className="m-0 bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-1 leading-4">
            {ticket.type}
          </Tag>

          {ticket.assignees && ticket.assignees.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <UserOutlined style={{ fontSize: "10px" }} />
              <span>
                {ticket.assignees
                  .map((a) => a.first_name || a.username)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <ClockCircleOutlined style={{ fontSize: "10px" }} />
          <span>{formatDate(ticket.created_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
