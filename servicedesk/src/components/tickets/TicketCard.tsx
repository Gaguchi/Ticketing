import { Link } from "react-router-dom";
import { Card } from "../ui";
import ProgressChain from "./ProgressChain";
import { Ticket } from "../../types";

interface TicketCardProps {
  ticket: Ticket;
}

// Map column names to status keys
function getStatusKey(columnName: string): string {
  const statusMap: Record<string, string> = {
    open: "open",
    "to do": "open",
    "in progress": "in_progress",
    in_progress: "in_progress",
    waiting: "waiting",
    "on hold": "waiting",
    review: "waiting",
    done: "done",
    completed: "done",
    closed: "done",
  };
  return statusMap[columnName.toLowerCase()] || "open";
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const statusKey = getStatusKey(ticket.column_name || ticket.status);
  const isResolved = !!ticket.resolved_at;
  const isFinalColumn = ticket.is_final_column || false;
  const needsReview = isFinalColumn && !isResolved;
  const commentsCount = ticket.comments_count || ticket.comment_count || 0;

  return (
    <Link to={`/tickets/${ticket.id}`} className="block">
      <Card
        hoverable
        className={`border-l-4 ${
          isResolved
            ? "border-l-green-500 bg-gray-50"
            : needsReview
            ? "border-l-amber-500"
            : "border-l-brand-400"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium text-gray-500">
                #{ticket.ticket_key || ticket.key}
              </span>
              {ticket.type && (
                <>
                  <span className="text-sm text-gray-400">·</span>
                  <span className="text-sm text-gray-500">{ticket.type}</span>
                </>
              )}
              {isResolved ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  ✓ Resolved
                </span>
              ) : needsReview ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  ⭐ Awaiting Review
                </span>
              ) : null}
            </div>

            {/* Title */}
            <h3
              className={`text-base font-medium mb-2 truncate ${
                isResolved ? "text-gray-600" : "text-gray-900"
              }`}
            >
              {ticket.name}
            </h3>

            {/* Progress Chain */}
            <ProgressChain
              currentStatus={statusKey}
              isResolved={isResolved}
              isFinalColumn={isFinalColumn}
              className="mb-3"
            />

            {/* Footer */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {commentsCount > 0 && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {commentsCount} message{commentsCount !== 1 ? "s" : ""}
                </span>
              )}
              <span>
                {isResolved ? "Closed" : "Updated"}{" "}
                {formatRelativeTime(ticket.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
