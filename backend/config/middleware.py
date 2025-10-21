"""
Custom middleware for adding security and CORS headers
"""


class SecurityHeadersMiddleware:
    """
    Add security headers to all responses
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Only add COOP header for HTTPS (it's ignored on HTTP anyway)
        if request.is_secure():
            response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        
        # Add other security headers
        response['Cross-Origin-Resource-Policy'] = 'cross-origin'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response
