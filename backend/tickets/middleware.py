"""
WebSocket Middleware
Handles JWT authentication for WebSocket connections
"""

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from urllib.parse import parse_qs

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key):
    """
    Get user from JWT token
    """
    try:
        # Validate token
        access_token = AccessToken(token_key)
        
        # Get user ID from token
        user_id = access_token['user_id']
        
        # Fetch user from database
        user = User.objects.get(id=user_id)
        return user
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSockets
    
    Token can be passed in:
    1. Query parameter: ws://...?token=<jwt_token>
    2. Subprotocol header: Sec-WebSocket-Protocol: access_token, <jwt_token>
    """
    
    async def __call__(self, scope, receive, send):
        # Extract token from query string or headers
        token = None
        
        # Method 1: Try to get token from query parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        if 'token' in query_params:
            token = query_params['token'][0]
        
        # Method 2: Try to get token from subprotocols (alternative method)
        if not token:
            headers = dict(scope.get('headers', []))
            subprotocols = headers.get(b'sec-websocket-protocol', b'').decode().split(', ')
            
            # Check if token is in subprotocols
            if len(subprotocols) >= 2:
                # Format: ['access_token', '<actual_token>']
                if subprotocols[0] == 'access_token':
                    token = subprotocols[1]
        
        # Authenticate user
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
