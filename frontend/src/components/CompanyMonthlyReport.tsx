import React, { useState, useEffect, useMemo } from 'react';
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

/* ── Domain-motivated palette ── */
/* Ink & paper: printed report feel. Blue: boardroom authority. Teal: operational status. */
/* These constants are used for the PDF-style rendered report preview (simulates printed paper)
   and the actual jsPDF export. They are intentionally hardcoded for the "paper" rendering. */
const INK = '#0f172a';
const INK_SECONDARY = '#334155';
const INK_MUTED = '#64748b';
const INK_FAINT = '#94a3b8';
const RULE = '#e2e8f0';
const SURFACE = '#f8fafc';
const SURFACE_INSET = '#f1f5f9';
const BRAND = '#1e40af';
const BRAND_LIGHT = '#eff6ff';

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

const PRIORITY_STYLES: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    2: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    3: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
    4: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
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
        if (!report) return;
        setDownloading(true);
        try {
            const jsPDFModule = await import('jspdf');
            const autoTableModule = await import('jspdf-autotable');
            const JsPDF = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default;
            const autoTable = (autoTableModule as any).default;

            const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const filename = `${report.company.name.replace(/\s+/g, '_')}_Report_${report.period.month_name}_${report.period.year}.pdf`;

            /* ── Compute values from report state ── */
            const { overview, performance, trends } = report;
            const isOn = (key: MetricKey) => enabledMetrics[key];
            const hasOverview = isOn('submitted') || isOn('resolved') || isOn('open') || isOn('overdue');
            const hasPerf = isOn('avg_resolution') || isOn('on_time') || isOn('satisfaction');
            const hasTrends = isOn('trend_resolved') || isOn('trend_speed');
            const resolvedTix = report.tickets.filter(t => t.done_at);
            const avgSolve = resolvedTix.length > 0
                ? resolvedTix.reduce((sum, t) => sum + (t.solve_time_hours || 0), 0) / resolvedTix.length
                : 0;
            const onTimeCt = report.tickets.filter(t => t.on_time === true).length;
            const withDueCt = report.tickets.filter(t => t.on_time !== null).length;
            const prevLbl = `${MONTHS[trends.prev_month - 1]?.slice(0, 3)} ${trends.prev_year}`;

            /* ── Layout constants (A4 = 210 x 297mm) ── */
            const pageW = 210, pageH = 297;
            const mL = 15, mR = 15, mT = 12, mB = 15;
            const cW = pageW - mL - mR;
            let y = mT;

            /* ── Helpers ── */
            const rgb = (h: string): [number, number, number] => {
                const v = h.replace('#', '');
                return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
            };
            const checkPage = (needed: number) => {
                if (y + needed > pageH - mB) { doc.addPage(); y = mT; }
            };
            const pdfName = (p: { first_name: string; last_name: string; username: string } | null): string => {
                if (!p) return '-';
                const full = `${p.first_name || ''} ${p.last_name || ''}`.trim();
                return full || p.username;
            };

            /* ═══════════════════════════════════════════
               1. ACCENT BAR
               ═══════════════════════════════════════════ */
            doc.setFillColor(...rgb(BRAND));
            doc.rect(0, 0, pageW, 1.5, 'F');

            /* ═══════════════════════════════════════════
               2. DOCUMENT HEADER
               ═══════════════════════════════════════════ */
            // Subtitle
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...rgb(BRAND));
            doc.text('MONTHLY SERVICE REPORT', mL, y + 3);

            // Company name
            doc.setFontSize(20);
            doc.setTextColor(...rgb(INK));
            doc.text(report.company.name, mL, y + 12);

            // Period
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...rgb(INK_MUTED));
            doc.text(`${report.period.month_name} ${report.period.year}`, mL, y + 18);

            // Generated date (right-aligned)
            const genDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            doc.setFontSize(7);
            doc.setTextColor(...rgb(INK_FAINT));
            doc.text(`Generated ${genDate}`, mL + cW, y + 4, { align: 'right' });

            y += 22;

            // Divider
            doc.setDrawColor(...rgb(RULE));
            doc.setLineWidth(0.3);
            doc.line(mL, y, mL + cW, y);
            y += 8;

            /* ═══════════════════════════════════════════
               3. KEY FIGURES STRIP
               ═══════════════════════════════════════════ */
            if (hasOverview) {
                const figures: { value: string; label: string; color: [number, number, number]; extra?: string; extraColor?: [number, number, number] }[] = [];
                if (isOn('submitted')) figures.push({ value: String(overview.submitted), label: 'SUBMITTED', color: rgb(BRAND) });
                if (isOn('resolved')) {
                    let extra: string | undefined;
                    let extraColor: [number, number, number] | undefined;
                    if (trends.resolved_change !== 0) {
                        extra = `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change_pct}%`;
                        extraColor = trends.resolved_change > 0 ? rgb('#059669') : rgb('#dc2626');
                    }
                    figures.push({ value: String(overview.resolved), label: 'RESOLVED', color: rgb('#065f46'), extra, extraColor });
                }
                if (isOn('open')) figures.push({ value: String(overview.open), label: 'OPEN', color: rgb('#92400e') });
                if (isOn('overdue')) figures.push({ value: String(overview.overdue), label: 'OVERDUE', color: overview.overdue > 0 ? rgb('#991b1b') : rgb(INK_FAINT) });

                if (figures.length > 0) {
                    const stripH = 17;
                    const cellW = cW / figures.length;

                    // Strip background + border
                    doc.setFillColor(...rgb(SURFACE));
                    doc.roundedRect(mL, y, cW, stripH, 1.5, 1.5, 'F');
                    doc.setDrawColor(...rgb(RULE));
                    doc.setLineWidth(0.2);
                    doc.roundedRect(mL, y, cW, stripH, 1.5, 1.5, 'S');

                    figures.forEach((fig, i) => {
                        const cx = mL + cellW * i + 6;

                        // Large number
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(16);
                        doc.setTextColor(...fig.color);
                        doc.text(fig.value, cx, y + 8);

                        // Trend badge
                        if (fig.extra && fig.extraColor) {
                            const valW = doc.getTextWidth(fig.value);
                            doc.setFontSize(6.5);
                            doc.setTextColor(...fig.extraColor);
                            doc.text(fig.extra, cx + valW + 2, y + 8);
                        }

                        // Label
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(6);
                        doc.setTextColor(...rgb(INK_MUTED));
                        doc.text(fig.label, cx, y + 13);

                        // Cell divider
                        if (i < figures.length - 1) {
                            doc.setDrawColor(...rgb(RULE));
                            doc.setLineWidth(0.2);
                            doc.line(mL + cellW * (i + 1), y + 2.5, mL + cellW * (i + 1), y + stripH - 2.5);
                        }
                    });

                    y += stripH + 8;
                }
            }

            /* ── Section title helper ── */
            const drawSectionTitle = (title: string) => {
                checkPage(20);
                doc.setFillColor(...rgb(BRAND));
                doc.rect(mL, y, 1, 4, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(...rgb(INK));
                doc.text(title.toUpperCase(), mL + 3, y + 3);
                y += 8;
            };

            /* ═══════════════════════════════════════════
               4. PERFORMANCE SECTION
               ═══════════════════════════════════════════ */
            if (hasPerf) {
                drawSectionTitle('Performance');

                const cards: { title: string; value: string; valueColor: [number, number, number]; sub?: string; subColor?: [number, number, number]; barPct?: number; barColor?: string; barLabel?: string }[] = [];

                if (isOn('avg_resolution')) {
                    const sub = trends.resolution_change_hours !== 0
                        ? `${formatHours(Math.abs(trends.resolution_change_hours))} ${trends.resolution_change_hours < 0 ? 'faster' : 'slower'} vs ${prevLbl}`
                        : undefined;
                    cards.push({
                        title: 'AVG RESOLUTION TIME',
                        value: formatHours(performance.avg_resolution_hours),
                        valueColor: rgb(INK),
                        sub,
                        subColor: trends.resolution_change_hours < 0 ? rgb('#059669') : rgb('#dc2626'),
                    });
                }
                if (isOn('on_time')) {
                    cards.push({
                        title: 'ON-TIME COMPLETION',
                        value: `${performance.on_time_pct}%`,
                        valueColor: performance.on_time_pct >= 80 ? rgb('#065f46') : performance.on_time_pct >= 60 ? rgb('#92400e') : rgb('#991b1b'),
                        barPct: performance.on_time_pct,
                        barColor: performance.on_time_pct >= 80 ? '#059669' : performance.on_time_pct >= 60 ? '#d97706' : '#dc2626',
                        barLabel: withDueCt > 0 ? `${onTimeCt}/${withDueCt}` : undefined,
                    });
                }
                if (isOn('satisfaction')) {
                    const val = performance.satisfaction !== null ? `${performance.satisfaction.toFixed(1)} / 5` : '-';
                    cards.push({
                        title: 'SATISFACTION',
                        value: val,
                        valueColor: rgb(INK),
                        barPct: performance.satisfaction !== null ? (performance.satisfaction / 5) * 100 : undefined,
                        barColor: performance.satisfaction !== null
                            ? (performance.satisfaction >= 4 ? '#059669' : performance.satisfaction >= 3 ? '#d97706' : '#dc2626')
                            : undefined,
                    });
                }

                if (cards.length > 0) {
                    const gap = 4;
                    const cardW = (cW - (cards.length - 1) * gap) / cards.length;
                    const cardH = 23;
                    checkPage(cardH + 4);

                    cards.forEach((card, i) => {
                        const cx = mL + i * (cardW + gap);

                        // Card border
                        doc.setDrawColor(...rgb(RULE));
                        doc.setLineWidth(0.2);
                        doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, 'S');

                        // Title
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(6);
                        doc.setTextColor(...rgb(INK_MUTED));
                        doc.text(card.title, cx + 5, y + 5.5);

                        // Value
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(14);
                        doc.setTextColor(...card.valueColor);
                        doc.text(card.value, cx + 5, y + 13.5);

                        // Progress bar
                        if (card.barPct !== undefined && card.barColor) {
                            const barY = y + 17;
                            const barW = cardW - 18;
                            const barH = 2;

                            // Track
                            doc.setFillColor(...rgb(SURFACE_INSET));
                            doc.roundedRect(cx + 5, barY, barW, barH, 1, 1, 'F');

                            // Fill
                            const fillW = barW * Math.min(card.barPct, 100) / 100;
                            if (fillW > 0) {
                                doc.setFillColor(...rgb(card.barColor));
                                doc.roundedRect(cx + 5, barY, fillW, barH, 1, 1, 'F');
                            }

                            // Label
                            if (card.barLabel) {
                                doc.setFontSize(5.5);
                                doc.setFont('helvetica', 'normal');
                                doc.setTextColor(...rgb(INK_FAINT));
                                doc.text(card.barLabel, cx + 5 + barW + 2, barY + 1.6);
                            }
                        }

                        // Sub text (for resolution change - only if no bar)
                        if (card.sub && card.subColor && card.barPct === undefined) {
                            doc.setFontSize(6.5);
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(...card.subColor);
                            doc.text(card.sub, cx + 5, y + 19);
                        }
                    });

                    y += cardH + 8;
                }
            }

            /* ═══════════════════════════════════════════
               5. MONTH-OVER-MONTH
               ═══════════════════════════════════════════ */
            if (hasTrends) {
                drawSectionTitle('Month-over-Month');

                const tCards: { title: string; prev: string; cur: string; badge?: string; badgeColor?: [number, number, number]; badgeBg?: string; vsLabel: string }[] = [];

                if (isOn('trend_resolved')) {
                    let badge: string | undefined, badgeColor: [number, number, number] | undefined, badgeBg: string | undefined;
                    if (trends.resolved_change !== 0) {
                        badge = `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change}`;
                        badgeColor = trends.resolved_change > 0 ? rgb('#059669') : rgb('#dc2626');
                        badgeBg = trends.resolved_change > 0 ? '#ecfdf5' : '#fef2f2';
                    }
                    tCards.push({ title: 'RESOLVED TICKETS', prev: String(trends.prev_resolved), cur: String(overview.resolved), badge, badgeColor, badgeBg, vsLabel: `vs ${MONTHS[trends.prev_month - 1]} ${trends.prev_year}` });
                }
                if (isOn('trend_speed')) {
                    let badge: string | undefined, badgeColor: [number, number, number] | undefined, badgeBg: string | undefined;
                    if (trends.resolution_change_hours !== 0) {
                        badge = trends.resolution_change_hours < 0 ? 'Faster' : 'Slower';
                        badgeColor = trends.resolution_change_hours < 0 ? rgb('#059669') : rgb('#dc2626');
                        badgeBg = trends.resolution_change_hours < 0 ? '#ecfdf5' : '#fef2f2';
                    }
                    tCards.push({ title: 'RESOLUTION SPEED', prev: formatHours(trends.prev_avg_resolution_hours), cur: formatHours(performance.avg_resolution_hours), badge, badgeColor, badgeBg, vsLabel: `vs ${MONTHS[trends.prev_month - 1]} ${trends.prev_year}` });
                }

                if (tCards.length > 0) {
                    const gap = 4;
                    const cardW = (cW - (tCards.length - 1) * gap) / tCards.length;
                    const cardH = 19;
                    checkPage(cardH + 4);

                    tCards.forEach((card, i) => {
                        const cx = mL + i * (cardW + gap);

                        doc.setDrawColor(...rgb(RULE));
                        doc.setLineWidth(0.2);
                        doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, 'S');

                        // Title
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(6);
                        doc.setTextColor(...rgb(INK_MUTED));
                        doc.text(card.title, cx + 5, y + 5.5);

                        // Prev > Current
                        let tx = cx + 5;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(10);
                        doc.setTextColor(...rgb(INK_FAINT));
                        doc.text(card.prev, tx, y + 12.5);
                        tx += doc.getTextWidth(card.prev) + 2;

                        doc.setFontSize(7);
                        doc.text('>', tx, y + 12.5);
                        tx += doc.getTextWidth('>') + 2;

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(12);
                        doc.setTextColor(...rgb(INK));
                        doc.text(card.cur, tx, y + 12.5);
                        tx += doc.getTextWidth(card.cur) + 3;

                        // Change badge
                        if (card.badge && card.badgeColor && card.badgeBg) {
                            doc.setFontSize(6.5);
                            doc.setFont('helvetica', 'bold');
                            const badgeW = doc.getTextWidth(card.badge) + 4;
                            doc.setFillColor(...rgb(card.badgeBg));
                            doc.roundedRect(tx, y + 8.5, badgeW, 5, 1, 1, 'F');
                            doc.setTextColor(...card.badgeColor);
                            doc.text(card.badge, tx + 2, y + 12);
                        }

                        // vs label
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(5.5);
                        doc.setTextColor(...rgb(INK_FAINT));
                        doc.text(card.vsLabel, cx + 5, y + 16.5);
                    });

                    y += cardH + 8;
                }
            }

            /* ═══════════════════════════════════════════
               6. TICKET DETAILS TABLE
               ═══════════════════════════════════════════ */
            if (report.tickets && report.tickets.length > 0) {
                drawSectionTitle(`Ticket Details  (${report.tickets.length})`);

                const tableBody = report.tickets.map((ticket, idx) => [
                    String(idx + 1),
                    `${ticket.ticket_key}  ${ticket.name}`,
                    ticket.priority_label,
                    pdfName(ticket.reporter),
                    ticket.assignees.length > 0 ? ticket.assignees.map(a => pdfName(a)).join(', ') : '-',
                    ticket.created_at_display || '-',
                    ticket.done_at_display || '-',
                    ticket.solve_time_hours !== null ? formatHours(ticket.solve_time_hours) : '-',
                    ticket.on_time === true ? 'ON TIME' : ticket.on_time === false ? 'LATE' : '-',
                ]);

                autoTable(doc, {
                    startY: y,
                    margin: { left: mL, right: mR },
                    head: [['#', 'Ticket', 'Priority', 'Reporter', 'Assignee', 'Created', 'Done', 'Time', 'SLA']],
                    body: tableBody,
                    styles: {
                        fontSize: 7,
                        cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
                        textColor: rgb(INK_SECONDARY),
                        lineWidth: 0,
                        overflow: 'ellipsize' as any,
                    },
                    headStyles: {
                        fillColor: rgb('#1e293b'),
                        textColor: rgb('#cbd5e1'),
                        fontSize: 6.5,
                        fontStyle: 'bold',
                        cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
                    },
                    alternateRowStyles: {
                        fillColor: rgb(SURFACE),
                    },
                    columnStyles: {
                        0: { cellWidth: 7, halign: 'center', textColor: rgb(INK_FAINT), fontSize: 6.5 },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 16 },
                        3: { cellWidth: 20 },
                        4: { cellWidth: 20 },
                        5: { cellWidth: 16, textColor: rgb(INK_MUTED) },
                        6: { cellWidth: 16, textColor: rgb(INK_MUTED) },
                        7: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
                        8: { cellWidth: 16, halign: 'center' },
                    },
                    didParseCell: (data: any) => {
                        // SLA cell coloring
                        if (data.section === 'body' && data.column.index === 8) {
                            const val = data.cell.raw;
                            if (val === 'ON TIME') {
                                data.cell.styles.textColor = rgb('#059669');
                                data.cell.styles.fontStyle = 'bold';
                                data.cell.styles.fontSize = 6;
                            } else if (val === 'LATE') {
                                data.cell.styles.textColor = rgb('#dc2626');
                                data.cell.styles.fontStyle = 'bold';
                                data.cell.styles.fontSize = 6;
                            } else {
                                data.cell.styles.textColor = rgb('#cbd5e1');
                            }
                        }
                        // Ticket column - darker text
                        if (data.section === 'body' && data.column.index === 1) {
                            data.cell.styles.textColor = rgb(INK);
                        }
                        // Priority coloring
                        if (data.section === 'body' && data.column.index === 2) {
                            const val = (data.cell.raw || '').toString().toLowerCase();
                            if (val.includes('critical') || val.includes('highest')) {
                                data.cell.styles.textColor = rgb('#991b1b');
                            } else if (val.includes('high')) {
                                data.cell.styles.textColor = rgb('#9a3412');
                            } else if (val.includes('medium') || val.includes('normal')) {
                                data.cell.styles.textColor = rgb('#1e40af');
                            } else if (val.includes('low')) {
                                data.cell.styles.textColor = rgb('#065f46');
                            }
                        }
                    },
                    tableLineColor: rgb(RULE),
                    tableLineWidth: 0.15,
                });

                y = (doc as any).lastAutoTable.finalY + 8;
            }

            /* ═══════════════════════════════════════════
               7. DOCUMENT FOOTER
               ═══════════════════════════════════════════ */
            checkPage(18);

            doc.setDrawColor(...rgb(RULE));
            doc.setLineWidth(0.3);
            doc.line(mL, y, mL + cW, y);
            y += 6;

            // Footer summary stats
            const footerStats: { label: string; value: string; color: [number, number, number] }[] = [
                { label: 'TOTAL', value: String(report.tickets.length), color: rgb(INK) },
                { label: 'RESOLVED', value: String(resolvedTix.length), color: rgb('#059669') },
                { label: 'AVG TIME', value: formatHours(avgSolve), color: rgb(INK) },
            ];
            if (withDueCt > 0) {
                footerStats.push({ label: 'SLA RATE', value: `${Math.round(onTimeCt / withDueCt * 100)}%`, color: rgb(INK) });
            }

            let fx = mL;
            footerStats.forEach((stat) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5.5);
                doc.setTextColor(...rgb(INK_FAINT));
                doc.text(stat.label, fx, y);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...stat.color);
                doc.text(stat.value, fx, y + 5.5);

                fx += 28;
            });

            // Right-aligned company & date
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(...rgb(INK_FAINT));
            doc.text(
                `${report.company.name}  |  ${report.period.month_name} ${report.period.year}`,
                mL + cW, y, { align: 'right' },
            );
            doc.text(
                `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
                mL + cW, y + 4, { align: 'right' },
            );

            /* ── Save ── */
            doc.save(filename);
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
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 500 }}>Generating report...</div>
            </div>
        );
    }

    if (error) return <Alert type="error" message={error} showIcon />;
    if (!report) return <Empty description="No data for this period" />;

    const { overview, performance, trends } = report;
    const prevLabel = `${MONTHS[trends.prev_month - 1]?.slice(0, 3)} ${trends.prev_year}`;
    const anyOverview = on('submitted') || on('resolved') || on('open') || on('overdue');
    const anyPerf = on('avg_resolution') || on('on_time') || on('satisfaction');
    const anyTrends = on('trend_resolved') || on('trend_speed');

    const resolvedTickets = report.tickets.filter(t => t.done_at);
    const avgSolveTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, t) => sum + (t.solve_time_hours || 0), 0) / resolvedTickets.length
        : 0;
    const onTimeCount = report.tickets.filter(t => t.on_time === true).length;
    const withDueCount = report.tickets.filter(t => t.on_time !== null).length;

    /* ── Section header ── */
    const SectionTitle = ({ children }: { children: React.ReactNode }) => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        }}>
            <div style={{ width: 3, height: 16, background: BRAND, borderRadius: 1 }} />
            <span style={{
                fontSize: 11, fontWeight: 700, color: INK,
                textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
                {children}
            </span>
        </div>
    );

    /* ── Table styles ── */
    const thStyle: React.CSSProperties = {
        padding: '8px 10px',
        fontSize: 10,
        fontWeight: 600,
        color: '#cbd5e1',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        borderBottom: 'none',
    };
    const tdStyle: React.CSSProperties = {
        padding: '7px 10px',
        fontSize: 11,
        color: INK_SECONDARY,
        borderBottom: `1px solid ${SURFACE_INSET}`,
        verticalAlign: 'middle',
    };

    return (
        <div>
            {/* ── Toolbar (outside print area) ── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 16, flexWrap: 'wrap', gap: 8,
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-heading)' }}>
                        {report.period.month_name} {report.period.year}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {report.company.name}
                    </span>
                </div>
                <Space size={6}>
                    <Select value={selectedMonth} onChange={setSelectedMonth} style={{ width: 120 }} size="small">
                        {MONTHS.map((m, i) => <Option key={i + 1} value={i + 1}>{m}</Option>)}
                    </Select>
                    <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 80 }} size="small">
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
                    background: 'var(--color-bg-inset)', border: '1px solid var(--color-border-light)', borderRadius: 6,
                    padding: '10px 14px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
                }}>
                    {ALL_METRICS.map(m => (
                        <Checkbox key={m.key} checked={enabledMetrics[m.key]} onChange={() => toggle(m.key)} style={{ fontSize: 12 }}>
                            {m.label}
                        </Checkbox>
                    ))}
                </div>
            )}

            {/* ── A4 Paper ── */}
            <div style={{
                background: 'var(--color-bg-inset)',
                borderRadius: 8,
                padding: '28px 36px',
                margin: '0 -12px',
            }}>
              <div
                style={{
                    background: '#fff',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    maxWidth: 1100,
                    margin: '0 auto',
                    borderRadius: 2,
                    overflow: 'hidden',
                    /* Surface color shift: white paper on gray desk */
                }}
              >
                {/* ── Accent rule: 2px solid brand ── */}
                <div style={{ height: 2, background: BRAND }} />

                <div style={{ padding: '36px 44px 32px' }}>

                    {/* ── Document Header ── */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        paddingBottom: 20, marginBottom: 24,
                        borderBottom: `1px solid ${RULE}`,
                    }}>
                        <div>
                            <div style={{
                                fontSize: 10, fontWeight: 600, color: BRAND,
                                textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4,
                            }}>
                                Monthly Service Report
                            </div>
                            <div style={{
                                fontSize: 26, fontWeight: 800, color: INK,
                                lineHeight: 1.15, letterSpacing: '-0.015em',
                            }}>
                                {report.company.name}
                            </div>
                            <div style={{ fontSize: 14, color: INK_MUTED, marginTop: 4, fontWeight: 500 }}>
                                {report.period.month_name} {report.period.year}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', paddingTop: 2 }}>
                            {report.company.logo_url && (
                                <img
                                    src={report.company.logo_url}
                                    alt=""
                                    style={{ maxHeight: 44, maxWidth: 110, objectFit: 'contain', marginBottom: 6 }}
                                />
                            )}
                            <div style={{ fontSize: 10, color: INK_FAINT, lineHeight: 1.5 }}>
                                Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    {/* ── Key Figures Strip (dense) ── */}
                    {/* Compact horizontal strip — like a financial report "at a glance" row */}
                    {anyOverview && (
                        <div style={{
                            display: 'flex', marginBottom: 24,
                            background: SURFACE, border: `1px solid ${RULE}`, borderRadius: 6,
                            overflow: 'hidden',
                        }}>
                            {on('submitted') && (
                                <div style={{ flex: 1, padding: '14px 20px', borderRight: `1px solid ${RULE}` }}>
                                    <div style={{
                                        fontSize: 24, fontWeight: 800, color: BRAND, lineHeight: 1,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {overview.submitted}
                                    </div>
                                    <div style={{ fontSize: 10, color: INK_MUTED, marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Submitted
                                    </div>
                                </div>
                            )}
                            {on('resolved') && (
                                <div style={{ flex: 1, padding: '14px 20px', borderRight: `1px solid ${RULE}` }}>
                                    <div style={{
                                        fontSize: 24, fontWeight: 800, color: '#065f46', lineHeight: 1,
                                        fontVariantNumeric: 'tabular-nums',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                        {overview.resolved}
                                        {trends.resolved_change !== 0 && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 600,
                                                color: trends.resolved_change > 0 ? '#059669' : '#dc2626',
                                                display: 'inline-flex', alignItems: 'center', gap: 2,
                                            }}>
                                                {trends.resolved_change > 0 ? '\u25B2' : '\u25BC'}
                                                {Math.abs(trends.resolved_change_pct)}%
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 10, color: INK_MUTED, marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Resolved
                                    </div>
                                </div>
                            )}
                            {on('open') && (
                                <div style={{ flex: 1, padding: '14px 20px', borderRight: `1px solid ${RULE}` }}>
                                    <div style={{
                                        fontSize: 24, fontWeight: 800, color: '#92400e', lineHeight: 1,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {overview.open}
                                    </div>
                                    <div style={{ fontSize: 10, color: INK_MUTED, marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Open
                                    </div>
                                </div>
                            )}
                            {on('overdue') && (
                                <div style={{ flex: 1, padding: '14px 20px' }}>
                                    <div style={{
                                        fontSize: 24, fontWeight: 800, lineHeight: 1,
                                        fontVariantNumeric: 'tabular-nums',
                                        color: overview.overdue > 0 ? '#991b1b' : INK_FAINT,
                                    }}>
                                        {overview.overdue}
                                    </div>
                                    <div style={{ fontSize: 10, color: INK_MUTED, marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Overdue
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Performance Metrics (spacious — each card has unique layout) ── */}
                    {anyPerf && (
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Performance</SectionTitle>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {on('avg_resolution') && (
                                    <div style={{
                                        flex: 1, padding: '16px 20px',
                                        background: '#fff', border: `1px solid ${RULE}`, borderRadius: 6,
                                    }}>
                                        <div style={{ fontSize: 10, color: INK_MUTED, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                            Avg Resolution Time
                                        </div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: INK, lineHeight: 1 }}>
                                            {formatHours(performance.avg_resolution_hours)}
                                        </div>
                                        {trends.resolution_change_hours !== 0 && (
                                            <div style={{
                                                marginTop: 8, fontSize: 11, fontWeight: 500,
                                                color: trends.resolution_change_hours < 0 ? '#059669' : '#dc2626',
                                                display: 'flex', alignItems: 'center', gap: 4,
                                            }}>
                                                {trends.resolution_change_hours < 0
                                                    ? <RiseOutlined style={{ fontSize: 10 }} />
                                                    : <FallOutlined style={{ fontSize: 10 }} />}
                                                {formatHours(Math.abs(trends.resolution_change_hours))}
                                                {' '}{trends.resolution_change_hours < 0 ? 'faster' : 'slower'} vs {prevLabel}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {on('on_time') && (
                                    <div style={{
                                        flex: 1, padding: '16px 20px',
                                        background: '#fff', border: `1px solid ${RULE}`, borderRadius: 6,
                                    }}>
                                        <div style={{ fontSize: 10, color: INK_MUTED, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                            On-Time Completion
                                        </div>
                                        <div style={{
                                            fontSize: 22, fontWeight: 800, lineHeight: 1,
                                            color: performance.on_time_pct >= 80 ? '#065f46' : performance.on_time_pct >= 60 ? '#92400e' : '#991b1b',
                                        }}>
                                            {performance.on_time_pct}%
                                        </div>
                                        {/* SLA compliance bar — the signature element */}
                                        <div style={{
                                            marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
                                        }}>
                                            <div style={{
                                                flex: 1, height: 6, borderRadius: 3,
                                                background: SURFACE_INSET, overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 3,
                                                    width: `${Math.min(performance.on_time_pct, 100)}%`,
                                                    background: performance.on_time_pct >= 80 ? '#059669' : performance.on_time_pct >= 60 ? '#d97706' : '#dc2626',
                                                }} />
                                            </div>
                                            {withDueCount > 0 && (
                                                <span style={{ fontSize: 10, color: INK_FAINT, whiteSpace: 'nowrap' }}>
                                                    {onTimeCount}/{withDueCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {on('satisfaction') && (
                                    <div style={{
                                        flex: 1, padding: '16px 20px',
                                        background: '#fff', border: `1px solid ${RULE}`, borderRadius: 6,
                                    }}>
                                        <div style={{ fontSize: 10, color: INK_MUTED, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                            Satisfaction
                                        </div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: INK, lineHeight: 1 }}>
                                            {performance.satisfaction !== null ? `${performance.satisfaction.toFixed(1)}` : '\u2014'}
                                            {performance.satisfaction !== null && (
                                                <span style={{ fontSize: 13, fontWeight: 500, color: INK_FAINT }}> / 5</span>
                                            )}
                                        </div>
                                        {performance.satisfaction !== null && (
                                            <div style={{
                                                marginTop: 8, height: 6, borderRadius: 3,
                                                background: SURFACE_INSET, overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 3,
                                                    width: `${Math.min((performance.satisfaction / 5) * 100, 100)}%`,
                                                    background: performance.satisfaction >= 4 ? '#059669' : performance.satisfaction >= 3 ? '#d97706' : '#dc2626',
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Month-over-Month (compact comparison) ── */}
                    {anyTrends && (
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Month-over-Month</SectionTitle>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {on('trend_resolved') && (
                                    <div style={{
                                        flex: 1, padding: '14px 20px',
                                        border: `1px solid ${RULE}`, borderRadius: 6,
                                    }}>
                                        <div style={{ fontSize: 10, color: INK_MUTED, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                                            Resolved Tickets
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                            <span style={{ fontSize: 16, fontWeight: 600, color: INK_FAINT, fontVariantNumeric: 'tabular-nums' }}>
                                                {trends.prev_resolved}
                                            </span>
                                            <span style={{ fontSize: 11, color: INK_FAINT }}>{'\u2192'}</span>
                                            <span style={{ fontSize: 18, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                                                {overview.resolved}
                                            </span>
                                            {trends.resolved_change !== 0 && (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 600,
                                                    color: trends.resolved_change > 0 ? '#059669' : '#dc2626',
                                                    background: trends.resolved_change > 0 ? '#ecfdf5' : '#fef2f2',
                                                    padding: '1px 6px', borderRadius: 8,
                                                }}>
                                                    {trends.resolved_change > 0 ? '+' : ''}{trends.resolved_change}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 10, color: INK_FAINT, marginTop: 4 }}>
                                            vs {MONTHS[trends.prev_month - 1]} {trends.prev_year}
                                        </div>
                                    </div>
                                )}
                                {on('trend_speed') && (
                                    <div style={{
                                        flex: 1, padding: '14px 20px',
                                        border: `1px solid ${RULE}`, borderRadius: 6,
                                    }}>
                                        <div style={{ fontSize: 10, color: INK_MUTED, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                                            Resolution Speed
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                            <span style={{ fontSize: 16, fontWeight: 600, color: INK_FAINT, fontVariantNumeric: 'tabular-nums' }}>
                                                {formatHours(trends.prev_avg_resolution_hours)}
                                            </span>
                                            <span style={{ fontSize: 11, color: INK_FAINT }}>{'\u2192'}</span>
                                            <span style={{ fontSize: 18, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                                                {formatHours(performance.avg_resolution_hours)}
                                            </span>
                                            {trends.resolution_change_hours !== 0 && (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 600,
                                                    color: trends.resolution_change_hours < 0 ? '#059669' : '#dc2626',
                                                    background: trends.resolution_change_hours < 0 ? '#ecfdf5' : '#fef2f2',
                                                    padding: '1px 6px', borderRadius: 8,
                                                }}>
                                                    {trends.resolution_change_hours < 0 ? 'Faster' : 'Slower'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 10, color: INK_FAINT, marginTop: 4 }}>
                                            vs {MONTHS[trends.prev_month - 1]} {trends.prev_year}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Ticket Details Table (dense) ── */}
                    {report.tickets && report.tickets.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <div style={{ width: 3, height: 16, background: BRAND, borderRadius: 1 }} />
                                <span style={{
                                    fontSize: 11, fontWeight: 700, color: INK,
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}>
                                    Ticket Details
                                </span>
                                <span style={{
                                    fontSize: 10, fontWeight: 600, color: BRAND,
                                    background: BRAND_LIGHT, padding: '1px 8px', borderRadius: 8,
                                }}>
                                    {report.tickets.length}
                                </span>
                            </div>

                            <div style={{ border: `1px solid ${RULE}`, borderRadius: 6, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b' }}>
                                            <th style={{ ...thStyle, width: 28, textAlign: 'center' }}>#</th>
                                            <th style={{ ...thStyle, minWidth: 120 }}>Ticket</th>
                                            <th style={{ ...thStyle, width: 68 }}>Priority</th>
                                            <th style={{ ...thStyle, width: 100 }}>Reporter</th>
                                            <th style={{ ...thStyle, width: 100 }}>Assignee</th>
                                            <th style={{ ...thStyle, width: 76 }}>Created</th>
                                            <th style={{ ...thStyle, width: 76 }}>Done</th>
                                            <th style={{ ...thStyle, width: 72, textAlign: 'right' }}>Time</th>
                                            <th style={{ ...thStyle, width: 72, textAlign: 'center' }}>SLA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.tickets.map((ticket, idx) => {
                                            const p = PRIORITY_STYLES[ticket.priority_id] || { bg: SURFACE_INSET, text: INK_MUTED, border: RULE };
                                            return (
                                                <tr key={ticket.id} style={{ background: idx % 2 === 0 ? '#fff' : SURFACE }}>
                                                    <td style={{ ...tdStyle, color: INK_FAINT, fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
                                                        {idx + 1}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            color: BRAND, fontWeight: 700, fontSize: 10,
                                                            marginRight: 5,
                                                            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                                                        }}>
                                                            {ticket.ticket_key}
                                                        </span>
                                                        <span style={{ color: INK, fontWeight: 500, fontSize: 11 }}>
                                                            {ticket.name}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            fontSize: 9, fontWeight: 600,
                                                            color: p.text, background: p.bg,
                                                            padding: '2px 6px', borderRadius: 3,
                                                            border: `1px solid ${p.border}`,
                                                        }}>
                                                            {ticket.priority_label}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 10.5 }}>
                                                        {formatPersonName(ticket.reporter)}
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 10.5 }}>
                                                        {ticket.assignees.length > 0
                                                            ? ticket.assignees.map(a => formatPersonName(a)).join(', ')
                                                            : '\u2014'}
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 10.5, whiteSpace: 'nowrap', color: INK_MUTED }}>
                                                        {ticket.created_at_display || '\u2014'}
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 10.5, whiteSpace: 'nowrap', color: INK_MUTED }}>
                                                        {ticket.done_at_display || '\u2014'}
                                                    </td>
                                                    <td style={{
                                                        ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 10.5,
                                                        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                                                        fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                                                    }}>
                                                        {ticket.solve_time_hours !== null ? formatHours(ticket.solve_time_hours) : '\u2014'}
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                        {ticket.on_time === true && (
                                                            <span style={{
                                                                fontSize: 8.5, fontWeight: 700, color: '#059669',
                                                                background: '#ecfdf5', padding: '2px 5px', borderRadius: 3,
                                                                border: '1px solid #a7f3d0', letterSpacing: '0.02em',
                                                            }}>
                                                                ON TIME
                                                            </span>
                                                        )}
                                                        {ticket.on_time === false && (
                                                            <span style={{
                                                                fontSize: 8.5, fontWeight: 700, color: '#dc2626',
                                                                background: '#fef2f2', padding: '2px 5px', borderRadius: 3,
                                                                border: '1px solid #fecaca', letterSpacing: '0.02em',
                                                            }}>
                                                                LATE
                                                            </span>
                                                        )}
                                                        {ticket.on_time === null && (
                                                            <span style={{ fontSize: 10, color: '#cbd5e1' }}>{'\u2014'}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {report.tickets && report.tickets.length === 0 && (
                        <div style={{
                            textAlign: 'center', padding: '40px 0', color: INK_FAINT, fontSize: 13,
                            border: `1px dashed ${RULE}`, borderRadius: 6,
                        }}>
                            No tickets found for this period.
                        </div>
                    )}

                    {/* ── Document Footer ── */}
                    <div style={{
                        marginTop: 28, paddingTop: 16,
                        borderTop: `1px solid ${RULE}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                    }}>
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: 9, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums' }}>{report.tickets.length}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{resolvedTickets.length}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Time</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums' }}>{formatHours(avgSolveTime)}</div>
                            </div>
                            {withDueCount > 0 && (
                                <div>
                                    <div style={{ fontSize: 9, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA Rate</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                                        {Math.round(onTimeCount / withDueCount * 100)}%
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ fontSize: 9, color: INK_FAINT, textAlign: 'right', lineHeight: 1.6 }}>
                            {report.company.name} &middot; {report.period.month_name} {report.period.year}<br />
                            Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>

                </div>
              </div>
            </div>

            {/* ── Send Modal ── */}
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Recipient</div>
                    <Input
                        type="email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        placeholder="name@company.com"
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Period</div>
                    <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
                        {report.period.month_name} {report.period.year} &mdash; {report.company.name}
                    </span>
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Included metrics</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {ALL_METRICS.filter(m => enabledMetrics[m.key]).map(m => (
                            <Tag key={m.key} style={{ fontSize: 12 }}>{m.label}</Tag>
                        ))}
                        {enabledSections.length === 0 && (
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>None selected</span>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CompanyMonthlyReport;
