import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Typography,
    Select,
    Spin,
    Empty,
    Progress,
    Tag,
    Space,
    Alert,
} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    StarOutlined,
    RiseOutlined,
    FallOutlined,
    BugOutlined,
    FileTextOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { apiService } from '../services';
import { API_ENDPOINTS } from '../config/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface MonthlyReportData {
    period: {
        month: number;
        year: number;
        month_name: string;
    };
    company: {
        id: number;
        name: string;
        logo_url: string | null;
    };
    summary: {
        tickets_resolved: number;
        tickets_created: number;
        avg_resolution_hours: number;
        avg_rating: number | null;
        acceptance_rate: number;
        on_time_percentage: number;
    };
    by_priority: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
    by_type: {
        task: number;
        bug: number;
        story: number;
        epic: number;
    };
    comparison: {
        prev_month: number;
        prev_year: number;
        prev_tickets_resolved: number;
        tickets_resolved_change: number;
        tickets_resolved_change_pct: number;
        avg_resolution_change: number;
    };
    highlights: Array<{
        type: string;
        icon: string;
        text: string;
    }>;
}

interface CompanyMonthlyReportProps {
    companyId: number;
    projectId?: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const CompanyMonthlyReport: React.FC<CompanyMonthlyReportProps> = ({
    companyId,
    projectId,
}) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [report, setReport] = useState<MonthlyReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                let url = `${API_ENDPOINTS.COMPANY_DETAIL(companyId)}monthly-report/?month=${selectedMonth}&year=${selectedYear}`;
                if (projectId) url += `&project=${projectId}`;
                const data = await apiService.get<MonthlyReportData>(url);
                setReport(data);
            } catch (e: any) {
                setError(e.message || 'Failed to load report');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [companyId, projectId, selectedMonth, selectedYear]);

    const formatHours = (hours: number) => {
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    };

    const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Loading report...</div>
            </div>
        );
    }

    if (error) {
        return <Alert type="error" message={error} showIcon />;
    }

    if (!report) {
        return <Empty description="No report data available" />;
    }

    const { summary, by_priority, by_type, comparison, highlights } = report;
    const totalByPriority = by_priority.low + by_priority.medium + by_priority.high + by_priority.critical;
    const totalByType = by_type.task + by_type.bug + by_type.story + by_type.epic;

    return (
        <div style={{ padding: '0 0 24px 0' }}>
            {/* Period Selector */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>
                    Monthly Report — {report.period.month_name} {report.period.year}
                </Title>
                <Space>
                    <Select value={selectedMonth} onChange={setSelectedMonth} style={{ width: 130 }}>
                        {MONTHS.map((m, i) => (
                            <Option key={i + 1} value={i + 1}>{m}</Option>
                        ))}
                    </Select>
                    <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 90 }}>
                        {years.map(y => (
                            <Option key={y} value={y}>{y}</Option>
                        ))}
                    </Select>
                </Space>
            </div>

            {/* Highlights */}
            {highlights.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <Row gutter={[12, 12]}>
                        {highlights.map((h, i) => (
                            <Col key={i}>
                                <Tag
                                    color={h.type === 'achievement' ? 'green' : h.type === 'improvement' ? 'blue' : 'default'}
                                    style={{ padding: '6px 12px', fontSize: 13 }}
                                >
                                    <span style={{ marginRight: 6 }}>{h.icon}</span>
                                    {h.text}
                                </Tag>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Resolved"
                            value={summary.tickets_resolved}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            suffix={
                                comparison.tickets_resolved_change !== 0 && (
                                    <span style={{ fontSize: 12, color: comparison.tickets_resolved_change > 0 ? '#52c41a' : '#ff4d4f' }}>
                                        {comparison.tickets_resolved_change > 0 ? <RiseOutlined /> : <FallOutlined />}
                                        {Math.abs(comparison.tickets_resolved_change_pct)}%
                                    </span>
                                )
                            }
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Created"
                            value={summary.tickets_created}
                            prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Avg Resolution"
                            value={formatHours(summary.avg_resolution_hours)}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                            valueStyle={{ fontSize: 20 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Rating"
                            value={summary.avg_rating ?? '—'}
                            precision={1}
                            prefix={<StarOutlined style={{ color: '#fadb14' }} />}
                            suffix={summary.avg_rating ? '/5' : ''}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="On-Time"
                            value={summary.on_time_percentage}
                            suffix="%"
                            valueStyle={{ color: summary.on_time_percentage >= 80 ? '#52c41a' : '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Acceptance"
                            value={summary.acceptance_rate}
                            suffix="%"
                            valueStyle={{ color: summary.acceptance_rate >= 90 ? '#52c41a' : '#faad14' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Breakdowns */}
            <Row gutter={[16, 16]}>
                {/* By Priority */}
                <Col xs={24} md={12}>
                    <Card title="By Priority" size="small">
                        {totalByPriority === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tickets" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { key: 'critical', label: 'Critical', color: '#ff4d4f', value: by_priority.critical },
                                    { key: 'high', label: 'High', color: '#fa8c16', value: by_priority.high },
                                    { key: 'medium', label: 'Medium', color: '#1890ff', value: by_priority.medium },
                                    { key: 'low', label: 'Low', color: '#52c41a', value: by_priority.low },
                                ].map(p => (
                                    <div key={p.key}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text>{p.label}</Text>
                                            <Text strong>{p.value}</Text>
                                        </div>
                                        <Progress
                                            percent={Math.round((p.value / totalByPriority) * 100)}
                                            strokeColor={p.color}
                                            showInfo={false}
                                            size="small"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>

                {/* By Type */}
                <Col xs={24} md={12}>
                    <Card title="By Type" size="small">
                        {totalByType === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tickets" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { key: 'task', label: 'Task', color: '#4bade8', icon: <CheckCircleOutlined />, value: by_type.task },
                                    { key: 'bug', label: 'Bug', color: '#e5493a', icon: <BugOutlined />, value: by_type.bug },
                                    { key: 'story', label: 'Story', color: '#63ba3c', icon: <FileTextOutlined />, value: by_type.story },
                                    { key: 'epic', label: 'Epic', color: '#904ee2', icon: <ThunderboltOutlined />, value: by_type.epic },
                                ].map(t => (
                                    <div key={t.key}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Space size={4}>
                                                <span style={{ color: t.color }}>{t.icon}</span>
                                                <Text>{t.label}</Text>
                                            </Space>
                                            <Text strong>{t.value}</Text>
                                        </div>
                                        <Progress
                                            percent={Math.round((t.value / totalByType) * 100)}
                                            strokeColor={t.color}
                                            showInfo={false}
                                            size="small"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Comparison Note */}
            {comparison.prev_tickets_resolved > 0 && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <Text type="secondary">
                        Compared to {MONTHS[comparison.prev_month - 1]} {comparison.prev_year}: {comparison.prev_tickets_resolved} tickets resolved
                    </Text>
                </div>
            )}
        </div>
    );
};

export default CompanyMonthlyReport;
