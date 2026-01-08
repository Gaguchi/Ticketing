/**
 * KPI (Key Performance Indicators) Page
 * 
 * Role-based views:
 * - Regular Users: Personal dashboard with own stats, resolved tickets, active work
 * - Managers/Superadmins: Team overview with all user metrics + can access personal view
 * - Admins: Own stats + can create reviews
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Spin,
  message,
  Statistic,
  Progress,
  Table,
  Tag,
  Button,
  DatePicker,
  Empty,
  Typography,
  Tooltip,
  Badge,
  Avatar,
  Rate,
  Space,
  Segmented,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TeamOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StarOutlined,
  UserOutlined,
  ReloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  FireOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useProject, useAuth } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import kpiService from '../services/kpi.service';
import type {
  UserMetrics,
  ProjectKPISummary,
  ReviewPrompt,
  MyResolvedTicket,
  MyActiveTicket,
} from '../types/kpi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import UserReviewModal from '../components/UserReviewModal';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ============================================================================
// Helpers
// ============================================================================

function getUserRole(user: any, projectId: number | undefined): string | null {
  if (!user || !projectId) return null;
  const projectRoles = user.project_roles || [];
  const role = projectRoles.find((r: any) => r.project === projectId || r.project_id === projectId);
  return role?.role || null;
}

function canViewAllMetrics(role: string | null): boolean {
  return role === 'superadmin' || role === 'manager';
}

function canCreateReviews(role: string | null): boolean {
  return role === 'superadmin' || role === 'admin';
}

function formatResolutionTime(hours: number | null): string {
  if (hours === null) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function getPriorityColor(priorityName: string | null | undefined): string {
  switch (priorityName?.toLowerCase()) {
    case 'critical': return '#ff4d4f';
    case 'high': return '#fa8c16';
    case 'medium': return '#faad14';
    case 'low': return '#52c41a';
    default: return '#8c8c8c';
  }
}

// ============================================================================
// Personal Stats Card Component
// ============================================================================

interface PersonalStatsProps {
  metrics: UserMetrics | null;
  loading: boolean;
}

const PersonalStatsCard: React.FC<PersonalStatsProps> = ({ metrics, loading }) => {
  if (loading || !metrics) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {/* Tickets Resolved */}
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Tickets Resolved"
            value={metrics.tickets_resolved}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      
      {/* Active Tickets */}
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Active Tickets"
            value={metrics.active_tickets}
            prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      
      {/* Avg Resolution Time */}
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Avg Resolution Time"
            value={formatResolutionTime(metrics.avg_resolution_hours)}
            prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      
      {/* Customer Rating */}
      <Col xs={24} sm={12} md={6}>
        <Card>
          <div>
            <Text type="secondary" style={{ fontSize: 14 }}>Customer Rating</Text>
            <div style={{ marginTop: 8 }}>
              {metrics.avg_customer_rating !== null ? (
                <Space>
                  <Rate disabled value={metrics.avg_customer_rating} allowHalf style={{ fontSize: 20 }} />
                  <Text strong style={{ fontSize: 18 }}>{metrics.avg_customer_rating.toFixed(1)}</Text>
                </Space>
              ) : (
                <Text type="secondary">No ratings yet</Text>
              )}
            </div>
          </div>
        </Card>
      </Col>
      
      {/* Overdue & Acceptance Rate Row */}
      <Col xs={24} sm={12} md={12}>
        <Card>
          <Row gutter={24}>
            <Col span={12}>
              <Statistic
                title="Overdue"
                value={metrics.overdue_count}
                prefix={<WarningOutlined />}
                valueStyle={{ color: metrics.overdue_count > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary" style={{ fontSize: 14 }}>Acceptance Rate</Text>
                {metrics.acceptance_rate !== null ? (
                  <Progress
                    percent={metrics.acceptance_rate}
                    strokeColor={
                      metrics.acceptance_rate >= 80 ? '#52c41a' :
                      metrics.acceptance_rate >= 60 ? '#faad14' : '#ff4d4f'
                    }
                    style={{ marginTop: 8 }}
                  />
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">No data</Text>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      </Col>
      
      {/* Tickets Created */}
      <Col xs={24} sm={12} md={12}>
        <Card>
          <Statistic
            title="Tickets Created (Reported)"
            value={metrics.tickets_created}
            prefix={<LineChartOutlined style={{ color: '#13c2c2' }} />}
          />
        </Card>
      </Col>
    </Row>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const KPIPage: React.FC = () => {
  const { selectedProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Role-based settings
  const userRole = getUserRole(user, selectedProject?.id);
  const isManager = canViewAllMetrics(userRole);
  const canReview = canCreateReviews(userRole);
  
  // View mode: 'personal' for own stats, 'team' for team overview
  const [viewMode, setViewMode] = useState<'personal' | 'team'>(isManager ? 'team' : 'personal');
  
  // Data states
  const [myMetrics, setMyMetrics] = useState<UserMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<UserMetrics[]>([]);
  const [projectSummary, setProjectSummary] = useState<ProjectKPISummary | null>(null);
  const [resolvedTickets, setResolvedTickets] = useState<MyResolvedTicket[]>([]);
  const [activeTickets, setActiveTickets] = useState<MyActiveTicket[]>([]);
  const [reviewPrompts, setReviewPrompts] = useState<ReviewPrompt[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  // Default to current month
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  
  // Modal states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedUserForReview, setSelectedUserForReview] = useState<{
    userId: number;
    username: string;
    ticketId?: number;
    ticketKey?: string;
  } | null>(null);
  
  // Fetch personal data
  const fetchPersonalData = useCallback(async () => {
    if (!selectedProject) return;
    
    const params = {
      project: selectedProject.id,
      date_from: dateRange[0]?.format('YYYY-MM-DD'),
      date_to: dateRange[1]?.format('YYYY-MM-DD'),
    };
    
    try {
      // Fetch my metrics
      const metricsData = await kpiService.fetchMyMetrics(params);
      setMyMetrics(Array.isArray(metricsData) ? metricsData[0] : metricsData);
      
      // Fetch my resolved tickets
      const resolvedResp = await kpiService.fetchMyResolvedTickets(
        selectedProject.id,
        params.date_from,
        params.date_to,
        25
      );
      setResolvedTickets(resolvedResp.results);
      
      // Fetch my active tickets
      const activeResp = await kpiService.fetchMyActiveTickets(selectedProject.id, 25);
      setActiveTickets(activeResp.results);
    } catch (error: any) {
      console.error('Error fetching personal KPI data:', error);
      message.error('Failed to load personal KPI data');
    }
  }, [selectedProject, dateRange]);
  
  // Fetch team data (for managers)
  const fetchTeamData = useCallback(async () => {
    if (!selectedProject) return;
    
    const params = {
      project: selectedProject.id,
      date_from: dateRange[0]?.format('YYYY-MM-DD'),
      date_to: dateRange[1]?.format('YYYY-MM-DD'),
    };
    
    try {
      // Fetch all user metrics
      const metricsData = await kpiService.fetchUserMetrics(params);
      setTeamMetrics(Array.isArray(metricsData) ? metricsData : [metricsData]);
      
      // Fetch project summary
      const summaryData = await kpiService.fetchProjectSummary(params);
      setProjectSummary(summaryData);
      
      // Fetch review prompts
      if (canReview) {
        const prompts = await kpiService.fetchPendingReviewPrompts(selectedProject.id);
        setReviewPrompts(prompts);
      }
    } catch (error: any) {
      console.error('Error fetching team KPI data:', error);
      message.error('Failed to load team KPI data');
    }
  }, [selectedProject, dateRange, canReview]);
  
  // Combined fetch
  const fetchData = useCallback(async () => {
    if (!selectedProject) {
      setMyMetrics(null);
      setTeamMetrics([]);
      setProjectSummary(null);
      setResolvedTickets([]);
      setActiveTickets([]);
      return;
    }
    
    setLoading(true);
    try {
      if (viewMode === 'personal') {
        await fetchPersonalData();
      } else {
        await fetchTeamData();
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProject, viewMode, fetchPersonalData, fetchTeamData]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Modal handlers
  const handleOpenReviewModal = (prompt: ReviewPrompt) => {
    setSelectedUserForReview({
      userId: prompt.user_id,
      username: prompt.username,
      ticketId: prompt.ticket_id,
      ticketKey: prompt.ticket_key,
    });
    setReviewModalOpen(true);
  };
  
  const handleReviewUser = (metrics: UserMetrics) => {
    setSelectedUserForReview({
      userId: metrics.user_id,
      username: metrics.username,
    });
    setReviewModalOpen(true);
  };
  
  const handleReviewSubmitted = () => {
    setReviewModalOpen(false);
    setSelectedUserForReview(null);
    fetchData();
    message.success('Review submitted successfully');
  };
  
  // Navigate to ticket
  const goToTicket = (ticketKey: string) => {
    navigate(`/tickets?ticket=${ticketKey}`);
  };
  
  // No project selected
  if (!selectedProject) {
    return (
      <div style={{ padding: 24 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Please select a project to view KPIs"
        />
      </div>
    );
  }
  
  // Resolved tickets columns
  const resolvedColumns: ColumnsType<MyResolvedTicket> = [
    {
      title: 'Ticket',
      key: 'ticket',
      render: (_, record) => (
        <Button type="link" onClick={() => goToTicket(record.key)} style={{ padding: 0 }}>
          <Space>
            <Text strong>{record.key}</Text>
            <Text ellipsis style={{ maxWidth: 200 }}>{record.name}</Text>
          </Space>
        </Button>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        priority ? (
          <Tag color={getPriorityColor(priority.name)}>{priority.name}</Tag>
        ) : <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (val) => val ? dayjs(val).format('MMM D, YYYY') : '-',
    },
    {
      title: 'Completed',
      dataIndex: 'done_at',
      key: 'done_at',
      width: 120,
      render: (val) => val ? dayjs(val).format('MMM D, YYYY') : '-',
    },
    {
      title: 'Time to Resolve',
      dataIndex: 'resolution_hours',
      key: 'resolution_hours',
      width: 120,
      render: (val) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <Text>{formatResolutionTime(val)}</Text>
        </Space>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'customer_rating',
      key: 'customer_rating',
      width: 140,
      render: (val) => (
        val !== null ? (
          <Rate disabled value={val} style={{ fontSize: 14 }} />
        ) : <Text type="secondary">Not rated</Text>
      ),
    },
  ];
  
  // Active tickets columns
  const activeColumns: ColumnsType<MyActiveTicket> = [
    {
      title: 'Ticket',
      key: 'ticket',
      render: (_, record) => (
        <Button type="link" onClick={() => goToTicket(record.key)} style={{ padding: 0 }}>
          <Space>
            <Text strong>{record.key}</Text>
            <Text ellipsis style={{ maxWidth: 200 }}>{record.name}</Text>
          </Space>
        </Button>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        priority ? (
          <Tag color={getPriorityColor(priority.name)}>{priority.name}</Tag>
        ) : <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        status ? (
          <Tag color={status.color}>{status.name}</Tag>
        ) : <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Days Open',
      dataIndex: 'days_open',
      key: 'days_open',
      width: 100,
      render: (val) => (
        <Space>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text>{val !== null ? `${val}d` : '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Due Date',
      key: 'due',
      width: 140,
      render: (_, record) => {
        if (!record.due_date) return <Text type="secondary">No due date</Text>;
        
        if (record.is_overdue) {
          return (
            <Tooltip title={`${Math.abs(record.days_until_due || 0)} days overdue`}>
              <Tag color="red" icon={<WarningOutlined />}>
                {dayjs(record.due_date).format('MMM D')}
              </Tag>
            </Tooltip>
          );
        }
        
        const daysLeft = record.days_until_due || 0;
        const color = daysLeft <= 2 ? 'orange' : 'default';
        
        return (
          <Tooltip title={`${daysLeft} days left`}>
            <Tag color={color}>{dayjs(record.due_date).format('MMM D')}</Tag>
          </Tooltip>
        );
      },
    },
  ];
  
  // Team metrics columns
  const teamColumns: ColumnsType<UserMetrics> = [
    {
      title: 'User',
      key: 'user',
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <div style={{ fontWeight: 500 }}>{record.first_name} {record.last_name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>@{record.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Resolved',
      dataIndex: 'tickets_resolved',
      key: 'resolved',
      sorter: (a, b) => a.tickets_resolved - b.tickets_resolved,
      render: (val) => (
        <Statistic value={val} valueStyle={{ fontSize: 16 }} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
      ),
    },
    {
      title: 'Active',
      dataIndex: 'active_tickets',
      key: 'active',
      render: (val) => <Tag color={val > 10 ? 'orange' : 'blue'}>{val}</Tag>,
    },
    {
      title: 'Avg Resolution',
      dataIndex: 'avg_resolution_hours',
      key: 'resolution',
      render: (val) => <Text>{formatResolutionTime(val)}</Text>,
    },
    {
      title: 'Overdue',
      dataIndex: 'overdue_count',
      key: 'overdue',
      render: (val) => val > 0 ? <Badge count={val} style={{ backgroundColor: '#ff4d4f' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    },
    {
      title: 'Acceptance',
      dataIndex: 'acceptance_rate',
      key: 'acceptance',
      render: (val) => val !== null ? (
        <Progress percent={val} size="small" strokeColor={val >= 80 ? '#52c41a' : val >= 60 ? '#faad14' : '#ff4d4f'} format={p => `${p?.toFixed(0)}%`} />
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Customer Rating',
      dataIndex: 'avg_customer_rating',
      key: 'customer_rating',
      render: (val) => val !== null ? <Rate disabled value={val} allowHalf style={{ fontSize: 14 }} /> : <Text type="secondary">-</Text>,
    },
    ...(isManager ? [{
      title: 'Admin Rating',
      dataIndex: 'avg_admin_rating' as keyof UserMetrics,
      key: 'admin_rating',
      render: (val: number | null, record: UserMetrics) => (
        <Space>
          {val !== null ? (
            <Tooltip title={`${record.total_admin_reviews} reviews`}>
              <Rate disabled value={val} allowHalf style={{ fontSize: 14 }} />
            </Tooltip>
          ) : <Text type="secondary">No reviews</Text>}
        </Space>
      ),
    }] : []),
    ...(canReview ? [{
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: UserMetrics) => (
        record.user_id !== user?.id && (
          <Button type="link" icon={<StarOutlined />} onClick={() => handleReviewUser(record)}>
            Review
          </Button>
        )
      ),
    }] : []),
  ];
  
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            KPI Dashboard
          </Title>
          <Text type="secondary">
            {selectedProject.name} ({selectedProject.key})
          </Text>
        </Col>
        <Col>
          <Space size="middle">
            {/* View mode toggle (only for managers) */}
            {isManager && (
              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'personal' | 'team')}
                options={[
                  { label: 'My Performance', value: 'personal', icon: <UserOutlined /> },
                  { label: 'Team Overview', value: 'team', icon: <TeamOutlined /> },
                ]}
              />
            )}
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
              allowClear
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>
      
      <Spin spinning={loading}>
        {/* ============================================================ */}
        {/* PERSONAL VIEW */}
        {/* ============================================================ */}
        {viewMode === 'personal' && (
          <>
            {/* Personal Stats Cards */}
            <PersonalStatsCard metrics={myMetrics} loading={loading} />
            
            <Divider />
            
            {/* Active Work Section */}
            <Card
              title={
                <Space>
                  <FireOutlined style={{ color: '#fa541c' }} />
                  <span>My Active Work</span>
                  <Badge count={activeTickets.length} style={{ backgroundColor: '#1890ff' }} />
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              {activeTickets.length > 0 ? (
                <Table
                  dataSource={activeTickets}
                  columns={activeColumns}
                  rowKey="ticket_id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              ) : (
                <Empty description="No active tickets assigned to you" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
            
            {/* Resolved Tickets Section */}
            <Card
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#faad14' }} />
                  <span>Recently Completed</span>
                  <Badge count={resolvedTickets.length} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              }
            >
              {resolvedTickets.length > 0 ? (
                <Table
                  dataSource={resolvedTickets}
                  columns={resolvedColumns}
                  rowKey="ticket_id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              ) : (
                <Empty description="No resolved tickets yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </>
        )}
        
        {/* ============================================================ */}
        {/* TEAM VIEW (Managers/Superadmins) */}
        {/* ============================================================ */}
        {viewMode === 'team' && (
          <>
            {/* Project Summary Cards */}
            {projectSummary && (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Total Tickets"
                      value={projectSummary.total_tickets}
                      prefix={<LineChartOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Avg Resolution Time"
                      value={formatResolutionTime(projectSummary.avg_resolution_hours)}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Overdue"
                      value={projectSummary.overdue_count}
                      valueStyle={{ color: projectSummary.overdue_count > 0 ? '#ff4d4f' : '#52c41a' }}
                      prefix={<WarningOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Customer Rating"
                      value={projectSummary.avg_customer_rating || 0}
                      suffix="/ 5"
                      precision={1}
                      prefix={<StarOutlined style={{ color: '#faad14' }} />}
                    />
                  </Card>
                </Col>
              </Row>
            )}
            
            {/* Tickets by Category & Priority */}
            {projectSummary && (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={12}>
                  <Card title="Tickets by Status" size="small">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic title="To Do" value={projectSummary.tickets_by_category.todo} valueStyle={{ color: '#6B778C' }} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="In Progress" value={projectSummary.tickets_by_category.in_progress} valueStyle={{ color: '#0052CC' }} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="Done" value={projectSummary.tickets_by_category.done} valueStyle={{ color: '#36B37E' }} />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Tickets by Priority" size="small">
                    <Row gutter={16}>
                      <Col span={6}>
                        <Statistic title="Low" value={projectSummary.tickets_by_priority.low} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Medium" value={projectSummary.tickets_by_priority.medium} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="High" value={projectSummary.tickets_by_priority.high} valueStyle={{ color: '#fa8c16' }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Critical" value={projectSummary.tickets_by_priority.critical} valueStyle={{ color: '#ff4d4f' }} />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            )}
            
            {/* Pending Review Prompts */}
            {canReview && reviewPrompts.length > 0 && (
              <Card
                title={
                  <Space>
                    <StarOutlined style={{ color: '#faad14' }} />
                    Pending Reviews
                    <Badge count={reviewPrompts.length} />
                  </Space>
                }
                style={{ marginBottom: 24 }}
                size="small"
              >
                <Row gutter={[16, 16]}>
                  {reviewPrompts.slice(0, 6).map((prompt) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={`${prompt.ticket_id}-${prompt.user_id}`}>
                      <Card size="small" hoverable onClick={() => handleOpenReviewModal(prompt)}>
                        <Space direction="vertical" size={4}>
                          <Text strong>{prompt.first_name} {prompt.last_name}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {prompt.ticket_key}: {prompt.ticket_name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Resolved {prompt.resolved_at ? dayjs(prompt.resolved_at).fromNow() : 'recently'}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
            
            {/* Team Performance Table */}
            <Card
              title={
                <Space>
                  <TeamOutlined />
                  Team Performance
                </Space>
              }
            >
              <Table
                dataSource={teamMetrics}
                columns={teamColumns}
                rowKey="user_id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
            
            {/* Top Performers */}
            {projectSummary && projectSummary.top_performers.length > 0 && (
              <Card
                title={
                  <Space>
                    <TrophyOutlined style={{ color: '#faad14' }} />
                    Top Performers
                  </Space>
                }
                style={{ marginTop: 24 }}
              >
                <Row gutter={[16, 16]}>
                  {projectSummary.top_performers.map((performer, index) => (
                    <Col xs={24} sm={12} md={8} lg={4} key={performer.user_id}>
                      <Card size="small" hoverable>
                        <Space direction="vertical" align="center" style={{ width: '100%' }}>
                          <Badge
                            count={index + 1}
                            style={{ backgroundColor: index === 0 ? '#faad14' : index === 1 ? '#a0a0a0' : '#cd7f32' }}
                          >
                            <Avatar size={48} icon={<UserOutlined />} />
                          </Badge>
                          <Text strong>{performer.first_name} {performer.last_name}</Text>
                          <Text type="secondary">{performer.tickets_resolved} resolved</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
          </>
        )}
      </Spin>
      
      {/* User Review Modal */}
      {reviewModalOpen && selectedUserForReview && selectedProject && (
        <UserReviewModal
          open={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedUserForReview(null);
          }}
          onSubmit={handleReviewSubmitted}
          userId={selectedUserForReview.userId}
          username={selectedUserForReview.username}
          projectId={selectedProject.id}
          ticketId={selectedUserForReview.ticketId}
          ticketKey={selectedUserForReview.ticketKey}
        />
      )}
    </div>
  );
};

export default KPIPage;
