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
    Segmented,
} from 'antd';
import {
    SendOutlined,
    RiseOutlined,
    FallOutlined,
    SettingOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { apiService } from '../services';
import { API_ENDPOINTS } from '../config/api';

const { Option } = Select;

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
}

interface CompanyMonthlyReportProps {
    companyId: number;
    projectId?: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// Every metric the report can show, individually toggleable
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

// Compact metric cell with background
const Metric: React.FC<{
    label: string;
    value: React.ReactNode;
    change?: string;
    good?: boolean;
    muted?: boolean;
    warn?: boolean;
}> = ({ label, value, change, good, muted, warn }) => (
    <div style={{
        flex: '1 1 0', minWidth: 0,
        background: '#f8fafc', borderRadius: 6, padding: '10px 12px',
    }}>
        <div style={{
            fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
            color: warn ? '#ef4444' : muted ? '#b0b8c4' : '#1e293b',
        }}>
            {value}
        </div>
        <div style={{ fontSize: 11, color: '#8896a6', marginTop: 2 }}>{label}</div>
        {change && (
            <div style={{
                fontSize: 10, fontWeight: 600, marginTop: 3,
                color: good ? '#16a34a' : '#dc2626',
                display: 'inline-flex', alignItems: 'center', gap: 2,
            }}>
                {good ? <RiseOutlined /> : <FallOutlined />}
                {change}
            </div>
        )}
    </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, marginTop: 14 }}>
        {children}
    </div>
);

const MetricGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ display: 'flex', gap: 8 }}>
        {children}
    </div>
);


// ─── Email template variants ───
type EmailVariant = 'ledger' | 'statuspage' | 'document' | 'grid' | 'stripe';

const EMAIL_VARIANTS: { value: EmailVariant; label: string }[] = [
    { value: 'ledger', label: 'Ledger' },
    { value: 'statuspage', label: 'Status Page' },
    { value: 'document', label: 'Document' },
    { value: 'grid', label: 'Grid' },
    { value: 'stripe', label: 'Stripe' },
];

interface EmailData {
    companyName: string;
    period: string;
    overview: MonthlyReportData['overview'];
    performance: MonthlyReportData['performance'];
    trends: MonthlyReportData['trends'];
    prevLabel: string;
}

const fmtH = (hours: number): string => {
    if (!hours || hours === 0) return '0h';
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${Math.round(hours)}h`;
    const d = Math.floor(hours / 24);
    const r = Math.round(hours % 24);
    return r > 0 ? `${d}d ${r}h` : `${d}d`;
};

function buildEmailHtml(variant: EmailVariant, d: EmailData): string {
    const { companyName, period, overview, performance, trends, prevLabel } = d;
    const sat = performance.satisfaction !== null ? `${performance.satisfaction.toFixed(1)} / 5` : '\u2014';
    const resolvedPct = trends.resolved_change !== 0
        ? `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change_pct}%`
        : '';
    const resFaster = trends.resolution_change_hours !== 0
        ? `${fmtH(Math.abs(trends.resolution_change_hours))} ${trends.resolution_change_hours < 0 ? 'faster' : 'slower'}`
        : '';
    const onTimeColor = performance.on_time_pct >= 80 ? '#059669' : (performance.on_time_pct >= 60 ? '#f59e0b' : '#ef4444');
    const overdueColor = overview.overdue > 0 ? '#ef4444' : '#1e293b';

    const wrap = (body: string) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>${body}</html>`;

    // ── Variant 1: Ledger ──
    if (variant === 'ledger') {
        const row = (label: string, val: string, badge = '', color = '#1e293b') =>
            `<tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569">${label}</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap"><span style="font-size:18px;font-weight:600;color:${color}">${val}</span>${badge}</td></tr>`;
        const badge = (text: string, good: boolean) => text
            ? `<span style="font-size:12px;font-weight:600;color:${good ? '#16a34a' : '#dc2626'};margin-left:8px">&#${good ? '9650' : '9660'}; ${text}</span>` : '';
        const section = (title: string) => `<tr><td colspan="2" style="padding:20px 0 6px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">${title}</td></tr>`;
        return wrap(`<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f1f5f9"><div style="max-width:560px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden"><div style="padding:28px 28px 20px;border-bottom:1px solid #f1f5f9"><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Service Report</div><div style="font-size:20px;font-weight:600;color:#1e293b">${companyName}</div><div style="font-size:14px;color:#64748b;margin-top:4px">${period}</div></div><div style="padding:4px 28px 20px"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${section('Volume')}${row('Requests submitted', String(overview.submitted))}${row('Requests resolved', String(overview.resolved), badge(resolvedPct ? `${resolvedPct} vs ${prevLabel}` : '', trends.resolved_change > 0))}${row('Currently open', String(overview.open))}${row('Overdue', String(overview.overdue), '', overdueColor)}${section('Service Quality')}${row('Avg resolution time', fmtH(performance.avg_resolution_hours), badge(resFaster, trends.resolution_change_hours < 0))}${row('On-time completion', `${performance.on_time_pct}%`)}${row('Customer satisfaction', sat)}${section('Month over Month')}${row('Resolved in ' + prevLabel, String(trends.prev_resolved), badge(trends.resolved_change !== 0 ? `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change} this month` : '', trends.resolved_change > 0), '#94a3b8')}${row('Avg resolution in ' + prevLabel, fmtH(trends.prev_avg_resolution_hours), badge(resFaster ? `${fmtH(Math.abs(trends.resolution_change_hours))} now` : '', trends.resolution_change_hours < 0), '#94a3b8')}</table></div></div><div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px">Automated report from the Ticketing System.</div></div></body>`);
    }

    // ── Variant 2: Status Page ──
    if (variant === 'statuspage') {
        const metricBar = (label: string, val: string, pct: number, color: string, extra = '') =>
            `<tr><td style="padding:8px 0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:#334155">${label}</td><td style="text-align:right;white-space:nowrap"><span style="font-size:14px;font-weight:600;color:#1e293b">${val}</span>${extra}</td></tr></table><div style="background:#f1f5f9;border-radius:4px;height:6px;margin-top:6px;overflow:hidden"><div style="background:${color};height:6px;border-radius:4px;width:${pct}%"></div></div></td></tr>`;
        const qualRow = (label: string, val: string, extra = '') =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid #f8fafc"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:#334155">${label}</td><td style="text-align:right;white-space:nowrap"><span style="font-size:14px;font-weight:600;color:#1e293b">${val}</span>${extra}</td></tr></table></td></tr>`;
        const total = overview.submitted || 1;
        const sm = (text: string, color = '#059669') => text ? `<span style="font-size:11px;font-weight:600;color:${color};margin-left:6px">${text}</span>` : '';
        return wrap(`<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc"><div style="max-width:560px;margin:0 auto;padding:32px 16px"><div style="background:#1e293b;padding:20px 24px;border-radius:8px 8px 0 0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><div style="font-size:18px;font-weight:600;color:#fff">${companyName}</div><div style="font-size:13px;color:#94a3b8;margin-top:4px">Service Report &middot; ${period}</div></td><td style="text-align:right;vertical-align:top"><div style="display:inline-block;background:${onTimeColor};color:white;font-size:12px;font-weight:600;padding:4px 12px;border-radius:12px">${performance.on_time_pct}% on-time</div></td></tr></table></div><div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px"><div style="padding:20px 24px;border-bottom:1px solid #f1f5f9"><div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px">Volume</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${metricBar('Submitted', String(overview.submitted), 100, '#3b82f6')}${metricBar('Resolved', String(overview.resolved), Math.round(overview.resolved / total * 100), '#10b981', sm(resolvedPct ? `+${trends.resolved_change_pct}%` : ''))}${metricBar('Open', String(overview.open), Math.round(overview.open / total * 100), '#f59e0b')}${metricBar('Overdue', String(overview.overdue), Math.round(overview.overdue / total * 100), '#ef4444')}</table></div><div style="padding:20px 24px;border-bottom:1px solid #f1f5f9"><div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px">Service Quality</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${qualRow('Avg resolution time', fmtH(performance.avg_resolution_hours), sm(resFaster))}${qualRow('On-time completion', `${performance.on_time_pct}%`)}${qualRow('Customer satisfaction', sat)}</table></div><div style="padding:20px 24px"><div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px">Month over Month</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${qualRow('Resolved in ' + prevLabel, String(trends.prev_resolved), sm(trends.resolved_change !== 0 ? `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change} this month` : ''))}${qualRow('Avg resolution in ' + prevLabel, fmtH(trends.prev_avg_resolution_hours), sm(resFaster ? fmtH(Math.abs(trends.resolution_change_hours)) + ' faster now' : ''))}</table></div></div><div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px">Automated report from the Ticketing System.</div></div></body>`);
    }

    // ── Variant 3: Formal Document ──
    if (variant === 'document') {
        const row = (label: string, val: string, note = '', color = '#1e293b') =>
            `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px 0;font-size:15px;color:#475569;font-family:Georgia,serif">${label}</td><td style="padding:10px 0;text-align:right;white-space:nowrap"><span style="font-size:15px;font-weight:700;color:${color}">${val}</span>${note ? `<span style="font-size:12px;font-family:-apple-system,sans-serif;color:#059669;margin-left:8px">(${note})</span>` : ''}</td></tr>`;
        const section = (title: string) => `</table><div style="font-size:13px;font-family:-apple-system,sans-serif;font-weight:600;color:#1e293b;text-transform:uppercase;letter-spacing:0.06em;margin:28px 0 12px">${title}</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">`;
        return wrap(`<body style="font-family:Georgia,'Times New Roman',serif;margin:0;padding:0;background:#e2e8f0"><div style="max-width:580px;margin:0 auto;padding:32px 16px"><div style="background:#fff;padding:48px 40px;border-radius:2px;box-shadow:0 1px 4px rgba(0,0,0,0.08)"><div style="border-bottom:2px solid #1e293b;padding-bottom:20px;margin-bottom:32px"><div style="font-size:11px;font-family:-apple-system,sans-serif;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Monthly Service Report</div><div style="font-size:24px;font-weight:400;color:#1e293b">${companyName}</div><div style="font-size:15px;color:#64748b;margin-top:4px">${period}</div></div><div style="font-size:13px;font-family:-apple-system,sans-serif;font-weight:600;color:#1e293b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">Volume</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${row('Requests submitted', String(overview.submitted))}${row('Requests resolved', String(overview.resolved), resolvedPct ? `${resolvedPct} vs prior month` : '')}${row('Currently open', String(overview.open))}${row('Overdue', String(overview.overdue), '', overdueColor)}${section('Service Quality')}${row('Average resolution time', fmtH(performance.avg_resolution_hours), resFaster)}${row('On-time completion rate', `${performance.on_time_pct}%`)}${row('Customer satisfaction', sat)}${section('Month over Month')}${row('Resolved in ' + prevLabel, String(trends.prev_resolved), trends.resolved_change !== 0 ? `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change} this month` : '', '#94a3b8')}${row('Avg resolution in ' + prevLabel, fmtH(trends.prev_avg_resolution_hours), resFaster ? fmtH(Math.abs(trends.resolution_change_hours)) + ' faster now' : '', '#94a3b8')}</table><div style="border-top:2px solid #1e293b;margin-top:32px;padding-top:16px"><div style="font-size:12px;font-family:-apple-system,sans-serif;color:#94a3b8">Automated report &middot; Ticketing System</div></div></div></div></body>`);
    }

    // ── Variant 4: Compact Grid ──
    if (variant === 'grid') {
        const cell = (val: string, label: string, bg = '#f8fafc', color = '#1e293b', extra = '') =>
            `<td style="background:${bg};padding:14px;border-radius:6px;text-align:center"><div style="font-size:24px;font-weight:700;color:${color};line-height:1">${val}</div><div style="font-size:11px;color:#64748b;margin-top:4px">${label}</div>${extra}</td>`;
        const sm = (text: string) => text ? `<div style="font-size:10px;font-weight:600;color:#059669;margin-top:2px">${text}</div>` : '';
        return wrap(`<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f1f5f9"><div style="max-width:560px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><div style="padding:24px;border-bottom:1px solid #e2e8f0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><div style="font-size:18px;font-weight:600;color:#1e293b">${companyName}</div></td><td style="text-align:right"><div style="font-size:13px;color:#64748b">${period}</div><div style="font-size:11px;color:#94a3b8">Service Report</div></td></tr></table></div><div style="padding:20px 24px 8px"><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Volume</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px"><tr>${cell(String(overview.submitted), 'Submitted')}${cell(String(overview.resolved), 'Resolved', '#f8fafc', '#1e293b', sm(resolvedPct ? `+${trends.resolved_change_pct}%` : ''))}${cell(String(overview.open), 'Open')}${cell(String(overview.overdue), 'Overdue', overview.overdue > 0 ? '#fef2f2' : '#f8fafc', overview.overdue > 0 ? '#ef4444' : '#1e293b')}</tr></table></div><div style="padding:16px 24px 8px"><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Service Quality</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px"><tr>${cell(fmtH(performance.avg_resolution_hours), 'Avg Resolution', '#f8fafc', '#1e293b', sm(resFaster))}${cell(`${performance.on_time_pct}%`, 'On-Time')}${cell(performance.satisfaction !== null ? `${performance.satisfaction.toFixed(1)}/5` : '\u2014', 'Satisfaction')}</tr></table></div><div style="padding:16px 24px 24px"><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">vs ${prevLabel}</div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px"><tr><td style="background:#f0fdf4;padding:14px;border-radius:6px;text-align:center;width:50%"><div style="font-size:11px;color:#64748b;margin-bottom:4px">Resolved</div><span style="font-size:16px;color:#94a3b8">${trends.prev_resolved}</span><span style="font-size:14px;color:#94a3b8;margin:0 6px">&rarr;</span><span style="font-size:16px;font-weight:700;color:#166534">${overview.resolved}</span></td><td style="background:#f0fdf4;padding:14px;border-radius:6px;text-align:center;width:50%"><div style="font-size:11px;color:#64748b;margin-bottom:4px">Avg Resolution</div><span style="font-size:16px;color:#94a3b8">${fmtH(trends.prev_avg_resolution_hours)}</span><span style="font-size:14px;color:#94a3b8;margin:0 6px">&rarr;</span><span style="font-size:16px;font-weight:700;color:#166534">${fmtH(performance.avg_resolution_hours)}</span></td></tr></table></div></div><div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px">Automated report from the Ticketing System.</div></div></body>`);
    }

    // ── Variant 5: Stripe-style ──
    const pill = (text: string, good: boolean) => text
        ? `<span style="font-size:11px;font-weight:600;color:${good ? '#3ecf8e' : '#e25950'};background:${good ? '#e6f9f0' : '#fef2f2'};padding:2px 6px;border-radius:3px;margin-left:6px">${text}</span>` : '';
    const sRow = (label: string, val: string, badge = '', color = '#1a1a2e') =>
        `<tr><td style="padding:14px 16px;font-size:14px;color:${color === '#8898aa' ? '#8898aa' : '#525f7f'};border-bottom:1px solid #f0f4f8">${label}</td><td style="padding:14px 16px;text-align:right;border-bottom:1px solid #f0f4f8;white-space:nowrap"><span style="font-size:14px;font-weight:600;color:${color}">${val}</span>${badge}</td></tr>`;
    const divider = '<tr><td colspan="2" style="padding:0;height:1px;background:#e2e8f0"></td></tr>';
    return wrap(`<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f6f9fc"><div style="max-width:520px;margin:0 auto;padding:40px 16px"><div style="margin-bottom:24px;padding:0 4px"><div style="font-size:24px;font-weight:600;color:#1a1a2e;letter-spacing:-0.02em">Service Report</div><div style="font-size:14px;color:#8898aa;margin-top:4px">${companyName} &middot; ${period}</div></div><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px 0;margin-bottom:24px"><tr><td style="background:#fff;padding:20px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.06);text-align:center"><div style="font-size:28px;font-weight:700;color:#1a1a2e">${overview.resolved}</div><div style="font-size:12px;color:#8898aa;margin-top:2px">resolved</div></td><td style="background:#fff;padding:20px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.06);text-align:center"><div style="font-size:28px;font-weight:700;color:#1a1a2e">${fmtH(performance.avg_resolution_hours)}</div><div style="font-size:12px;color:#8898aa;margin-top:2px">avg resolution</div></td><td style="background:#fff;padding:20px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.06);text-align:center"><div style="font-size:28px;font-weight:700;color:#1a1a2e">${performance.on_time_pct}%</div><div style="font-size:12px;color:#8898aa;margin-top:2px">on-time</div></td></tr></table><div style="background:#fff;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${sRow('Requests submitted', String(overview.submitted))}${sRow('Requests resolved', String(overview.resolved), pill(resolvedPct ? resolvedPct : '', trends.resolved_change > 0))}${sRow('Currently open', String(overview.open))}${sRow('Overdue', String(overview.overdue), '', overview.overdue > 0 ? '#e25950' : '#1a1a2e')}${divider}${sRow('Avg resolution time', fmtH(performance.avg_resolution_hours), pill(resFaster, trends.resolution_change_hours < 0))}${sRow('On-time completion', `${performance.on_time_pct}%`)}${sRow('Customer satisfaction', sat)}${divider}${sRow('Resolved in ' + prevLabel, String(trends.prev_resolved), pill(trends.resolved_change !== 0 ? `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change}` : '', trends.resolved_change > 0), '#8898aa')}${sRow('Avg resolution in ' + prevLabel, fmtH(trends.prev_avg_resolution_hours), pill(resFaster ? fmtH(Math.abs(trends.resolution_change_hours)) + ' faster' : '', trends.resolution_change_hours < 0), '#8898aa')}</table></div><div style="text-align:center;color:#8898aa;font-size:12px;margin-top:24px">Automated report from the Ticketing System.</div></div></body>`);
}


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

    // Per-metric toggles — all on by default
    const [enabledMetrics, setEnabledMetrics] = useState<Record<MetricKey, boolean>>(
        () => Object.fromEntries(ALL_METRICS.map(m => [m.key, true])) as Record<MetricKey, boolean>,
    );
    const [showSettings, setShowSettings] = useState(false);

    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [sending, setSending] = useState(false);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewVariant, setPreviewVariant] = useState<EmailVariant>('ledger');

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

    // Map enabled metrics back to sections for the send API
    const enabledSections = useMemo(() => {
        const sections = new Set<string>();
        ALL_METRICS.forEach(m => {
            if (enabledMetrics[m.key]) sections.add(m.section);
        });
        return Array.from(sections);
    }, [enabledMetrics]);

    const previewHtml = useMemo(() => {
        if (!report) return '';
        return buildEmailHtml(previewVariant, {
            companyName: report.company.name,
            period: `${report.period.month_name} ${report.period.year}`,
            overview: report.overview,
            performance: report.performance,
            trends: report.trends,
            prevLabel: `${MONTHS[report.trends.prev_month - 1]} ${report.trends.prev_year}`,
        });
    }, [report, previewVariant]);

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

    return (
        <div>
            {/* ── Header row ── */}
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
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
                        Preview
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

            {/* ── Per-metric toggles (collapsible) ── */}
            {showSettings && (
                <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 4,
                    padding: '8px 12px',
                    marginBottom: 12,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2px 16px',
                }}>
                    {ALL_METRICS.map(m => (
                        <Checkbox
                            key={m.key}
                            checked={enabledMetrics[m.key]}
                            onChange={() => toggle(m.key)}
                            style={{ fontSize: 12 }}
                        >
                            {m.label}
                        </Checkbox>
                    ))}
                </div>
            )}

            {/* ── Compact metric grid ── */}
            {(anyOverview || anyPerf || anyTrends) ? (
                <div>
                    {anyOverview && (
                        <>
                            <SectionLabel>Volume</SectionLabel>
                            <MetricGrid>
                                {on('submitted') && <Metric label="Submitted" value={overview.submitted} />}
                                {on('resolved') && (
                                    <Metric
                                        label="Resolved"
                                        value={overview.resolved}
                                        change={trends.resolved_change !== 0 ? `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change_pct}%` : undefined}
                                        good={trends.resolved_change > 0}
                                    />
                                )}
                                {on('open') && <Metric label="Open" value={overview.open} />}
                                {on('overdue') && <Metric label="Overdue" value={overview.overdue} warn={overview.overdue > 0} muted={overview.overdue === 0} />}
                            </MetricGrid>
                        </>
                    )}
                    {anyPerf && (
                        <>
                            <SectionLabel>Quality</SectionLabel>
                            <MetricGrid>
                                {on('avg_resolution') && (
                                    <Metric
                                        label="Avg resolution"
                                        value={formatHours(performance.avg_resolution_hours)}
                                        change={trends.resolution_change_hours !== 0
                                            ? `${Math.abs(trends.resolution_change_hours) < 1 ? '< 1h' : formatHours(Math.abs(trends.resolution_change_hours))} ${trends.resolution_change_hours < 0 ? 'faster' : 'slower'}`
                                            : undefined}
                                        good={trends.resolution_change_hours < 0}
                                    />
                                )}
                                {on('on_time') && <Metric label="On-time" value={`${performance.on_time_pct}%`} warn={performance.on_time_pct < 60} />}
                                {on('satisfaction') && (
                                    <Metric
                                        label="Satisfaction"
                                        value={performance.satisfaction !== null ? `${performance.satisfaction.toFixed(1)}/5` : '\u2014'}
                                        muted={performance.satisfaction === null}
                                    />
                                )}
                            </MetricGrid>
                        </>
                    )}
                    {anyTrends && (
                        <>
                            <SectionLabel>vs {prevLabel}</SectionLabel>
                            <MetricGrid>
                                {on('trend_resolved') && (
                                    <Metric
                                        label="Prev resolved"
                                        value={trends.prev_resolved}
                                        change={trends.resolved_change !== 0 ? `${trends.resolved_change > 0 ? '+' : ''}${trends.resolved_change} now` : undefined}
                                        good={trends.resolved_change > 0}
                                        muted
                                    />
                                )}
                                {on('trend_speed') && (
                                    <Metric
                                        label="Prev resolution"
                                        value={formatHours(trends.prev_avg_resolution_hours)}
                                        change={trends.resolution_change_hours !== 0 ? `${formatHours(Math.abs(trends.resolution_change_hours))} ${trends.resolution_change_hours < 0 ? 'faster' : 'slower'}` : undefined}
                                        good={trends.resolution_change_hours < 0}
                                        muted
                                    />
                                )}
                            </MetricGrid>
                        </>
                    )}
                </div>
            ) : (
                <Empty description="All metrics hidden" style={{ padding: 20 }} />
            )}

            {/* ── Send modal ── */}
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Recipient
                    </div>
                    <Input
                        type="email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        placeholder="name@company.com"
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Period
                    </div>
                    <span style={{ fontSize: 14, color: '#1e293b' }}>
                        {report.period.month_name} {report.period.year} &mdash; {report.company.name}
                    </span>
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Included metrics
                    </div>
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

            {/* ── Email preview modal ── */}
            <Modal
                title="Email Template Preview"
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                footer={null}
                width={680}
                styles={{ body: { padding: 0 } }}
            >
                <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #f0f0f0' }}>
                    <Segmented
                        value={previewVariant}
                        onChange={(val) => setPreviewVariant(val as EmailVariant)}
                        options={EMAIL_VARIANTS}
                        block
                    />
                </div>
                <div style={{ background: '#e2e8f0', padding: 0 }}>
                    <iframe
                        srcDoc={previewHtml}
                        style={{
                            width: '100%',
                            height: 600,
                            border: 'none',
                            display: 'block',
                        }}
                        title="Email preview"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default CompanyMonthlyReport;
