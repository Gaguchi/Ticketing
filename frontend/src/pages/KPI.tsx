/**
 * KPI (Key Performance Indicators) Page
 * 
 * Shows personal performance metrics for the current user:
 * - Tickets completed and resolution times
 * - Average customer rating
 * - Acceptance rate
 * - List of completed tickets with details
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
  Rate,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  BarChartOutlined,
  StarFilled,
  LikeOutlined,
} from '@ant-design/icons';
import { useProject } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import kpiService from '../services/kpi.service';
import type {
  UserMetrics,
  MyResolvedTicket,
} from '../types/kpi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ============================================================================
// Helpers
// ============================================================================

function formatResolutionTime(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '-';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hours`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)} days`;
  return `${(days / 7).toFixed(1)} weeks`;
}

function getPriorityFromId(priorityId: number | null | undefined): { name: string; color: string } {
  switch (priorityId) {
    case 4: return { name: 'Critical', color: '#ff4d4f' };
    case 3: return { name: 'High', color: '#fa8c16' };
    case 2: return { name: 'Medium', color: '#faad14' };
    case 1: return { name: 'Low', color: '#52c41a' };
    default: return { name: 'Unknown', color: '#8c8c8c' };
  }
}

// ============================================================================
// Main Component
// ============================================================================

const KPIPage: React.FC = () => {
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  
  // Data states
  const [myMetrics, setMyMetrics] = useState<UserMetrics | null>(null);
  const [resolvedTickets, setResolvedTickets] = useState<MyResolvedTicket[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Default to last 30 days
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  
  // Fetch data
  const fetchData = useCallback(async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    setTableLoading(true);
    
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
        50 // Get more tickets
      );
      setResolvedTickets(resolvedResp.results || []);
    } catch (error: any) {
      console.error('Error fetching KPI data:', error);
      message.error('Failed to load KPI data');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [selectedProject, dateRange]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Table columns for resolved tickets
  const resolvedColumns: ColumnsType<MyResolvedTicket> = [
    {
      title: 'Ticket',
      key: 'ticket',
      width: 300,
      render: (_, record) => (
        <div>
          <Button 
            type="link" 
            style={{ padding: 0, height: 'auto' }}
            onClick={() => navigate(`/tickets/${record.ticket_id}`)}
          >
            <Text strong>{record.key}</Text>
          </Button>
          <div>
            <Text type="secondary" ellipsis style={{ maxWidth: 250 }}>
              {record.name}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 100,
      render: (_, record) => {
        const priority = record.priority || getPriorityFromId((record as any).priority_id);
        return (
          <Tag color={priority.color} style={{ margin: 0 }}>
            {priority.name}
          </Tag>
        );
      },
    },
    {
      title: 'Resolution Time',
      dataIndex: 'resolution_hours',
      key: 'resolution_hours',
      width: 140,
      sorter: (a, b) => (a.resolution_hours || 0) - (b.resolution_hours || 0),
      render: (hours: number | null) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#722ed1' }} />
          <Text>{formatResolutionTime(hours)}</Text>
        </Space>
      ),
    },
    {
      title: 'Completed',
      dataIndex: 'done_at',
      key: 'done_at',
      width: 150,
      sorter: (a, b) => {
        if (!a.done_at) return 1;
        if (!b.done_at) return -1;
        return dayjs(b.done_at).unix() - dayjs(a.done_at).unix();
      },
      defaultSortOrder: 'ascend',
      render: (date: string | null) => (
        <Tooltip title={date ? dayjs(date).format('MMM D, YYYY h:mm A') : '-'}>
          <Text type="secondary">
            {date ? dayjs(date).fromNow() : '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'customer_rating',
      key: 'customer_rating',
      width: 130,
      render: (rating: number | null) => (
        rating ? (
          <Rate disabled value={rating} style={{ fontSize: 14 }} />
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Status',
      dataIndex: 'resolution_status',
      key: 'resolution_status',
      width: 100,
      render: (status: string | null) => {
        if (!status) return <Text type="secondary">-</Text>;
        const color = status === 'accepted' ? 'green' : status === 'rejected' ? 'red' : 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];
  
  // Redirect if no project
  if (!selectedProject) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="Please select a project to view KPI data" />
      </div>
    );
  }
  
  // Calculate quick stats from resolved tickets
  const totalResolved = resolvedTickets.length;
  const ticketsWithTime = resolvedTickets.filter(t => t.resolution_hours != null);
  const avgResolutionTime = ticketsWithTime.length > 0
    ? ticketsWithTime.reduce((sum, t) => sum + (t.resolution_hours || 0), 0) / ticketsWithTime.length
    : null;
  const ticketsWithRating = resolvedTickets.filter(t => t.customer_rating);
  const avgRating = ticketsWithRating.length > 0
    ? ticketsWithRating.reduce((sum, t) => sum + (t.customer_rating || 0), 0) / ticketsWithRating.length
    : null;
  const acceptedCount = resolvedTickets.filter(t => t.resolution_status === 'accepted').length;
  const reviewedCount = resolvedTickets.filter(t => t.resolution_status === 'accepted' || t.resolution_status === 'rejected').length;
  const acceptanceRate = reviewedCount > 0 ? (acceptedCount / reviewedCount) * 100 : null;
  
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            My Performance
          </Title>
          <Text type="secondary">{selectedProject.name} ({selectedProject.key})</Text>
        </Col>
        <Col>
          <Space size="middle">
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
              presets={[
                { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
                { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
                { label: 'Last 90 Days', value: [dayjs().subtract(90, 'day'), dayjs()] },
                { label: 'This Month', value: [dayjs().startOf('month'), dayjs()] },
                { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>
      
      <Spin spinning={loading}>
        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Tickets Completed */}
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tickets Completed"
                value={myMetrics?.tickets_resolved ?? totalResolved}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: 32 }}
              />
            </Card>
          </Col>
          
          {/* Average Resolution Time */}
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Avg Resolution Time"
                value={formatResolutionTime(myMetrics?.avg_resolution_hours ?? avgResolutionTime)}
                prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1', fontSize: 32 }}
              />
            </Card>
          </Col>
          
          {/* Customer Rating */}
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <div>
                <Text type="secondary">Customer Rating</Text>
                <div style={{ marginTop: 8 }}>
                  {(myMetrics?.avg_customer_rating ?? avgRating) ? (
                    <Space align="center">
                      <StarFilled style={{ color: '#faad14', fontSize: 28 }} />
                      <Text strong style={{ fontSize: 32, color: '#faad14' }}>
                        {(myMetrics?.avg_customer_rating ?? avgRating)?.toFixed(1)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 14 }}>/ 5</Text>
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 18 }}>No ratings yet</Text>
                  )}
                </div>
              </div>
            </Card>
          </Col>
          
          {/* Acceptance Rate */}
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <div>
                <Text type="secondary">Acceptance Rate</Text>
                <div style={{ marginTop: 8 }}>
                  {(myMetrics?.acceptance_rate ?? acceptanceRate) !== null ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space align="center">
                        <LikeOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                        <Text strong style={{ fontSize: 28 }}>
                          {(myMetrics?.acceptance_rate ?? acceptanceRate)?.toFixed(0)}%
                        </Text>
                      </Space>
                      <Progress 
                        percent={myMetrics?.acceptance_rate ?? acceptanceRate ?? 0} 
                        showInfo={false}
                        strokeColor={
                          (myMetrics?.acceptance_rate ?? acceptanceRate ?? 0) >= 80 ? '#52c41a' :
                          (myMetrics?.acceptance_rate ?? acceptanceRate ?? 0) >= 60 ? '#faad14' : '#ff4d4f'
                        }
                        size="small"
                      />
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 18 }}>No reviews yet</Text>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        </Row>
        
        {/* Completed Tickets Table */}
        <Card 
          title={
            <Space>
              <TrophyOutlined style={{ color: '#faad14' }} />
              <span>Completed Tickets</span>
              <Tag>{resolvedTickets.length}</Tag>
            </Space>
          }
        >
          <Table
            columns={resolvedColumns}
            dataSource={resolvedTickets}
            rowKey="ticket_id"
            loading={tableLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tickets`,
            }}
            locale={{
              emptyText: (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No completed tickets in this period"
                />
              ),
            }}
            scroll={{ x: 900 }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default KPIPage;
