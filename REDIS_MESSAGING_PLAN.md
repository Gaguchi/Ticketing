# Redis Messaging Implementation Plan

## Overview

We are implementing Redis as the backing store for Django Channels to enable robust WebSocket messaging in production. This replaces the In-Memory channel layer used during development.

## Production Credentials

(From Dokploy Dashboard)

- **Host**: `tickets-ticketingredis-eyohax`
- **Port**: `6379`
- **Password**: `i9nbwu2ukq6nhbvp`
- **Connection URL**: `redis://default:i9nbwu2ukq6nhbvp@tickets-ticketingredis-eyohax:6379`

## Implementation Steps

### 1. Backend Configuration (`backend/config/settings.py`)

- Update `CHANNEL_LAYERS` configuration to support `REDIS_URL` environment variable.
- This allows passing the full connection string (including password) which is essential for the production Redis instance.
- Logic:
  - If `REDIS_URL` is present, use it.
  - Fallback to `REDIS_HOST` and `REDIS_PORT` for legacy/local support.
  - Ensure `channels_redis` is used when configured, regardless of `DEBUG` setting if explicitly requested, or keep `DEBUG` logic but ensure Production uses Redis.

### 2. Environment Variables

- **Production (Dokploy)**:
  - Set `REDIS_URL=redis://default:i9nbwu2ukq6nhbvp@tickets-ticketingredis-eyohax:6379`
  - Set `DJANGO_SETTINGS_MODULE=config.settings` (standard)
- **Local Development**:
  - Can continue using `REDIS_HOST=localhost` / `REDIS_PORT=6379` or switch to `REDIS_URL=redis://localhost:6379/0`.

### 3. Verification

- Deploy to production.
- Check logs for successful connection to Redis.
- Test WebSocket functionality (Chat, Real-time updates).

## Code Changes

### `backend/config/settings.py`

```python
# ... existing code ...
# Redis Configuration
REDIS_URL = os.getenv('REDIS_URL')
REDIS_HOST = os.getenv('REDIS_HOST', '127.0.0.1')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

CHANNEL_LAYERS = {
    'default': {
        # Use Redis if REDIS_URL is set OR if not in DEBUG mode
        # Fallback to In-Memory for local dev without Redis
        'BACKEND': 'channels_redis.core.RedisChannelLayer' if (REDIS_URL or not DEBUG) else 'channels.layers.InMemoryChannelLayer',
        'CONFIG': {
            "hosts": [REDIS_URL] if REDIS_URL else [(REDIS_HOST, REDIS_PORT)],
        } if (REDIS_URL or not DEBUG) else {},
    },
}
# ... existing code ...
```
