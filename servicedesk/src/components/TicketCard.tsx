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
      className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group mb-4"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {ticket.key}
            </span>
            <Tag
              color={getPriorityColor(ticket.priority_id)}
              className="m-0 border-0"
            >
              {getPriorityLabel(ticket.priority_id)}
            </Tag>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
            {ticket.name}
          </h3>
        </div>
        <Tag
          color={getStatusColor(ticket.status)}
          className="m-0 font-medium px-3 py-0.5"
        >
          {ticket.status}
        </Tag>
      </div>

      <p className="text-slate-500 text-sm mb-4 line-clamp-2 h-10">
        {ticket.description?.replace(/<[^>]*>/g, "") ||
          "No description provided"}
      </p>

      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <Tag className="m-0 bg-slate-100 text-slate-600 border-slate-200">
            {ticket.type}
          </Tag>

          {ticket.assignees && ticket.assignees.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <UserOutlined />
              <span>
                {ticket.assignees
                  .map((a) => a.first_name || a.username)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ClockCircleOutlined />
          <span>{formatDate(ticket.created_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
