import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/layout";
import { Ticket } from "../types";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";
import CreateTicketModal from "../components/CreateTicketModal";
import ReviewModal from "../components/ReviewModal";
import TicketChatPanel from "../components/TicketChatPanel";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import {
  formatDate,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
} from "../utils/helpers";
import {
  SearchOutlined,
  PlusOutlined,
  UserOutlined,
  CalendarOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Button, Avatar, Tooltip, Tag, Empty, Spin } from "antd";

type FilterType = "all" | "open" | "resolved" | "archived";

// API might return paginated results
interface PaginatedResponse<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export default function Dashboard() {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation('common');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // const [error, setError] = useState(""); -- removed unused
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ticketsNeedingReview, setTicketsNeedingReview] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // WebSocket context for real-time updates
  const { connectTickets, disconnectTickets } = useWebSocketContext();
    
  // Track ticket IDs we've already processed to avoid duplicates
  const processedTicketIdsRef = useRef<Set<number>>(new Set());

  // Use the first project ID for websocket connection (simplified for now)
  // In a real app we might want to handle multiple projects or get it from context
  const [connectedProjectId, setConnectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    fetchAllTickets();
  }, []);

  // Connect to websocket when we identify a project from tickets
  // This is a heuristic since Dashboard aggregates tickets
  useEffect(() => {
      if (tickets.length > 0 && !connectedProjectId) {
          const project = tickets[0].project;
          const pid = typeof project === 'number' ? project : project?.id;
          if (pid) setConnectedProjectId(pid);
      }
  }, [tickets, connectedProjectId]);

  useEffect(() => {
    if (connectedProjectId) {
        connectTickets(connectedProjectId);
        return () => disconnectTickets();
    }
  }, [connectedProjectId]);

  // Listen for real-time ticket updates via WebSocket
  useEffect(() => {
    const handleTicketUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data, projectId } = customEvent.detail;

      if (connectedProjectId && projectId !== connectedProjectId) return;

      if (type === "ticket_created") {
        const ticketId = data.id;
        if (processedTicketIdsRef.current.has(ticketId)) return;
        processedTicketIdsRef.current.add(ticketId);
        setTickets((prev) => {
          if (prev.some((t) => t.id === ticketId)) return prev;
          return [data, ...prev];
        });
      } else if (type === "ticket_updated") {
        setTickets((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, ...data } : t))
        );
        // Also update selected ticket if it's the one updated
        // (TicketChatPanel handles its own messages, but ticket metadata might change)
      } else if (type === "ticket_deleted") {
        setTickets((prev) => prev.filter((t) => t.id !== data.id));
        processedTicketIdsRef.current.delete(data.id);
        if (selectedTicketId === data.id) setSelectedTicketId(null);
      }
    };

    window.addEventListener("ticketUpdate", handleTicketUpdate);
    return () => {
      window.removeEventListener("ticketUpdate", handleTicketUpdate);
    };
  }, [connectedProjectId, selectedTicketId]);


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

      // Check for tickets needing review - only 'awaiting_review' status
      const needReview = activeList.filter(
        (t: Ticket) => t.resolution_status === "awaiting_review"
      );
      setTicketsNeedingReview(needReview);
    } catch (err) {
      console.error(err instanceof Error ? err.message : "Failed to load tickets");
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

  const handleReviewComplete = (ticketId: number) => {
    // Update the ticket in state to reflect it's been reviewed
    setTickets((prev) =>
      prev.map(
        (t) => (t.id === ticketId ? { ...t, resolution_rating: 5 } : t) // Placeholder
      )
    );
    // Remove from pending reviews
    setTicketsNeedingReview((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const handleAllReviewsComplete = () => {
    fetchAllTickets();
  };

  return (
    <PageContainer>
      {/* Search & Header (Keeping similar to MyTickets design but adapted) */}
      <div className="bg-gradient-to-r from-brand-400/10 to-brand-400/5 border border-brand-400/20 rounded-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {t('title')}
            </h1>
            <p className="text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="bg-brand-400 hover:bg-brand-500 border-none shadow-sm h-auto py-2.5 px-5"
            onClick={() => setIsCreateModalOpen(true)}
          >
            {t('submitRequest')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-[calc(100vh-250px)]">
          {/* Left Column: Ticket List - Scrollable */}
          <div className="lg:col-span-4 flex flex-col h-full">
            {/* Search Bar */}
            <div className="mb-4">
                 <div className="relative">
                     <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                     <input
                         placeholder={t('searchPlaceholder')}
                         className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 bg-white" 
                         type="text" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                     />
                 </div>
            </div>

            {/* Filters */}
            <div className="mb-4 flex items-center justify-between overflow-x-auto pb-2">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setFilter("all")}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {t('filter.all')}
                    </button>
                    <button
                        onClick={() => setFilter("open")}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === 'open' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {t('filter.open')} ({openCount})
                    </button>
                    <button
                        onClick={() => setFilter("resolved")}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === 'resolved' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {t('filter.resolved')} ({resolvedCount})
                    </button>
                     <button
                        onClick={() => setFilter("archived")}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === 'archived' ? 'bg-gray-200 text-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {t('filter.archived')}
                    </button>
                </div>
            </div>

             {/* List Content */}
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Spin />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-md border border-gray-100">
                        <Empty description={t('noTickets')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </div>
                ) : (
                    filteredTickets.map(ticket => {
                        const isActive = selectedTicketId === ticket.id;
                        const activeCardStyles = isActive 
                            ? "border-l-brand-600 ring-2 ring-brand-400/20 bg-brand-50 shadow-card-hover" 
                            : "border-l-brand-400 bg-white shadow-card hover:shadow-card-hover";
                        
                        const displayStatus = ticket.ticket_status_name || ticket.status; 
                        
                        return (
                            <div 
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`rounded-md p-5 transition-all duration-200 cursor-pointer border-l-4 ${activeCardStyles}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span 
                                        className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                                        style={{ 
                                            backgroundColor: getStatusColor(displayStatus) + '20', 
                                            color: getStatusColor(displayStatus)
                                        }}
                                    >
                                        {displayStatus}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">#{ticket.ticket_key || ticket.id}</span>
                                    <Tag 
                                        color={getPriorityColor(ticket.priority_id)} 
                                        className="ml-auto text-[10px] m-0 border-0 font-medium"
                                    >
                                        {getPriorityLabel(ticket.priority_id)}
                                    </Tag>
                                    {isActive && <span className="flex h-2 w-2 rounded-full bg-brand-500 ml-2"></span>}
                                </div>

                                <h3 className={`text-base font-semibold mb-3 line-clamp-2 ${isActive ? 'text-brand-900' : 'text-gray-900'}`}>
                                    {ticket.name}
                                </h3>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
                                    <div className="flex items-center gap-3">
                                        <Tooltip title={ticket.assignees?.length ? tCommon('assignedTo', { name: ticket.assignees[0].first_name }) : tCommon('unassigned')}>
                                            {ticket.assignees && ticket.assignees.length > 0 ? (
                                                <Avatar size="small" className="bg-blue-100 text-blue-600 border border-white shadow-sm">
                                                    {ticket.assignees[0].first_name?.[0] || ticket.assignees[0].username[0]}
                                                </Avatar>
                                            ) : (
                                                <Avatar size="small" icon={<UserOutlined />} className="bg-gray-200" />
                                            )}
                                        </Tooltip>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <CalendarOutlined />
                                            <span>{formatDate(ticket.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
             </div>
          </div>

          {/* Right Column: Chat Panel */}
          <div className="lg:col-span-8 h-full sticky top-0">
             {selectedTicketId ? (
                 <div className="h-full">
                     <TicketChatPanel ticketId={selectedTicketId} />
                 </div>
             ) : (
                 <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-md bg-white">
                     <div className="text-center">
                         <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                             <MoreOutlined className="text-xl" />
                         </div>
                         <p className="font-medium">{t('selectTicket')}</p>
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
      />

      {/* Review Modal */}
      <ReviewModal
        tickets={ticketsNeedingReview}
        onReviewComplete={handleReviewComplete}
        onAllReviewsComplete={handleAllReviewsComplete}
      />
    </PageContainer>
  );
}
