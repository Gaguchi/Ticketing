import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Spin,
  Rate,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CloseOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell as RechartsCell, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import kpiService from '../../services/kpi.service';
import type { PersonalIndicatorScore, MyResolvedTicket } from '../../types/kpi';
import dayjs from 'dayjs';

const { Text } = Typography;

interface IndicatorDrillDownProps {
  indicator: PersonalIndicatorScore;
  projectId: number;
  dateFrom?: string;
  dateTo?: string;
  onClose: () => void;
}

function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)}d`;
  return `${(days / 7).toFixed(1)}w`;
}

const IndicatorDrillDown: React.FC<IndicatorDrillDownProps> = ({
  indicator,
  projectId,
  dateFrom,
  dateTo,
  onClose,
}) => {
  const navigate = useNavigate();
  const [resolvedTickets, setResolvedTickets] = useState<MyResolvedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      const key = indicator.metric_key;

      // Check cache
      if (cacheRef.current[key]) {
        const cached = cacheRef.current[key];
        if (cached.resolved) setResolvedTickets(cached.resolved);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // All current indicators use resolved tickets data
        const resp = await kpiService.fetchMyResolvedTickets(projectId, dateFrom, dateTo, 100);
        const resolved = resp.results || [];
        setResolvedTickets(resolved);

        cacheRef.current[key] = { resolved };
      } catch (error) {
        console.error('Drill-down fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [indicator.metric_key, projectId, dateFrom, dateTo]);

  const ticketLink = (id: number, label: string) => (
    <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/tickets/${id}`)}>
      {label}
    </Button>
  );

  const renderContent = () => {
    const key = indicator.metric_key;

    if (key === 'avg_resolution_hours') {
      const sorted = [...resolvedTickets]
        .filter((t) => t.resolution_hours != null)
        .sort((a, b) => (a.resolution_hours || 0) - (b.resolution_hours || 0));

      const cols: ColumnsType<MyResolvedTicket> = [
        { title: 'Ticket', key: 'key', width: 100, render: (_, r) => ticketLink(r.ticket_id, r.key) },
        { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
        {
          title: 'Resolution Time',
          key: 'time',
          width: 180,
          render: (_, r) => {
            const hours = r.resolution_hours || 0;
            const maxHours = Math.max(...sorted.map((t) => t.resolution_hours || 0), 1);
            const pct = Math.min((hours / maxHours) * 100, 100);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  height: 6,
                  borderRadius: 3,
                  background: hours > 48 ? '#E74C3C' : hours > 24 ? '#F39C12' : '#27AE60',
                  width: `${Math.max(pct, 8)}%`,
                  maxWidth: 80,
                  minWidth: 4,
                }} />
                <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatHours(r.resolution_hours)}</Text>
              </div>
            );
          },
        },
      ];
      return <Table columns={cols} dataSource={sorted} rowKey="ticket_id" pagination={{ pageSize: 8 }} size="small" />;
    }

    if (key === 'avg_customer_rating') {
      const rated = resolvedTickets.filter((t) => t.customer_rating);
      // Rating distribution for histogram
      const dist = [1, 2, 3, 4, 5].map((star) => ({
        star: `${star}★`,
        count: rated.filter((t) => t.customer_rating === star).length,
        value: star,
      }));
      const barColors = ['#E74C3C', '#E67E22', '#F39C12', '#27AE60', '#27AE60'];

      return (
        <div>
          {rated.length > 0 && (
            <div style={{ height: 120, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist} barSize={28}>
                  <XAxis dataKey="star" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
                  <Tooltip formatter={(val) => [`${val} tickets`, 'Count']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {dist.map((_, idx) => (
                      <RechartsCell key={idx} fill={barColors[idx]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <Table
            columns={[
              { title: 'Ticket', key: 'key', width: 100, render: (_: any, r: MyResolvedTicket) => ticketLink(r.ticket_id, r.key) },
              { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
              {
                title: 'Rating',
                dataIndex: 'customer_rating',
                key: 'rating',
                width: 140,
                render: (v: number | null) => v ? <Rate disabled value={v} style={{ fontSize: 13 }} /> : '-',
              },
            ]}
            dataSource={rated}
            rowKey="ticket_id"
            pagination={{ pageSize: 6 }}
            size="small"
          />
        </div>
      );
    }

    if (key === 'tickets_resolved') {
      const cols: ColumnsType<MyResolvedTicket> = [
        { title: 'Ticket', key: 'key', width: 100, render: (_, r) => ticketLink(r.ticket_id, r.key) },
        { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
        {
          title: 'Completed',
          dataIndex: 'done_at',
          key: 'done_at',
          width: 110,
          render: (d: string | null) => d ? dayjs(d).format('MMM D') : '-',
        },
      ];
      return <Table columns={cols} dataSource={resolvedTickets} rowKey="ticket_id" pagination={{ pageSize: 8 }} size="small" />;
    }

    if (key === 'tickets_created') {
      return (
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <InfoCircleOutlined style={{ fontSize: 24, color: '#3498DB', marginBottom: 8 }} />
          <div>
            <Text strong style={{ fontSize: 20 }}>{indicator.raw_value ?? 0}</Text>
            <Text type="secondary"> tickets created in this period</Text>
          </div>
        </div>
      );
    }

    if (key === 'avg_first_response_hours') {
      const withPickup = resolvedTickets.filter((t) => t.first_response_hours != null);
      const sorted = [...withPickup].sort((a, b) => (a.first_response_hours || 0) - (b.first_response_hours || 0));
      const noPickup = resolvedTickets.filter((t) => t.first_response_hours == null);

      const cols: ColumnsType<MyResolvedTicket> = [
        { title: 'Ticket', key: 'key', width: 100, render: (_, r) => ticketLink(r.ticket_id, r.key) },
        { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
        {
          title: 'Pickup Time',
          key: 'response',
          width: 180,
          render: (_, r) => {
            if (r.first_response_hours == null) return <Text type="secondary">No data</Text>;
            const hours = r.first_response_hours;
            const maxH = Math.max(...sorted.map((t) => t.first_response_hours || 0), 1);
            const pct = Math.min((hours / maxH) * 100, 100);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  height: 6,
                  borderRadius: 3,
                  background: hours > 24 ? '#E74C3C' : hours > 8 ? '#F39C12' : '#27AE60',
                  width: `${Math.max(pct, 8)}%`,
                  maxWidth: 80,
                  minWidth: 4,
                }} />
                <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatHours(r.first_response_hours)}</Text>
              </div>
            );
          },
        },
      ];

      return (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
            <Text type="secondary">
              Average: <Text strong>{indicator.raw_value !== null ? formatHours(indicator.raw_value) : '-'}</Text>
            </Text>
            <Text type="secondary">
              {withPickup.length} assigned · {noPickup.length} no assignment data
            </Text>
          </div>
          <Table columns={cols} dataSource={[...sorted, ...noPickup]} rowKey="ticket_id" pagination={{ pageSize: 8 }} size="small" />
        </div>
      );
    }

    if (key === 'sla_compliance_rate') {
      const withDue = resolvedTickets.filter((t) => t.sla_met !== null);
      const met = withDue.filter((t) => t.sla_met === true);
      const missed = withDue.filter((t) => t.sla_met === false);
      const noDue = resolvedTickets.filter((t) => t.sla_met === null);

      const cols: ColumnsType<MyResolvedTicket> = [
        { title: 'Ticket', key: 'key', width: 100, render: (_, r) => ticketLink(r.ticket_id, r.key) },
        { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
        {
          title: 'Due Date',
          key: 'due',
          width: 100,
          render: (_, r) => r.due_date ? dayjs(r.due_date).format('MMM D') : '-',
        },
        {
          title: 'Done',
          key: 'done',
          width: 100,
          render: (_, r) => r.done_at ? dayjs(r.done_at).format('MMM D') : '-',
        },
        {
          title: 'SLA',
          key: 'sla',
          width: 80,
          align: 'center' as const,
          render: (_, r) => {
            if (r.sla_met === null) return <Text type="secondary">N/A</Text>;
            return r.sla_met
              ? <CheckCircleOutlined style={{ color: '#27AE60', fontSize: 16 }} />
              : <WarningOutlined style={{ color: '#E74C3C', fontSize: 16 }} />;
          },
        },
      ];

      return (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
            <Text type="secondary">
              Rate: <Text strong>{indicator.raw_value !== null ? `${indicator.raw_value.toFixed(1)}%` : '-'}</Text>
            </Text>
            <Text type="secondary">
              <Text style={{ color: '#27AE60' }}>{met.length} on time</Text>
              {' · '}
              <Text style={{ color: '#E74C3C' }}>{missed.length} late</Text>
              {' · '}
              {noDue.length} no due date
            </Text>
          </div>
          <Table columns={cols} dataSource={[...missed, ...met]} rowKey="ticket_id" pagination={{ pageSize: 8 }} size="small" />
        </div>
      );
    }

    if (key === 'reopen_rate') {
      const reopened = resolvedTickets.filter((t) => t.was_reopened);
      const notReopened = resolvedTickets.filter((t) => !t.was_reopened);

      const cols: ColumnsType<MyResolvedTicket> = [
        { title: 'Ticket', key: 'key', width: 100, render: (_, r) => ticketLink(r.ticket_id, r.key) },
        { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
        {
          title: 'Completed',
          key: 'done_at',
          width: 100,
          render: (_, r) => r.done_at ? dayjs(r.done_at).format('MMM D') : '-',
        },
        {
          title: 'Reopened',
          key: 'reopened',
          width: 90,
          align: 'center' as const,
          render: (_, r) => r.was_reopened
            ? <Tag color="red">Yes</Tag>
            : <Tag color="green">No</Tag>,
        },
      ];

      return (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
            <Text type="secondary">
              Rate: <Text strong>{indicator.raw_value !== null ? `${indicator.raw_value.toFixed(1)}%` : '-'}</Text>
            </Text>
            <Text type="secondary">
              <Text style={{ color: '#E74C3C' }}>{reopened.length} reopened</Text>
              {' · '}
              {notReopened.length} stable
            </Text>
          </div>
          <Table columns={cols} dataSource={[...reopened, ...notReopened]} rowKey="ticket_id" pagination={{ pageSize: 8 }} size="small" />
        </div>
      );
    }

    return <Empty description="No drill-down data available" />;
  };

  const scorePct = indicator.weight > 0
    ? ((indicator.weighted_score / indicator.weight) * 100).toFixed(0)
    : '0';

  return (
    <Card
      size="small"
      style={{ borderLeft: `3px solid ${indicator.color}` }}
      title={
        <Space>
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: indicator.color,
            display: 'inline-block',
          }} />
          <span>{indicator.name}</span>
          <Tag>{indicator.weighted_score.toFixed(1)} / {indicator.weight} pts ({scorePct}%)</Tag>
        </Space>
      }
      extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
    >
      {/* Formula */}
      <div style={{
        background: '#f5f5f5',
        borderRadius: 4,
        padding: '6px 10px',
        marginBottom: 12,
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#4A4A4A',
        overflowX: 'auto',
      }}>
        {indicator.formula}
      </div>

      <Spin spinning={loading}>
        {renderContent()}
      </Spin>
    </Card>
  );
};

export default IndicatorDrillDown;
