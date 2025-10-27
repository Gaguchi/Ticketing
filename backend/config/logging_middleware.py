"""
API Request Logging Middleware
Logs all incoming requests and outgoing responses for debugging
"""

import json
import logging
import time
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('api')


class APILoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log API requests and responses
    """
    
    def process_request(self, request):
        """Log incoming request details"""
        request._start_time = time.time()
        
        # Only log API requests
        if not request.path.startswith('/api/'):
            return None
        
        # Prepare request data
        headers = {k: v for k, v in request.headers.items() 
                  if k.lower() not in ['authorization', 'cookie']}  # Hide sensitive headers
        
        body = None
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if request.content_type == 'application/json':
                    body = json.loads(request.body.decode('utf-8'))
                    # Hide password fields
                    if isinstance(body, dict) and 'password' in body:
                        body = {**body, 'password': '***HIDDEN***'}
            except (json.JSONDecodeError, UnicodeDecodeError):
                body = '<binary or malformed data>'
        
        logger.info(
            f"\n{'='*80}\n"
            f"🌐 INCOMING REQUEST\n"
            f"{'='*80}\n"
            f"Method: {request.method}\n"
            f"Path: {request.path}\n"
            f"Query Params: {dict(request.GET)}\n"
            f"Headers: {json.dumps(headers, indent=2)}\n"
            f"Body: {json.dumps(body, indent=2) if body else 'None'}\n"
            f"User: {request.user if hasattr(request, 'user') else 'Anonymous'}\n"
            f"IP: {self.get_client_ip(request)}\n"
            f"{'='*80}"
        )
        
        return None
    
    def process_response(self, request, response):
        """Log outgoing response details"""
        # Only log API requests
        if not request.path.startswith('/api/'):
            return response
        
        # Calculate request duration
        duration = 0
        if hasattr(request, '_start_time'):
            duration = (time.time() - request._start_time) * 1000  # Convert to milliseconds
        
        # Get response data
        response_data = None
        if hasattr(response, 'data'):
            response_data = response.data
        elif response.get('Content-Type', '').startswith('application/json'):
            try:
                response_data = json.loads(response.content.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
                response_data = '<binary or malformed data>'
        
        # Determine emoji based on status code
        emoji = '✅' if 200 <= response.status_code < 300 else '❌'
        
        logger.info(
            f"\n{'='*80}\n"
            f"{emoji} OUTGOING RESPONSE\n"
            f"{'='*80}\n"
            f"Status: {response.status_code} {response.reason_phrase if hasattr(response, 'reason_phrase') else ''}\n"
            f"Duration: {duration:.2f}ms\n"
            f"Path: {request.path}\n"
            f"Method: {request.method}\n"
            f"Response Data: {json.dumps(response_data, indent=2)[:1000] if response_data else 'None'}\n"
            f"{'='*80}\n"
        )
        
        return response
    
    def get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
