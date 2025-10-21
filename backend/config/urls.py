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
    return JsonResponse({'status': 'healthy', 'service': 'backend'})


urlpatterns = [
    path('', health_check, name='health'),
    path('api/', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/tickets/', include('tickets.urls')),
    
    # API Schema and Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
