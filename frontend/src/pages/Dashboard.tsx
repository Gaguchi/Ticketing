/**
 * Dashboard Page
 * Customizable dashboard with drag-and-drop widgets using react-grid-layout
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Spin, message, Empty } from "antd";
import { useProject, useAuth } from "../contexts/AppContext";
import { useTranslation } from "react-i18next";
import { TicketModal } from "../components/TicketModal";
import { CreateTicketModal } from "../components/CreateTicketModal";
import {
  CompanyFilterBar,
  KanbanPipeline,
  AttentionNeededCards,
  NewestTicketCards,
  TimelineActivityFeed,
  TeamWorkloadCards,
  DashboardGrid,
  DashboardWidget,
  type WidgetConfig,
} from "../components/dashboard";
import dashboardService from "../services/dashboard.service";
import type { Ticket } from "../types/api";
import type {
  CompanyHealth,
  AttentionNeeded as AttentionNeededData,
  DashboardTicket,
  ActivityEntry,
  AgentWorkload as AgentWorkloadData,
  KanbanSummary,
} from "../types/dashboard";

const Dashboard: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const { selectedProject } = useProject();
  const { user } = useAuth();

  // Data states
  const [companyHealth, setCompanyHealth] = useState<CompanyHealth[]>([]);
  const [attentionNeeded, setAttentionNeeded] =
    useState<AttentionNeededData | null>(null);
  const [newestTickets, setNewestTickets] = useState<DashboardTicket[]>([]);
  const [liveActivity, setLiveActivity] = useState<ActivityEntry[]>([]);
  const [agentWorkload, setAgentWorkload] = useState<AgentWorkloadData[]>([]);
  const [kanbanSummary, setKanbanSummary] = useState<KanbanSummary | null>(
    null
  );

  // UI states
  const [loading, setLoading] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);

  // Modal states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Calculate total tickets across all companies
  const totalTickets = kanbanSummary?.total_tickets || 0;

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!selectedProject) {
      setCompanyHealth([]);
      setAttentionNeeded(null);
      setNewestTickets([]);
      setLiveActivity([]);
      setAgentWorkload([]);
      setKanbanSummary(null);
      return;
    }

    setLoading(true);
    try {
      const projectId = selectedProject.id;
      // Pass single company filter to API if exactly one selected, otherwise fetch all
      const companyFilter = selectedCompanyIds.length === 1 ? selectedCompanyIds[0] : undefined;

      // Fetch all data in parallel
      const [
        healthData,
        attentionData,
        newestData,
        activityData,
        workloadData,
        kanbanData,
      ] = await Promise.all([
        dashboardService.fetchCompanyHealth({ project: projectId }),
        dashboardService.fetchAttentionNeeded({
          project: projectId,
          company: companyFilter,
          limit: 10,
        }),
        dashboardService.fetchNewestTickets({
          project: projectId,
          company: companyFilter,
          limit: 10,
        }),
        dashboardService.fetchLiveActivity({
          project: projectId,
          company: companyFilter,
          limit: 20,
        }),
        dashboardService.fetchAgentWorkload({
          project: projectId,
          company: companyFilter,
        }),
        dashboardService.fetchKanbanSummary(projectId, companyFilter),
      ]);

      setCompanyHealth(healthData);
      setAttentionNeeded(attentionData);
      setNewestTickets(newestData);
      setLiveActivity(activityData);
      setAgentWorkload(workloadData);
      setKanbanSummary(kanbanData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      message.error(tCommon('msg.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id, selectedCompanyIds]);

  // Fetch data on mount and project change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for WebSocket ticket updates (debounced to prevent request flooding)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const handleTicketUpdate = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchDashboardData();
      }, 2000);
    };

    window.addEventListener("ticketUpdate", handleTicketUpdate);
    return () => {
      window.removeEventListener("ticketUpdate", handleTicketUpdate);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchDashboardData]);

  // Handle ticket click - open modal
  const handleTicketClick = async (ticketId: number) => {
    try {
      const { ticketService } = await import("../services");
      const ticket = await ticketService.getTicket(ticketId);
      setSelectedTicket(ticket);
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
      message.error(tCommon('msg.error.loadFailed'));
    }
  };

  // Handle company filter selection
  const handleCompanyToggle = (companyId: number) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((c) => c !== companyId) : [...prev, companyId]
    );
  };

  // Handle ticket update success
  const handleTicketUpdated = () => {
    setSelectedTicket(null);
    fetchDashboardData();
  };

  // Define dashboard widgets with their default layouts
  // Layout: 12-column grid, Attention Needed prominent on left, Newest Tickets on right
  const widgets: WidgetConfig[] = useMemo(
    () => [
      {
        i: "attention",
        title: t('attention.needsAttention'),
        component: (
          <DashboardWidget title={t('attention.needsAttention')} loading={loading}>
            <AttentionNeededCards
              data={attentionNeeded}
              loading={loading}
              onTicketClick={handleTicketClick}
            />
          </DashboardWidget>
        ),
        defaultLayout: { x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
      },
      {
        i: "newest",
        title: t('newest.newestTickets'),
        component: (
          <DashboardWidget title={t('newest.newestTickets')} loading={loading}>
            <NewestTicketCards
              tickets={newestTickets}
              loading={loading}
              onTicketClick={handleTicketClick}
              maxCards={8}
            />
          </DashboardWidget>
        ),
        defaultLayout: { x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        i: "activity",
        title: t('activity.liveActivity'),
        component: (
          <DashboardWidget title={t('activity.liveActivity')} loading={loading}>
            <TimelineActivityFeed
              activities={liveActivity}
              loading={loading}
              onTicketClick={handleTicketClick}
            />
          </DashboardWidget>
        ),
        defaultLayout: { x: 0, y: 4, w: 6, h: 3, minW: 4, minH: 2 },
      },
      {
        i: "pipeline",
        title: t('pipeline.pipeline'),
        component: (
          <DashboardWidget title={t('pipeline.pipeline')} loading={loading}>
            <KanbanPipeline data={kanbanSummary} loading={loading} />
          </DashboardWidget>
        ),
        defaultLayout: { x: 6, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
      },
      {
        i: "workload",
        title: t('widgets.teamWorkload'),
        component: (
          <DashboardWidget title={t('widgets.teamWorkload')} loading={loading}>
            <TeamWorkloadCards workloads={agentWorkload} loading={loading} />
          </DashboardWidget>
        ),
        defaultLayout: { x: 9, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
      },
    ],
    [
      loading,
      attentionNeeded,
      newestTickets,
      liveActivity,
      kanbanSummary,
      agentWorkload,
      handleTicketClick,
    ]
  );

  // No project selected
  if (!selectedProject) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f5f7",
        }}
      >
        <Empty description={t('selectProject')} />
      </div>
    );
  }

  // Initial loading state
  if (loading && companyHealth.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f4f5f7",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {/* Company Filter Header - Fixed position, not draggable */}
      <div style={{ padding: "0 20px", marginBottom: 0, backgroundColor: "#fff" }}>
        <CompanyFilterBar
          companies={companyHealth}
          selectedCompanyIds={selectedCompanyIds}
          totalTickets={totalTickets}
          onToggle={handleCompanyToggle}
          onClearAll={() => setSelectedCompanyIds([])}
          loading={loading}
        />
      </div>

      <DashboardGrid
        widgets={widgets}
        userId={user?.id}
        loading={loading}
        onRefresh={fetchDashboardData}
      />

      {/* Edit Ticket Modal */}
      <TicketModal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        mode="edit"
        onSuccess={handleTicketUpdated}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        columnId={1}
        onSuccess={() => {
          fetchDashboardData();
          setIsCreateModalOpen(false);
        }}
      />
    </>
  );
};

export default Dashboard;
