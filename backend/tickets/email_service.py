"""
Email Service for Project Invitations
Handles sending invitation emails with token links
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
