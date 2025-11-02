# Cloudflare Turnstile CAPTCHA Setup Guide

## Overview

This guide will help you set up Cloudflare Turnstile (a privacy-friendly CAPTCHA alternative) to protect your login and registration forms from bot attacks.

## Step 1: Get Cloudflare Turnstile Site Key

1. **Sign up for Cloudflare** (if you don't have an account):

   - Go to https://www.cloudflare.com/
   - Create a free account

2. **Access Turnstile Dashboard**:

   - Log in to your Cloudflare dashboard
   - Navigate to: https://dash.cloudflare.com/?to=/:account/turnstile
   - Or go to "Turnstile" from the main dashboard menu

3. **Create a New Site**:

   - Click "Add Site"
   - Enter your domain (e.g., `tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me`)
   - Choose widget type: **Managed** (recommended for balance between security and UX)
   - Click "Create"

4. **Get Your Keys**:
   - After creation, you'll see two keys:
     - **Site Key** (public) - Used in frontend
     - **Secret Key** (private) - Used in backend validation

## Step 2: Configure Frontend

Update your `.env` file:

```env
# API Configuration
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# Cloudflare Turnstile (CAPTCHA)
VITE_TURNSTILE_SITE_KEY=your-actual-site-key-here
```

Replace `your-actual-site-key-here` with the Site Key from Cloudflare.

## Step 3: Configure Backend

You'll need to validate the CAPTCHA token on the backend. Add this to your Django settings:

### Install required package:

```bash
pip install requests
```

### Add to Django settings (`settings.py`):

```python
# Cloudflare Turnstile
TURNSTILE_SECRET_KEY = os.environ.get('TURNSTILE_SECRET_KEY', 'your-secret-key-here')
TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
```

### Create a validation utility (`utils/turnstile.py`):

```python
import requests
from django.conf import settings

def verify_turnstile_token(token: str, ip_address: str = None) -> tuple[bool, str]:
    """
    Verify Cloudflare Turnstile token

    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    if not token:
        return False, "CAPTCHA token is required"

    data = {
        'secret': settings.TURNSTILE_SECRET_KEY,
        'response': token,
    }

    if ip_address:
        data['remoteip'] = ip_address

    try:
        response = requests.post(
            settings.TURNSTILE_VERIFY_URL,
            data=data,
            timeout=10
        )
        result = response.json()

        if result.get('success'):
            return True, ""
        else:
            errors = result.get('error-codes', [])
            return False, f"CAPTCHA verification failed: {', '.join(errors)}"

    except Exception as e:
        return False, f"CAPTCHA verification error: {str(e)}"
```

### Update your authentication views:

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .utils.turnstile import verify_turnstile_token

@api_view(['POST'])
def register(request):
    # Verify CAPTCHA if token is provided
    captcha_token = request.data.get('captcha_token')
    if captcha_token:
        ip_address = request.META.get('REMOTE_ADDR')
        is_valid, error_message = verify_turnstile_token(captcha_token, ip_address)

        if not is_valid:
            return Response(
                {'error': error_message},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Continue with registration logic...
    # ...
```

## Step 4: Environment Variables

### Frontend `.env`:

```env
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA  # Replace with your actual key
```

### Backend environment:

```bash
export TURNSTILE_SECRET_KEY="1x00000000000000000000BB"  # Replace with your actual secret key
```

Or add to your Docker/deployment configuration.

## Step 5: Testing

### Test in Development:

Cloudflare provides test keys for development:

**Site Key (Always Passes):**

```
1x00000000000000000000AA
```

**Secret Key:**

```
1x0000000000000000000000000000000AA
```

**Site Key (Always Fails):**

```
2x00000000000000000000AB
```

**Secret Key:**

```
2x0000000000000000000000000000000AA
```

**Site Key (Token Already Spent):**

```
3x00000000000000000000FF
```

### Update your `.env` for testing:

```env
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

## Step 6: Make CAPTCHA Optional (Recommended for Development)

The implementation already supports optional CAPTCHA:

- If `VITE_TURNSTILE_SITE_KEY` is not set or empty, CAPTCHA won't show
- This allows you to develop without CAPTCHA and enable it in production

## Production Deployment

1. **Get Production Keys** from Cloudflare for your actual domain
2. **Set Environment Variables**:
   - Frontend: `VITE_TURNSTILE_SITE_KEY`
   - Backend: `TURNSTILE_SECRET_KEY`
3. **Rebuild and Deploy** your applications
4. **Test** the CAPTCHA on your production site

## Widget Customization

You can customize the Turnstile widget appearance in the component:

```tsx
<Turnstile
  siteKey={turnstileSiteKey}
  onSuccess={(token) => setCaptchaToken(token)}
  onError={() => setCaptchaToken(null)}
  onExpire={() => setCaptchaToken(null)}
  theme="light" // Options: 'light', 'dark', 'auto'
  size="normal" // Options: 'normal', 'compact'
/>
```

## Security Best Practices

1. **Always validate on backend** - Never trust frontend-only validation
2. **Use HTTPS in production** - CAPTCHA tokens should be transmitted securely
3. **Implement rate limiting** - Add additional protection against brute force attacks
4. **Monitor failed attempts** - Set up logging for suspicious activity
5. **Rotate keys periodically** - Generate new keys every 3-6 months

## Troubleshooting

### CAPTCHA not showing:

- Check that `VITE_TURNSTILE_SITE_KEY` is set in `.env`
- Restart the development server after changing `.env`
- Check browser console for errors

### "Token verification failed":

- Verify the secret key is correct on backend
- Check that the token hasn't expired (valid for 5 minutes)
- Ensure backend can reach `challenges.cloudflare.com`

### Bot attacks continue:

- Enable additional rate limiting
- Use stricter widget mode (Invisible or Managed)
- Implement IP-based throttling
- Add honeypot fields to forms

## Resources

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Widget Modes](https://developers.cloudflare.com/turnstile/concepts/widget/)
- [Server-side Validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
