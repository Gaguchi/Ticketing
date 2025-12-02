import { useState, useEffect } from "react";
import { PageContainer } from "../components/layout";
import { Spinner } from "../components/ui";
import { TicketCard } from "../components/tickets";
import { Ticket } from "../types";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";
import CreateTicketModal from "../components/CreateTicketModal";

type FilterType = "all" | "open" | "resolved" | "archived";

// API might return paginated results
interface PaginatedResponse<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchAllTickets();
  }, []);

  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      // Fetch both active and archived tickets
      const [activeData, archivedData] = await Promise.all([
        apiService.get<Ticket[] | PaginatedResponse<Ticket>>(
          API_ENDPOINTS.MY_TICKETS
        ),
        apiService.get<Ticket[] | PaginatedResponse<Ticket>>(
          API_ENDPOINTS.ARCHIVED_TICKETS
        ),
      ]);

      const activeList = Array.isArray(activeData)
        ? activeData
        : activeData.results || [];
      const archivedList = Array.isArray(archivedData)
        ? archivedData
        : archivedData.results || [];

      setTickets(activeList);
      setArchivedTickets(archivedList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (data: {
    name: string;
    description: string;
    remoteDesktopTool?: string;
    remoteDesktopId?: string;
    attachments?: File[];
  }) => {
    // Build request data - use name as both name and description if description is empty
    const ticketData: Record<string, unknown> = {
      name: data.name,
      description: data.description || data.name,
    };

    // Add remote desktop info to description if provided
    if (data.remoteDesktopTool && data.remoteDesktopTool !== "none") {
      const toolName =
        data.remoteDesktopTool.charAt(0).toUpperCase() +
        data.remoteDesktopTool.slice(1);
      const remoteInfo = data.remoteDesktopId
        ? `\n\n---\n🖥️ **Remote Assistance:** ${toolName}\n📋 **ID:** \`${data.remoteDesktopId}\``
        : `\n\n---\n🖥️ **Remote Assistance:** ${toolName}`;
      ticketData.description = (ticketData.description as string) + remoteInfo;
    }

    const newTicket = await apiService.post<Ticket>(
      API_ENDPOINTS.MY_TICKETS,
      ticketData
    );

    // Upload attachments if any
    if (data.attachments && data.attachments.length > 0) {
      for (const file of data.attachments) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("ticket", String(newTicket.id));
        formData.append("filename", file.name);

        try {
          await apiService.postFormData(API_ENDPOINTS.ATTACHMENTS, formData);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          // Continue with other files even if one fails
        }
      }
    }

    setTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  // Get tickets based on filter
  const getFilteredTickets = () => {
    let baseTickets: Ticket[] = [];

    if (filter === "archived") {
      baseTickets = archivedTickets;
    } else if (filter === "all") {
      baseTickets = tickets;
    } else if (filter === "open") {
      // Open = not resolved (no resolved_at)
      baseTickets = tickets.filter((t) => !t.resolved_at);
    } else if (filter === "resolved") {
      // Resolved = has resolved_at timestamp
      baseTickets = tickets.filter((t) => !!t.resolved_at);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      baseTickets = baseTickets.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.ticket_key?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    return baseTickets;
  };

  const filteredTickets = getFilteredTickets();

  // Count tickets for filter badges
  const openCount = tickets.filter((t) => !t.resolved_at).length;
  const resolvedCount = tickets.filter((t) => !!t.resolved_at).length;

  return (
    <PageContainer>
      {/* Hero Banner - Prominent CTA */}
      <div className="bg-gradient-to-r from-brand-400/10 to-brand-400/5 border border-brand-400/20 rounded-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              How can we help you today?
            </h1>
            <p className="text-gray-600">
              Search your tickets or submit a new request
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-white px-5 py-2.5 rounded-md font-medium transition-colors shadow-sm"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Submit a Request
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 bg-white"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">My Tickets</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              filter === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              filter === "open"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              filter === "resolved"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            onClick={() => setFilter("archived")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              filter === "archived"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Archived ({archivedTickets.length})
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTickets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-400/10 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-brand-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">
            {searchQuery ? "No tickets found" : "No tickets yet"}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery
              ? "Try a different search term"
              : 'Use the "Submit a Request" button above to create your first ticket'}
          </p>
        </div>
      )}

      {/* Ticket List */}
      {!loading && filteredTickets.length > 0 && (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
      />
    </PageContainer>
  );
}
