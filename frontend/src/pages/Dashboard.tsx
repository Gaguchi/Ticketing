/**
 * Dashboard Page
 * Redesigned dashboard with company filter bar and new widget layout
 */

import React, { useState, useEffect, useCallback } from "react";
import { Row, Col, Spin, message, Button, Empty } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useProject, useAuth } from "../contexts/AppContext";
import { TicketModal } from "../components/TicketModal";
import { CreateTicketModal } from "../components/CreateTicketModal";
import {
  CompanyFilterBar,
  KanbanPipeline,
  AttentionNeededCards,
  NewestTicketCards,
  TimelineActivityFeed,
  TeamWorkloadCards,
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

// Style for the hover highlight
const hoverStyles = `
  .hover-highlight:hover {
    background-color: #fafafa !important;
  }
`;

const Dashboard: React.FC = () => {
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null
  );

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
      const companyFilter = selectedCompanyId || undefined;

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
      message.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id, selectedCompanyId]);

  // Fetch data on mount and project change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for WebSocket ticket updates
  useEffect(() => {
    const handleTicketUpdate = () => {
      // Debounce refresh on ticket updates
      fetchDashboardData();
    };

    window.addEventListener("ticketUpdate", handleTicketUpdate);
    return () => window.removeEventListener("ticketUpdate", handleTicketUpdate);
  }, [fetchDashboardData]);

  // Handle ticket click - open modal
  const handleTicketClick = async (ticketId: number) => {
    try {
      const { ticketService } = await import("../services");
      const ticket = await ticketService.getTicket(ticketId);
      setSelectedTicket(ticket);
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
      message.error("Failed to load ticket details");
    }
  };

  // Handle company filter selection
  const handleCompanySelect = (companyId: number | null) => {
    setSelectedCompanyId(companyId);
  };

  // Handle ticket creation success
  const handleTicketCreated = () => {
    fetchDashboardData();
  };

  // Handle ticket update success
  const handleTicketUpdated = () => {
    setSelectedTicket(null);
    fetchDashboardData();
  };

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
        <Empty description="Select a project to view dashboard" />
      </div>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid #e8e8e8",
            backgroundColor: "#fff",
          }}
        >
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            Dashboard
          </h1>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchDashboardData}
            loading={loading}
            size="small"
          >
            Refresh
          </Button>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 20,
            backgroundColor: "#f4f5f7",
          }}
        >
          {loading && companyHealth.length === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* ROW 1: Company Filter Bar (Widget 1B) */}
              <div style={{ marginBottom: 16 }}>
                <CompanyFilterBar
                  companies={companyHealth}
                  selectedCompanyId={selectedCompanyId}
                  totalTickets={totalTickets}
                  onSelect={handleCompanySelect}
                  loading={loading}
                />
              </div>

              {/* ROW 2: Newest Tickets (4A) + Activity Feed (5B) - Fixed height 340px */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={14}>
                  <div style={{ height: 340 }}>
                    <NewestTicketCards
                      tickets={newestTickets}
                      loading={loading}
                      onTicketClick={handleTicketClick}
                      maxCards={8}
                    />
                  </div>
                </Col>
                <Col xs={24} lg={10}>
                  <div style={{ height: 340 }}>
                    <TimelineActivityFeed
                      activities={liveActivity}
                      loading={loading}
                      onTicketClick={handleTicketClick}
                    />
                  </div>
                </Col>
              </Row>

              {/* ROW 3: Attention Needed (3A) 2/3 + Pipeline (2D) 1/3 - Fixed height 320px */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={16}>
                  <div style={{ height: 320 }}>
                    <AttentionNeededCards
                      data={attentionNeeded}
                      loading={loading}
                      onTicketClick={handleTicketClick}
                    />
                  </div>
                </Col>
                <Col xs={24} lg={8}>
                  <div style={{ height: 320 }}>
                    <KanbanPipeline data={kanbanSummary} loading={loading} />
                  </div>
                </Col>
              </Row>

              {/* ROW 4: Team Workload (6C) - 1/3 width */}
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <TeamWorkloadCards
                    workloads={agentWorkload}
                    loading={loading}
                  />
                </Col>
              </Row>
            </>
          )}
        </div>
      </div>

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
        onSuccess={handleTicketCreated}
      />
    </>
  );
};

export default Dashboard;
