import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Select,
    Spin,
    Empty,
    Tag,
    Space,
    Alert,
    Checkbox,
    Button,
    Modal,
    Input,
    message,
} from 'antd';
import {
    SendOutlined,
    RiseOutlined,
    FallOutlined,
    SettingOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import { apiService } from '../services';
import { API_ENDPOINTS } from '../config/api';

const { Option } = Select;

interface ReportTicket {
    id: number;
    ticket_key: string;
    name: string;
    type: string;
    type_label: string;
    priority_id: number;
    priority_label: string;
    project_name: string | null;
    reporter: { id: number; username: string; first_name: string; last_name: string } | null;
    assignees: { id: number; username: string; first_name: string; last_name: string }[];
    status_name: string;
    status_category: string | null;
    created_at: string;
    done_at: string | null;
    due_date: string | null;
    created_at_display: string | null;
    done_at_display: string | null;
    due_date_display: string | null;
    solve_time_hours: number | null;
    on_time: boolean | null;
}

interface MonthlyReportData {
    period: { month: number; year: number; month_name: string };
    company: { id: number; name: string; logo_url: string | null; primary_contact_email?: string };
    overview: { submitted: number; resolved: number; open: number; overdue: number };
    performance: { avg_resolution_hours: number; on_time_pct: number; satisfaction: number | null };
    trends: {
        prev_month: number; prev_year: number; prev_resolved: number;
        resolved_change: number; resolved_change_pct: number;
        prev_avg_resolution_hours: number; resolution_change_hours: number;
    };
    tickets: ReportTicket[];
}

interface CompanyMonthlyReportProps {
    companyId: number;
    projectId?: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const ALL_METRICS = [
    { key: 'submitted',     label: 'Requests Submitted',  section: 'overview' },
    { key: 'resolved',      label: 'Requests Resolved',   section: 'overview' },
    { key: 'open',          label: 'Currently Open',       section: 'overview' },
    { key: 'overdue',       label: 'Overdue',              section: 'overview' },
    { key: 'avg_resolution', label: 'Avg Resolution Time', section: 'performance' },
    { key: 'on_time',       label: 'On-Time Rate',         section: 'performance' },
    { key: 'satisfaction',  label: 'Satisfaction Score',    section: 'performance' },
    { key: 'trend_resolved', label: 'Resolved Trend',      section: 'trends' },
    { key: 'trend_speed',   label: 'Resolution Speed Trend', section: 'trends' },
] as const;

type MetricKey = typeof ALL_METRICS[number]['key'];

const formatHours = (hours: number): string => {
    if (!hours || hours === 0) return '0 h';
    if (hours < 1) return '< 1 h';
    if (hours < 24) return `${Math.round(hours)} h`;
    const days = Math.floor(hours / 24);
    const rem = Math.round(hours % 24);
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
};

const formatPersonName = (person: { first_name: string; last_name: string; username: string } | null): string => {
    if (!person) return '\u2014';
    const full = `${person.first_name || ''} ${person.last_name || ''}`.trim();
    return full || person.username;
};

const PRIORITY_COLORS: Record<number, { bg: string; text: string }> = {
    1: { bg: '#e8f5e9', text: '#2e7d32' },
    2: { bg: '#e3f2fd', text: '#1565c0' },
    3: { bg: '#fff3e0', text: '#e65100' },
    4: { bg: '#fce4ec', text: '#c62828' },
};


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

    const [enabledMetrics, setEnabledMetrics] = useState<Record<MetricKey, boolean>>(
        () => Object.fromEntries(ALL_METRICS.map(m => [m.key, true])) as Record<MetricKey, boolean>,
    );
    const [showSettings, setShowSettings] = useState(false);

    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                let url = `${API_ENDPOINTS.COMPANY_DETAIL(companyId)}monthly-report/?month=${selectedMonth}&year=${selectedYear}`;
                if (projectId) url += `&project=${projectId}`;
                const data = await apiService.get<MonthlyReportData>(url);
                setReport(data);
                if (data.company.primary_contact_email) {
                    setRecipientEmail(data.company.primary_contact_email);
                }
            } catch (e: any) {
                setError(e.message || 'Failed to load report');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [companyId, projectId, selectedMonth, selectedYear]);

    const toggle = (key: MetricKey) => {
        setEnabledMetrics(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const enabledSections = useMemo(() => {
        const sections = new Set<string>();
        ALL_METRICS.forEach(m => {
            if (enabledMetrics[m.key]) sections.add(m.section);
        });
        return Array.from(sections);
    }, [enabledMetrics]);

    const handleSendReport = async () => {
        if (!recipientEmail) {
            message.error('Please enter a recipient email address');
            return;
        }
        setSending(true);
        try {
            await apiService.post(
                `${API_ENDPOINTS.COMPANY_DETAIL(companyId)}send-monthly-report/`,
                {
                    month: selectedMonth,
                    year: selectedYear,
                    project: projectId,
                    sections: enabledSections,
                    recipient_email: recipientEmail,
                },
            );
            message.success(`Report sent to ${recipientEmail}`);
            setSendModalOpen(false);
        } catch (e: any) {
            message.error(e?.response?.data?.error || e.message || 'Failed to send report');
        } finally {
            setSending(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!reportRef.current || !report) return;
        setDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const filename = `${report.company.name.replace(/\s+/g, '_')}_Report_${report.period.month_name}_${report.period.year}.pdf`;
            await html2pdf()
                .set({
                    margin: [8, 8, 8, 8],
                    filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                })
                .from(reportRef.current)
                .save();
        } catch (err) {
            message.error('Failed to generate PDF');
            console.error(err);
        } finally {
            setDownloading(false);
        }
    };

    const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
    const on = (key: MetricKey) => enabledMetrics[key];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 13 }}>Loading report...</div>
            </div>
        );
    }

    if (error) return <Alert type="error" message={error} showIcon />;
    if (!report) return <Empty description="No data for this period" />;

    const { overview, performance, trends } = report;
    const prevLabel = `${MONTHS[trends.prev_month - 1]} ${trends.prev_year}`;
    const anyOverview = on('submitted') || on('resolved') || on('open') || on('overdue');
    const anyPerf = on('avg_resolution') || on('on_time') || on('satisfaction');
    const anyTrends = on('trend_resolved') || on('trend_speed');

    const resolvedTickets = report.tickets.filter(t => t.done_at);
    const avgSolveTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, t) => sum + (t.solve_time_hours || 0), 0) / resolvedTickets.length
        : 0;
    const onTimeCount = report.tickets.filter(t => t.on_time === true).length;
    const withDueCount = report.tickets.filter(t => t.on_time !== null).length;

    const th: React.CSSProperties = {
        padding: '8px 10px',
        fontSize: 10,
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '2px solid #e2e8f0',
        textAlign: 'left',
        whiteSpace: 'nowrap',
    };
    const td: React.CSSProperties = {
        padding: '7px 10px',
        fontSize: 12,
        color: '#334155',
        borderBottom: '1px solid #f1f5f9',
        verticalAlign: 'top',
    };

    return (
        <div>
            {/* ── Toolbar ── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12, flexWrap: 'wrap', gap: 6,
            }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {report.period.month_name} {report.period.year}
                </span>
                <Space size={6}>
                    <Select value={selectedMonth} onChange={setSelectedMonth} style={{ width: 110 }} size="small">
                        {MONTHS.map((m, i) => <Option key={i + 1} value={i + 1}>{m}</Option>)}
                    </Select>
                    <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 76 }} size="small">
                        {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                    </Select>
                    <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadPdf} loading={downloading}>
                        PDF
                    </Button>
                    <Button
                        size="small"
                        icon={<SettingOutlined />}
                        type={showSettings ? 'primary' : 'default'}
                        onClick={() => setShowSettings(v => !v)}
                    />
                    <Button
                        size="small"
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => setSendModalOpen(true)}
                        disabled={!anyOverview && !anyPerf && !anyTrends}
                    >
                        Send
                    </Button>
                </Space>
            </div>

            {showSettings && (
                <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4,
                    padding: '8px 12px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: '2px 16px',
                }}>
                    {ALL_METRICS.map(m => (
                        <Checkbox key={m.key} checked={enabledMetrics[m.key]} onChange={() => toggle(m.key)} style={{ fontSize: 12 }}>
                            {m.label}
                        </Checkbox>
                    ))}
                </div>
            )}

            {/* ── A4 Paper presentation ── */}
            <div style={{
                background: '#e8ecf1',
                borderRadius: 8,
                padding: '32px 40px',
                margin: '0 -12px',
            }}>
              <div
                ref={reportRef}
                style={{
                    background: '#fff',
                    padding: '40px 48px',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    maxWidth: 1100,
                    margin: '0 auto',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
                    borderRadius: 2,
                    minHeight: 600,
                }}
              >

                {/* Report Header */}
                <div style={{ borderBottom: '3px solid #1e293b', paddingBottom: 20, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                                Monthly Service Report
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                                {report.company.name}
                            </div>
                            <div style={{ fontSize: 15, color: '#475569', marginTop: 4 }}>
                                {report.period.month_name} {report.period.year}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {report.company.logo_url && (
                                <img
                                    src={report.company.logo_url}
                                    alt=""
                                    style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain', marginBottom: 4 }}
                                />
                            )}
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Executive Summary */}
                {(anyOverview || anyPerf || anyTrends) && (
                    <div style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                            Executive Summary
                        </div>

                        {anyOverview && (
                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                {on('submitted') && (
                                    <div style={{ flex: 1, background: '#f0f9ff', borderRadius: 6, padding: '12px 16px', borderLeft: '3px solid #3b82f6' }}>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: '#1e40af' }}>{overview.submitted}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Submitted</div>
                                    </div>
                                )}
                                {on('resolved') && (
                                    <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 6, padding: '12px 16px', borderLeft: '3px solid #16a34a' }}>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: '#166534' }}>
                                            {overview.resolved}
                                            {trends.resolved_change !== 0 && (
                                                <span style={{ fontSize: 11, fontWeight: 600, color: trends.resolved_change > 0 ? '#16a34a' : '#dc2626', marginLeft: 6 }}>
                                                    {trends.resolved_change > 0 ? <RiseOutlined /> : <FallOutlined />}
                                                    {' '}{trends.resolved_change > 0 ? '+' : ''}{trends.resolved_change_pct}%
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Resolved</div>
                                    </div>
                                )}
                                {on('open') && (
                                    <div style={{ flex: 1, background: '#fffbeb', borderRadius: 6, padding: '12px 16px', borderLeft: '3px solid #f59e0b' }}>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: '#92400e' }}>{overview.open}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Open</div>
                                    </div>
                                )}
                                {on('overdue') && (
                                    <div style={{
                                        flex: 1, borderRadius: 6, padding: '12px 16px',
                                        background: overview.overdue > 0 ? '#fef2f2' : '#f8fafc',
                                        borderLeft: `3px solid ${overview.overdue > 0 ? '#ef4444' : '#cbd5e1'}`,
                                    }}>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: overview.overdue > 0 ? '#991b1b' : '#94a3b8' }}>{overview.overdue}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Overdue</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {anyPerf && (
                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                {on('avg_resolution') && (
                                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                                            {formatHours(performance.avg_resolution_hours)}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Avg Resolution Time</div>
                                        {trends.resolution_change_hours !== 0 && (
                                            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: trends.resolution_change_hours < 0 ? '#16a34a' : '#dc2626' }}>
                                                {trends.resolution_change_hours < 0 ? <RiseOutlined /> : <FallOutlined />}
                                                {' '}{formatHours(Math.abs(trends.resolution_change_hours))} {trends.resolution_change_hours < 0 ? 'faster' : 'slower'} vs {prevLabel}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {on('on_time') && (
                                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: performance.on_time_pct >= 80 ? '#166534' : performance.on_time_pct >= 60 ? '#92400e' : '#991b1b' }}>
                                            {performance.on_time_pct}%
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>On-Time Completion</div>
                                    </div>
                                )}
                                {on('satisfaction') && (
                                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                                            {performance.satisfaction !== null ? `${performance.satisfaction.toFixed(1)} / 5` : '\u2014'}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Satisfaction Score</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {anyTrends && (
                            <div style={{ display: 'flex', gap: 12 }}>
                                {on('trend_resolved') && (
                                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '10px 16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Resolved vs {prevLabel}</div>
                                        <span style={{ fontSize: 16, color: '#94a3b8' }}>{trends.prev_resolved}</span>
                                        <span style={{ fontSize: 13, color: '#94a3b8', margin: '0 6px' }}>&rarr;</span>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>{overview.resolved}</span>
                                        {trends.resolved_change !== 0 && (
                                            <span style={{ fontSize: 11, fontWeight: 600, color: trends.resolved_change > 0 ? '#16a34a' : '#dc2626', marginLeft: 8 }}>
                                                ({trends.resolved_change > 0 ? '+' : ''}{trends.resolved_change})
                                            </span>
                                        )}
                                    </div>
                                )}
                                {on('trend_speed') && (
                                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '10px 16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Resolution Speed vs {prevLabel}</div>
                                        <span style={{ fontSize: 16, color: '#94a3b8' }}>{formatHours(trends.prev_avg_resolution_hours)}</span>
                                        <span style={{ fontSize: 13, color: '#94a3b8', margin: '0 6px' }}>&rarr;</span>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>{formatHours(performance.avg_resolution_hours)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Detailed Ticket Table */}
                {report.tickets && report.tickets.length > 0 && (
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                            Ticket Details
                            <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                                {report.tickets.length} ticket{report.tickets.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ ...th, width: 30 }}>#</th>
                                    <th style={{ ...th, minWidth: 180 }}>Ticket</th>
                                    <th style={{ ...th, width: 60 }}>Type</th>
                                    <th style={{ ...th, width: 70 }}>Priority</th>
                                    <th style={{ ...th, width: 120 }}>Reported By</th>
                                    <th style={{ ...th, width: 120 }}>Assigned To</th>
                                    <th style={{ ...th, width: 85 }}>Created</th>
                                    <th style={{ ...th, width: 85 }}>Completed</th>
                                    <th style={{ ...th, width: 80, textAlign: 'right' }}>Resolution</th>
                                    <th style={{ ...th, width: 55, textAlign: 'center' }}>SLA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.tickets.map((ticket, idx) => {
                                    const pColor = PRIORITY_COLORS[ticket.priority_id] || { bg: '#f1f5f9', text: '#475569' };
                                    return (
                                        <tr key={ticket.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                            <td style={{ ...td, color: '#94a3b8', fontSize: 11 }}>{idx + 1}</td>
                                            <td style={td}>
                                                <span style={{ color: '#0052cc', fontWeight: 600, fontSize: 11, marginRight: 6 }}>
                                                    {ticket.ticket_key}
                                                </span>
                                                <span style={{ color: '#1e293b' }}>{ticket.name}</span>
                                            </td>
                                            <td style={td}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 600, color: '#475569',
                                                    background: '#f1f5f9', padding: '2px 6px', borderRadius: 3,
                                                    textTransform: 'capitalize',
                                                }}>
                                                    {ticket.type_label || ticket.type}
                                                </span>
                                            </td>
                                            <td style={td}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 600,
                                                    color: pColor.text, background: pColor.bg,
                                                    padding: '2px 6px', borderRadius: 3,
                                                }}>
                                                    {ticket.priority_label}
                                                </span>
                                            </td>
                                            <td style={{ ...td, fontSize: 11 }}>
                                                {formatPersonName(ticket.reporter)}
                                            </td>
                                            <td style={{ ...td, fontSize: 11 }}>
                                                {ticket.assignees.length > 0
                                                    ? ticket.assignees.map(a => formatPersonName(a)).join(', ')
                                                    : '\u2014'}
                                            </td>
                                            <td style={{ ...td, fontSize: 11, whiteSpace: 'nowrap' }}>
                                                {ticket.created_at_display || '\u2014'}
                                            </td>
                                            <td style={{ ...td, fontSize: 11, whiteSpace: 'nowrap' }}>
                                                {ticket.done_at_display || '\u2014'}
                                            </td>
                                            <td style={{ ...td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                {ticket.solve_time_hours !== null ? formatHours(ticket.solve_time_hours) : '\u2014'}
                                            </td>
                                            <td style={{ ...td, textAlign: 'center' }}>
                                                {ticket.on_time === true && (
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: 3 }}>
                                                        ON TIME
                                                    </span>
                                                )}
                                                {ticket.on_time === false && (
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: 3 }}>
                                                        LATE
                                                    </span>
                                                )}
                                                {ticket.on_time === null && (
                                                    <span style={{ fontSize: 10, color: '#cbd5e1' }}>\u2014</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Summary Footer */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginTop: 16, padding: '12px 16px',
                            background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0',
                        }}>
                            <div style={{ display: 'flex', gap: 24 }}>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Total Tickets: </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{report.tickets.length}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Resolved: </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{resolvedTickets.length}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Avg Resolution: </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{formatHours(avgSolveTime)}</span>
                                </div>
                                {withDueCount > 0 && (
                                    <div>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>On-Time: </span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                            {onTimeCount}/{withDueCount} ({Math.round(onTimeCount / withDueCount * 100)}%)
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                Report generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at{' '}
                                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                )}

                {report.tickets && report.tickets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                        No tickets found for this period.
                    </div>
                )}
              </div>
            </div>

            {/* Send modal */}
            <Modal
                title="Send Report"
                open={sendModalOpen}
                onCancel={() => setSendModalOpen(false)}
                onOk={handleSendReport}
                confirmLoading={sending}
                okText="Send"
                okButtonProps={{ icon: <SendOutlined /> }}
                width={420}
            >
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Recipient</div>
                    <Input
                        type="email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        placeholder="name@company.com"
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Period</div>
                    <span style={{ fontSize: 14, color: '#1e293b' }}>
                        {report.period.month_name} {report.period.year} &mdash; {report.company.name}
                    </span>
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Included metrics</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {ALL_METRICS.filter(m => enabledMetrics[m.key]).map(m => (
                            <Tag key={m.key} style={{ fontSize: 12 }}>{m.label}</Tag>
                        ))}
                        {enabledSections.length === 0 && (
                            <span style={{ fontSize: 13, color: '#94a3b8' }}>None selected</span>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CompanyMonthlyReport;
