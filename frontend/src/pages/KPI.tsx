/**
 * KPI (Key Performance Indicators) Page
 *
 * Tabbed layout:
 * - My Performance: interactive donut chart + indicator summary + drill-down
 * - KPI Builder: configure indicators and weights (superadmin only)
 * - Scoreboard: team scores based on weighted indicators (superadmin + manager)
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Row,
  Col,
  Card,
  Spin,
  Statistic,
  Table,
  Tag,
  Button,
  DatePicker,
  Empty,
  Typography,
  Tooltip,
  Rate,
  Space,
  Tabs,
  Alert,
  Select,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  ReloadOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useProject } from "../contexts/AppContext";
import kpiService from "../services/kpi.service";
import type {
  UserMetrics,
  MyResolvedTicket,
  PersonalScoreResponse,
  PersonalIndicatorScore,
} from "../types/kpi";
import type { ScoreboardMember } from "../services/kpi.service";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import KPIBuilder from "../components/kpi/KPIBuilder";
import KPIScoreboard from "../components/kpi/KPIScoreboard";
import NightingaleChart from "../components/kpi/NightingaleChart";
import IndicatorSummaryList from "../components/kpi/IndicatorSummaryList";
import IndicatorDrillDown from "../components/kpi/IndicatorDrillDown";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// ============================================================================
// Helpers
// ============================================================================

function formatResolutionTime(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "-";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hours`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)} days`;
  return `${(days / 7).toFixed(1)} weeks`;
}

function getPriorityFromId(priorityId: number | null | undefined): {
  name: string;
  color: string;
} {
  switch (priorityId) {
    case 4:
      return { name: "Critical", color: "#ff4d4f" };
    case 3:
      return { name: "High", color: "#fa8c16" };
    case 2:
      return { name: "Medium", color: "#faad14" };
    case 1:
      return { name: "Low", color: "#52c41a" };
    default:
      return { name: "Unknown", color: "#8c8c8c" };
  }
}

// ============================================================================
// Fallback Stats (Professional Minimalist)
// ============================================================================

const FallbackStats: React.FC<{
  myMetrics: UserMetrics | null;
  resolvedTickets: MyResolvedTicket[];
}> = ({ myMetrics, resolvedTickets }) => {
  const totalResolved = resolvedTickets.length;
  const avgResolution = myMetrics?.avg_resolution_hours;
  const rating = myMetrics?.avg_customer_rating;
  const slaCompliance = myMetrics?.sla_compliance_rate;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={6}>
        <Card
          size="small"
          style={{ height: "100%", borderTop: "2px solid #3498DB" }}
        >
          <Statistic
            title={<Text type="secondary">Tickets Resolved</Text>}
            value={myMetrics?.tickets_resolved ?? totalResolved}
            valueStyle={{ fontWeight: 600 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card
          size="small"
          style={{ height: "100%", borderTop: "2px solid #9B59B6" }}
        >
          <Statistic
            title={<Text type="secondary">Avg Resolution</Text>}
            value={formatResolutionTime(avgResolution ?? undefined)}
            valueStyle={{ fontWeight: 600 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card
          size="small"
          style={{ height: "100%", borderTop: "2px solid #F39C12" }}
        >
          <Statistic
            title={<Text type="secondary">Customer Rating</Text>}
            value={rating ? rating.toFixed(1) : "-"}
            suffix={rating ? "/ 5" : ""}
            valueStyle={{ fontWeight: 600 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card
          size="small"
          style={{ height: "100%", borderTop: "2px solid #27AE60" }}
        >
          <Statistic
            title={<Text type="secondary">SLA Compliance</Text>}
            value={slaCompliance ? slaCompliance.toFixed(0) : "-"}
            suffix={slaCompliance ? "%" : ""}
            valueStyle={{ fontWeight: 600 }}
          />
        </Card>
      </Col>
    </Row>
  );
};

// ============================================================================
// My Performance Component
// ============================================================================

interface MyPerformanceProps {
  userRole: string | null;
}

const MyPerformance: React.FC<MyPerformanceProps> = ({ userRole }) => {
  const { selectedProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());

  // User selector (superadmin/manager only)
  const isManagerOrAbove = userRole === "superadmin" || userRole === "manager";
  const [teamMembers, setTeamMembers] = useState<ScoreboardMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(
    undefined,
  );

  // KPI Data
  const [scoreData, setScoreData] = useState<PersonalScoreResponse | null>(
    null,
  );
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] =
    useState<PersonalIndicatorScore | null>(null);

  // Fallback / History Data
  const [myMetrics, setMyMetrics] = useState<UserMetrics | null>(null);
  const [resolvedTickets, setResolvedTickets] = useState<MyResolvedTicket[]>(
    [],
  );

  // Fetch team members for the user selector
  useEffect(() => {
    if (!selectedProject || !isManagerOrAbove) return;
    kpiService
      .fetchScoreboardMembers(selectedProject.id)
      .then(setTeamMembers)
      .catch(() => setTeamMembers([]));
  }, [selectedProject, isManagerOrAbove]);

  const fetchScoreData = useCallback(async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const start = selectedMonth.startOf("month").format("YYYY-MM-DD");
      const end = selectedMonth.endOf("month").format("YYYY-MM-DD");

      // 1. Fetch KPI Score (Nightingale)
      try {
        const score = await kpiService.fetchMyScore(
          selectedProject.id,
          start,
          end,
          selectedUserId,
        );
        setScoreData(score);
        setHasConfig(true);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setHasConfig(false); // No config found
        } else {
          console.error("Failed to fetch score", err);
        }
      }

      // 2. Fetch Basic Metrics (Fallback)
      const metricsRes = await kpiService.fetchMyMetrics({
        project: selectedProject.id,
        date_from: start,
        date_to: end,
      });
      // Handle potential array return
      const metrics = Array.isArray(metricsRes) ? metricsRes[0] : metricsRes;
      setMyMetrics(metrics || null);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      // message.error('Failed to load performance data'); // Optional: don't spam errors on standard views
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedMonth, selectedUserId]);

  const fetchResolvedTickets = useCallback(async () => {
    if (!selectedProject) return;
    try {
      setTableLoading(true);
      const start = selectedMonth.startOf("month").format("YYYY-MM-DD");
      const end = selectedMonth.endOf("month").format("YYYY-MM-DD");

      const response = await kpiService.fetchMyResolvedTickets(
        selectedProject.id,
        start,
        end,
        50,
      );
      setResolvedTickets(response.results);
    } catch (error) {
      console.error("Failed to fetch resolved tickets", error);
    } finally {
      setTableLoading(false);
    }
  }, [selectedProject, selectedMonth]);

  useEffect(() => {
    if (selectedProject) {
      fetchScoreData();
      fetchResolvedTickets();
    }
  }, [fetchScoreData, fetchResolvedTickets]);

  const handleSegmentClick = (indicator: PersonalIndicatorScore | null) => {
    if (!indicator) {
      setActiveSegment(null);
      setSelectedIndicator(null);
      return;
    }
    // Toggle if clicking same
    if (activeSegment === indicator.metric_key) {
      setActiveSegment(null);
      setSelectedIndicator(null);
    } else {
      setActiveSegment(indicator.metric_key);
      setSelectedIndicator(indicator);
    }
  };

  const handleDrillDownClose = () => {
    setActiveSegment(null);
    setSelectedIndicator(null);
  };

  const resolvedColumns: ColumnsType<MyResolvedTicket> = [
    {
      title: "Ticket",
      dataIndex: "key",
      key: "key",
      width: 100,
      render: (key) => <Tag>{key}</Tag>,
    },
    {
      title: "Title",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (p) => {
        const { name, color } = getPriorityFromId(p?.id);
        return <Tag color={color}>{name}</Tag>;
      },
    },
    {
      title: "Time",
      dataIndex: "resolution_hours",
      key: "resolution_hours",
      width: 120,
      render: (h) => formatResolutionTime(h),
    },
    {
      title: "Resolved",
      dataIndex: "done_at", // Definition says 'done_at' or 'resolved_at'? Definition says 'done_at'.
      key: "done_at",
      width: 150,
      render: (d) => (
        <Tooltip title={dayjs(d).format("YYYY-MM-DD HH:mm")}>
          {dayjs(d).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: "Rating",
      dataIndex: "customer_rating",
      key: "customer_rating",
      width: 120,
      render: (r) =>
        r ? (
          <Rate disabled allowHalf defaultValue={r} style={{ fontSize: 'var(--fs-sm)' }} />
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  // Helper vars for drilldown
  const dateFrom = selectedMonth.startOf("month").format("YYYY-MM-DD");
  const dateTo = selectedMonth.endOf("month").format("YYYY-MM-DD");

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Filters & Actions */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {isManagerOrAbove && teamMembers.length > 0 && (
          <Select
            value={selectedUserId ?? "me"}
            onChange={(val) =>
              setSelectedUserId(val === "me" ? undefined : (val as number))
            }
            style={{ minWidth: 200 }}
            suffixIcon={<UserOutlined />}
          >
            <Select.Option value="me">My Performance</Select.Option>
            {teamMembers.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.first_name || m.last_name
                  ? `${m.first_name} ${m.last_name}`.trim()
                  : m.username}{" "}
                <Text type="secondary" style={{ fontSize: 'var(--fs-xs)' }}>
                  ({m.role})
                </Text>
              </Select.Option>
            ))}
          </Select>
        )}
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={(date) => {
            if (date) setSelectedMonth(date);
          }}
          allowClear={false}
          disabledDate={(current) =>
            current && current > dayjs().endOf("month")
          }
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchScoreData();
            fetchResolvedTickets();
          }}
        />
      </div>

      <Spin spinning={loading}>
        {/* Nightingale Chart + Breakdowns */}
        {hasConfig && scoreData && scoreData.indicators.length > 0 ? (
          <>
            <Row
              gutter={[24, 24]}
              style={{ marginBottom: 24, alignItems: "stretch" }}
            >
              {/* Chart Column */}
              <Col xs={24} lg={10} xl={9}>
                <Card
                  bordered={false}
                  style={{
                    height: "100%",
                    borderRadius: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <Title level={4} style={{ marginBottom: 0 }}>
                      Performance Score
                    </Title>
                    <Text type="secondary">Weighted KPI metrics</Text>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <NightingaleChart
                      indicators={scoreData.indicators}
                      totalScore={scoreData.total_score}
                      totalWeight={scoreData.total_weight}
                      scorePercentage={scoreData.score_percentage}
                      activeSegment={activeSegment}
                      onSegmentClick={handleSegmentClick}
                      size={320}
                    />
                  </div>
                </Card>
              </Col>

              {/* Indicator summary list */}
              <Col xs={24} lg={14} xl={15}>
                <Card
                  bordered={false}
                  style={{
                    height: "100%",
                    borderRadius: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Title level={4} style={{ margin: 0 }}>
                      Metrics Breakdown
                    </Title>
                    {selectedIndicator && (
                      <Button
                        size="small"
                        onClick={() => handleSegmentClick(null)}
                      >
                        Close Details
                      </Button>
                    )}
                  </div>

                  <IndicatorSummaryList
                    indicators={scoreData.indicators}
                    activeSegment={activeSegment}
                    onSelect={handleSegmentClick}
                  />

                  {selectedIndicator && (
                    <Alert
                      message="Scroll down to see detailed drill-down analysis"
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  )}
                </Card>
              </Col>
            </Row>

            {/* Drill-down panel */}
            {selectedIndicator && (
              <div style={{ marginBottom: 24, animation: "fadeIn 0.3s ease" }}>
                <IndicatorDrillDown
                  indicator={selectedIndicator}
                  projectId={selectedProject!.id}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onClose={handleDrillDownClose}
                />
              </div>
            )}
          </>
        ) : hasConfig === false ? (
          <>
            <Alert
              message="KPI not configured"
              description="Project config required."
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />
            <FallbackStats
              myMetrics={myMetrics}
              resolvedTickets={resolvedTickets}
            />
          </>
        ) : (
          <FallbackStats
            myMetrics={myMetrics}
            resolvedTickets={resolvedTickets}
          />
        )}

        {/* Completed Tickets Table */}
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              <span>Resolved Tickets History</span>
            </Space>
          }
          bordered={false}
          style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}
          extra={<Tag>{resolvedTickets.length} tickets in range</Tag>}
        >
          <Table
            columns={resolvedColumns}
            dataSource={resolvedTickets}
            rowKey="ticket_id"
            loading={tableLoading}
            pagination={{
              pageSize: 5,
              showSizeChanger: true,
              pageSizeOptions: ["5", "10", "20", "50"],
            }}
            size="middle"
          />
        </Card>
      </Spin>
    </div>
  );
};

// ============================================================================
// Main KPI Page with Tabs
// ============================================================================

const KPIPage: React.FC = () => {
  const { selectedProject } = useProject();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject) {
      setUserRole(null);
      return;
    }

    const fetchRole = async () => {
      try {
        const metricsData = await kpiService.fetchMyMetrics({
          project: selectedProject.id,
        });
        const data = Array.isArray(metricsData) ? metricsData[0] : metricsData;
        setUserRole((data as any)?.role ?? null);
      } catch {
        setUserRole(null);
      }
    };

    fetchRole();
  }, [selectedProject?.id]);

  if (!selectedProject) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Empty description="Please select a project to view KPI data" />
      </div>
    );
  }

  const isSuperadmin = userRole === "superadmin";
  const isManagerOrAbove = userRole === "superadmin" || userRole === "manager";

  const tabItems = [
    {
      key: "performance",
      label: (
        <span>
          <BarChartOutlined />
          Performance
        </span>
      ),
      children: <MyPerformance userRole={userRole} />,
    },
  ];

  if (isSuperadmin) {
    tabItems.push({
      key: "builder",
      label: (
        <span>
          <SettingOutlined />
          KPI Builder
        </span>
      ),
      children: <KPIBuilder />,
    });
  }

  if (isManagerOrAbove) {
    tabItems.push({
      key: "scoreboard",
      label: (
        <span>
          <TeamOutlined />
          Scoreboard
        </span>
      ),
      children: <KPIScoreboard />,
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        KPI
      </Title>
      <Tabs items={tabItems} defaultActiveKey="performance" />
    </div>
  );
};

export default KPIPage;
