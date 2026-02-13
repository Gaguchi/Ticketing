import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Spin,
  Empty,
  Progress,
  Tooltip,
  DatePicker,
  Button,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TrophyOutlined,
  ReloadOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../contexts/AppContext';
import kpiService from '../../services/kpi.service';
import type { ScoreboardResponse, UserKPIScore } from '../../types/kpi';
import dayjs from 'dayjs';

const { Text } = Typography;

const KPIScoreboard: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const { selectedProject } = useProject();
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());

  const fetchData = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const result = await kpiService.fetchScoreboard(
        selectedProject.id,
        selectedMonth.startOf('month').format('YYYY-MM-DD'),
        selectedMonth.endOf('month').format('YYYY-MM-DD'),
      );
      setData(result);
    } catch (error: any) {
      console.error('Failed to load scoreboard:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!selectedProject) {
    return <Empty description={t('kpi.selectProject')} />;
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <CrownOutlined style={{ color: '#faad14', fontSize: 18 }} />;
    if (rank === 2) return <CrownOutlined style={{ color: '#bfbfbf', fontSize: 16 }} />;
    if (rank === 3) return <CrownOutlined style={{ color: '#d48806', fontSize: 14 }} />;
    return <Text type="secondary">{rank}</Text>;
  };

  const formatRawValue = (value: number | null, unit: string): string => {
    if (value === null || value === undefined) return '-';
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'stars') return `${value.toFixed(1)}★`;
    if (unit === 'hours') {
      if (value < 1) return `${Math.round(value * 60)}m`;
      if (value < 24) return `${value.toFixed(1)}h`;
      return `${(value / 24).toFixed(1)}d`;
    }
    return String(Math.round(value));
  };

  // Build columns dynamically based on active indicators
  const buildColumns = (): ColumnsType<UserKPIScore> => {
    const cols: ColumnsType<UserKPIScore> = [
      {
        title: t('kpi.rank'),
        key: 'rank',
        width: 50,
        align: 'center',
        render: (_, record) => getRankIcon(record.rank),
      },
      {
        title: t('kpi.member'),
        key: 'member',
        width: 180,
        render: (_, record) => (
          <Text strong>
            {record.first_name || record.last_name
              ? `${record.first_name} ${record.last_name}`.trim()
              : record.username}
          </Text>
        ),
      },
      {
        title: t('kpi.score'),
        key: 'total_score',
        width: 200,
        sorter: (a, b) => a.total_score - b.total_score,
        defaultSortOrder: 'descend',
        render: (_, record) => (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Text strong>{record.total_score.toFixed(1)} / {data?.total_weight ?? 0}</Text>
            <Progress
              percent={record.score_percentage}
              size="small"
              showInfo={false}
              strokeColor={
                record.score_percentage >= 80
                  ? '#52c41a'
                  : record.score_percentage >= 50
                    ? '#faad14'
                    : '#ff4d4f'
              }
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.score_percentage.toFixed(1)}%
            </Text>
          </Space>
        ),
      },
    ];

    // Add a column per active indicator
    if (data?.active_indicators) {
      for (const ind of data.active_indicators) {
        cols.push({
          title: (
            <Tooltip title={`${t('kpi.weightLabel', { weight: ind.weight })} | ${ind.higher_is_better ? `↑ ${t('kpi.higherIsBetter')}` : `↓ ${t('kpi.lowerIsBetter')}`}`}>
              <span style={{ fontSize: 12 }}>{ind.name}</span>
            </Tooltip>
          ),
          key: ind.metric_key,
          width: 110,
          align: 'center',
          render: (_, record) => {
            const score = record.indicators.find(
              (s) => s.metric_key === ind.metric_key
            );
            if (!score) return <Text type="secondary">-</Text>;

            // We don't have unit in active_indicators response, derive from key
            const units: Record<string, string> = {
              tickets_resolved: 'tickets',
              avg_resolution_hours: 'hours',
              avg_customer_rating: 'stars',
              tickets_created: 'tickets',
              avg_first_response_hours: 'hours',
              sla_compliance_rate: '%',
              reopen_rate: '%',
            };

            return (
              <Tooltip
                title={`Raw: ${formatRawValue(score.raw_value, units[ind.metric_key] || '')} | Normalized: ${(score.normalized * 100).toFixed(0)}%`}
              >
                <Text style={{ fontSize: 13 }}>
                  {score.weighted_score.toFixed(1)}
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    /{ind.weight}
                  </Text>
                </Text>
              </Tooltip>
            );
          },
        });
      }
    }

    return cols;
  };

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Controls */}
        <Card size="small">
          <Space size="middle" wrap>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(date) => { if (date) setSelectedMonth(date); }}
              allowClear={false}
              disabledDate={(current) => current && current > dayjs().endOf('month')}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              {tCommon('btn.refresh')}
            </Button>
            {data && (
              <Space>
                <Tag>{data.config_name}</Tag>
                <Text type="secondary">
                  {t('kpi.members', { count: data.team_size })} | {t('kpi.indicatorsCount', { count: data.active_indicators.length })} | {t('kpi.totalWeight', { count: data.total_weight })}
                </Text>
              </Space>
            )}
          </Space>
        </Card>

        {/* Scoreboard Table */}
        {data ? (
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                <span>{t('kpi.teamScoreboard')}</span>
              </Space>
            }
          >
            <Table
              columns={buildColumns()}
              dataSource={data.scores}
              rowKey="user_id"
              pagination={false}
              size="middle"
              scroll={{ x: 600 + (data.active_indicators.length * 110) }}
            />
          </Card>
        ) : (
          !loading && (
            <Card>
              <Empty description={t('kpi.noConfig')} />
            </Card>
          )
        )}
      </Space>
    </Spin>
  );
};

export default KPIScoreboard;
