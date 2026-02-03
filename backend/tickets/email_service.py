"""
Email Service for Project Invitations and Monthly Reports
Handles sending invitation emails with token links and monthly report emails.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_invitation_email(invitation):
    """
    Send invitation email to the specified address
    
    Args:
        invitation: ProjectInvitation instance
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # Build invitation URL
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    invitation_url = f"{frontend_url}/invite/accept?token={invitation.token}"
    
    # Email context
    context = {
        'project_name': invitation.project.name,
        'project_key': invitation.project.key,
        'role': invitation.get_role_display(),
        'invited_by': invitation.invited_by.get_full_name() or invitation.invited_by.username if invitation.invited_by else 'Team',
        'invitation_url': invitation_url,
        'expires_at': invitation.expires_at,
    }
    
    # Email subject
    subject = f'You\'ve been invited to join {invitation.project.name}'
    
    # Plain text message (fallback)
    message = f"""
Hi,

{context['invited_by']} has invited you to join the project "{invitation.project.name}" ({invitation.project.key}).

You will be added as a {context['role']}.

Click the link below to accept this invitation:
{invitation_url}

This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}.

Note: Only the email address this invitation was sent to ({invitation.email}) can accept this invitation.

Best regards,
The Ticketing Team
    """.strip()
    
    # HTML message (optional, if you create a template)
    # html_message = render_to_string('emails/invitation.html', context)
    html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Noto Sans Georgian', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #0052cc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f4f5f7; padding: 30px; border-radius: 0 0 5px 5px; }}
        .button {{ display: inline-block; background-color: #0052cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 3px; margin: 20px 0; }}
        .info {{ background-color: white; padding: 15px; border-left: 3px solid #0052cc; margin: 15px 0; }}
        .footer {{ text-align: center; color: #6b778c; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Project Invitation</h1>
        </div>
        <div class="content">
            <p>Hi,</p>
            <p><strong>{context['invited_by']}</strong> has invited you to join the project:</p>
            
            <div class="info">
                <strong>{invitation.project.name}</strong> ({invitation.project.key})<br>
                Role: <strong>{context['role']}</strong>
            </div>
            
            <p>Click the button below to accept this invitation:</p>
            
            <div style="text-align: center;">
                <a href="{invitation_url}" class="button">Accept Invitation</a>
            </div>
            
            <p style="font-size: 14px; color: #6b778c;">
                This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}.
            </p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 3px; margin-top: 20px;">
                <strong>⚠️ Security Note:</strong> Only the email address this invitation was sent to 
                (<strong>{invitation.email}</strong>) can accept this invitation.
            </div>
        </div>
        <div class="footer">
            <p>This is an automated message from the Ticketing System.</p>
        </div>
    </div>
</body>
</html>
    """.strip()
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"❌ [Email] Failed to send invitation to {invitation.email}: {e}")
        return False


def _format_hours(hours):
    """Format hours into a human-readable string like '2d 4h' or '8h'."""
    if not hours or hours == 0:
        return '0h'
    if hours < 24:
        return f'{round(hours)}h'
    days = int(hours // 24)
    remaining = round(hours % 24)
    if remaining > 0:
        return f'{days}d {remaining}h'
    return f'{days}d'


def send_monthly_report_email(company, report_data, sections, recipient_email, month, year):
    """
    Send monthly report email with only selected sections.

    Args:
        company: Company instance
        report_data: dict with keys 'overview', 'performance', 'trends'
        sections: list of section keys to include ['overview', 'performance', 'trends']
        recipient_email: email address to send to
        month: report month
        year: report year

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    from calendar import month_name as cal_month_name

    period_label = f'{cal_month_name[month]} {year}'
    overview = report_data.get('overview', {})
    performance = report_data.get('performance', {})
    trends = report_data.get('trends', {})

    subject = f'Monthly Service Report — {company.name} — {period_label}'

    # ============ HELPER: single metric row ============
    def _metric_row(label, value, change_html='', warn=False, muted=False):
        value_color = '#ef4444' if warn else ('#94a3b8' if muted else '#1e293b')
        return f'''
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #475569;">{label}</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; white-space: nowrap;">
                    <span style="font-size: 18px; font-weight: 600; color: {value_color}; font-variant-numeric: tabular-nums;">{value}</span>
                    {change_html}
                </td>
            </tr>'''

    def _change_badge(value, good, label):
        if value == 0:
            return ''
        color = '#16a34a' if good else '#dc2626'
        arrow = '&#9650;' if good else '&#9660;'
        return f'<span style="font-size: 12px; font-weight: 600; color: {color}; margin-left: 8px;">{arrow} {label}</span>'

    def _section_header(title):
        return f'''
            <tr>
                <td colspan="2" style="padding: 20px 0 6px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">{title}</td>
            </tr>'''

    # ============ BUILD HTML ROWS ============
    rows = []

    # --- Overview ---
    if 'overview' in sections:
        submitted = overview.get('submitted', 0)
        resolved = overview.get('resolved', 0)
        open_count = overview.get('open', 0)
        overdue = overview.get('overdue', 0)
        resolved_change = trends.get('resolved_change', 0)
        resolved_change_pct = trends.get('resolved_change_pct', 0)

        prev_month_num = trends.get('prev_month', 1)
        prev_year_val = trends.get('prev_year', year)
        prev_label = f'{cal_month_name[prev_month_num]} {prev_year_val}'

        resolved_badge = _change_badge(
            resolved_change,
            resolved_change > 0,
            f'{"+" if resolved_change > 0 else ""}{resolved_change_pct}% vs {prev_label}',
        ) if resolved_change != 0 else ''

        rows.append(_section_header('Volume'))
        rows.append(_metric_row('Requests submitted', submitted))
        rows.append(_metric_row('Requests resolved', resolved, resolved_badge))
        rows.append(_metric_row('Currently open', open_count))
        rows.append(_metric_row('Overdue', overdue, warn=overdue > 0, muted=overdue == 0))

    # --- Performance ---
    if 'performance' in sections:
        avg_res = _format_hours(performance.get('avg_resolution_hours', 0))
        on_time = performance.get('on_time_pct', 0)
        satisfaction_val = performance.get('satisfaction')
        satisfaction_display = f'{satisfaction_val:.1f} / 5' if satisfaction_val is not None else '\u2014'

        resolution_change_hours = trends.get('resolution_change_hours', 0)
        res_badge = ''
        if resolution_change_hours != 0:
            abs_change = _format_hours(abs(resolution_change_hours))
            if abs(resolution_change_hours) < 1:
                abs_change = '< 1h'
            direction = 'faster' if resolution_change_hours < 0 else 'slower'
            res_badge = _change_badge(
                resolution_change_hours,
                resolution_change_hours < 0,
                f'{abs_change} {direction}',
            )

        rows.append(_section_header('Service Quality'))
        rows.append(_metric_row('Avg resolution time', avg_res, res_badge))
        rows.append(_metric_row('On-time completion', f'{on_time}%', warn=on_time < 60))
        rows.append(_metric_row('Customer satisfaction', satisfaction_display, muted=satisfaction_val is None))

    # --- Trends ---
    if 'trends' in sections:
        prev_month_num = trends.get('prev_month', 1)
        prev_year_val = trends.get('prev_year', year)
        prev_resolved = trends.get('prev_resolved', 0)
        resolved_change = trends.get('resolved_change', 0)
        prev_avg_res = trends.get('prev_avg_resolution_hours', 0)
        resolution_change_hours = trends.get('resolution_change_hours', 0)

        prev_label = f'{cal_month_name[prev_month_num]} {prev_year_val}'

        resolved_trend_badge = _change_badge(
            resolved_change,
            resolved_change > 0,
            f'{"+" if resolved_change > 0 else ""}{resolved_change} this month',
        ) if resolved_change != 0 else ''

        speed_trend_badge = ''
        if resolution_change_hours != 0:
            sign = '' if resolution_change_hours < 0 else '+'
            speed_trend_badge = _change_badge(
                resolution_change_hours,
                resolution_change_hours < 0,
                f'{sign}{_format_hours(abs(resolution_change_hours))} now',
            )

        rows.append(_section_header('Month over Month'))
        rows.append(_metric_row(f'Resolved in {prev_label}', prev_resolved, resolved_trend_badge, muted=True))
        rows.append(_metric_row(f'Avg resolution in {prev_label}', _format_hours(prev_avg_res), speed_trend_badge, muted=True))

    rows_html = '\n'.join(rows)

    html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f1f5f9; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">
        <div style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
            <!-- Header -->
            <div style="padding: 28px 28px 20px; border-bottom: 1px solid #f1f5f9;">
                <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Service Report</div>
                <div style="font-size: 20px; font-weight: 600; color: #1e293b;">{company.name}</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 4px;">{period_label}</div>
            </div>
            <!-- Metric rows -->
            <div style="padding: 4px 28px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    {rows_html}
                </table>
            </div>
        </div>
        <!-- Footer -->
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            Automated report from the Ticketing System.
        </div>
    </div>
</body>
</html>
    """.strip()

    # ============ PLAIN TEXT FALLBACK ============
    text_parts = [
        f'Monthly Service Report — {company.name}',
        f'{period_label}',
        '=' * 50, '',
    ]

    if 'overview' in sections:
        text_parts.append('OVERVIEW')
        text_parts.append('-' * 20)
        text_parts.append(f'  Submitted:  {overview.get("submitted", 0)}')
        text_parts.append(f'  Resolved:   {overview.get("resolved", 0)}')
        text_parts.append(f'  Open:       {overview.get("open", 0)}')
        text_parts.append(f'  Overdue:    {overview.get("overdue", 0)}')
        text_parts.append('')

    if 'performance' in sections:
        text_parts.append('PERFORMANCE')
        text_parts.append('-' * 20)
        text_parts.append(f'  Avg Resolution:  {_format_hours(performance.get("avg_resolution_hours", 0))}')
        text_parts.append(f'  On-Time:         {performance.get("on_time_pct", 0)}%')
        sat = performance.get('satisfaction')
        text_parts.append(f'  Satisfaction:    {f"{sat}/5" if sat is not None else "N/A"}')
        text_parts.append('')

    if 'trends' in sections:
        prev_month_num = trends.get('prev_month', 1)
        prev_year_val = trends.get('prev_year', year)
        text_parts.append('TRENDS')
        text_parts.append('-' * 20)
        text_parts.append(f'  {cal_month_name[prev_month_num]} {prev_year_val} resolved: {trends.get("prev_resolved", 0)}')
        text_parts.append(f'  {cal_month_name[month]} {year} resolved:     {overview.get("resolved", 0)}')
        change_pct = trends.get('resolved_change_pct', 0)
        change_val = trends.get('resolved_change', 0)
        sign = '+' if change_val > 0 else ''
        text_parts.append(f'  Change: {sign}{change_val} ({sign}{change_pct}%)')
        text_parts.append(f'  Prev avg resolution: {_format_hours(trends.get("prev_avg_resolution_hours", 0))}')
        text_parts.append(f'  Curr avg resolution: {_format_hours(performance.get("avg_resolution_hours", 0))}')
        res_change = trends.get('resolution_change_hours', 0)
        sign_r = '+' if res_change > 0 else ''
        text_parts.append(f'  Resolution change:   {sign_r}{_format_hours(abs(res_change))} {"slower" if res_change > 0 else "faster"}')
        text_parts.append('')

    plain_message = '\n'.join(text_parts)

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"[Email] Failed to send monthly report to {recipient_email}: {e}")
        return False
