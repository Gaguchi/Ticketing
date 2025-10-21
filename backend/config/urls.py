"""
URL configuration for ticketing system.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def api_root(request):
    """API root endpoint with available routes"""
    return JsonResponse({
        'message': 'Ticketing System API',
        'version': '1.0.0',
        'endpoints': {
            'tickets': '/api/tickets/',
            'admin': '/admin/',
            'docs': '/api/docs/',
            'schema': '/api/schema/',
        }
    })


def health_check(request):
    """Health check endpoint"""
    import os
    from django.conf import settings
    
    # Check USE_HTTPS configuration
    use_https_env = os.getenv('USE_HTTPS', 'NOT_SET')
    use_https_resolved = use_https_env.lower() in ('true', '1', 'yes')
    
    return JsonResponse({
        'status': 'healthy',
        'service': 'backend',
        'config': {
            'USE_HTTPS_env': use_https_env,
            'USE_HTTPS_resolved': use_https_resolved,
            'SECURE_SSL_REDIRECT': settings.SECURE_SSL_REDIRECT,
            'DEBUG': settings.DEBUG,
            'is_secure_request': request.is_secure(),
            'scheme': request.scheme,
        }
    })


urlpatterns = [
    path('', health_check, name='health'),
    path('api/', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/tickets/', include('tickets.urls')),
    
    # API Schema and Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
