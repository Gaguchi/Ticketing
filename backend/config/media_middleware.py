"""
Media Files Middleware

Serves media files in production (when DEBUG=False) similar to how WhiteNoise serves static files.
This is a simple solution for small-scale deployments. For larger scale, consider:
- Cloud storage (S3, GCS, Azure Blob) with django-storages
- Dedicated file server (nginx) behind your reverse proxy
- CDN for global distribution

This middleware:
- Only handles requests to MEDIA_URL path
- Serves files with proper MIME types
- Adds CORS headers for cross-origin access
- Adds cache headers for browser caching
- Is efficient for small/medium traffic
"""
import os
import mimetypes
from pathlib import Path
from django.conf import settings
from django.http import FileResponse, Http404


class MediaFilesMiddleware:
    """
    Middleware to serve media files in production.
    
    Placed after WhiteNoise in the middleware stack to handle media files
    that WhiteNoise doesn't serve (WhiteNoise only handles STATIC_ROOT).
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.media_url = settings.MEDIA_URL.rstrip('/')
        self.media_root = Path(settings.MEDIA_ROOT)
        
        # Initialize mimetypes
        mimetypes.init()
        
        # Log initialization
        import logging
        self.logger = logging.getLogger('media_middleware')
        self.logger.info(f"MediaFilesMiddleware initialized: media_url={self.media_url}, media_root={self.media_root}")
        
    def __call__(self, request):
        # Check if this is a media file request
        if request.path.startswith(self.media_url + '/'):
            self.logger.info(f"Media request: {request.path}")
            response = self.serve_media(request)
            if response:
                return response
            self.logger.warning(f"Media file not found, passing to next handler: {request.path}")
        
        return self.get_response(request)
    
    def serve_media(self, request):
        """Serve a media file if it exists."""
        # Extract the file path from the URL
        # e.g., /media/company_logos/logo.png -> company_logos/logo.png
        relative_path = request.path[len(self.media_url) + 1:]
        
        # Security: prevent directory traversal attacks
        try:
            file_path = (self.media_root / relative_path).resolve()
            # Ensure the resolved path is within MEDIA_ROOT
            file_path.relative_to(self.media_root.resolve())
            self.logger.info(f"Resolved path: {file_path}, exists: {file_path.exists()}")
        except (ValueError, RuntimeError) as e:
            self.logger.warning(f"Path traversal attempt or error: {relative_path}, error: {e}")
            return None  # Path traversal attempt, let Django handle with 404
        
        # Check if file exists and is a file (not directory)
        if not file_path.exists() or not file_path.is_file():
            # Log what's in the media directory for debugging
            self.logger.warning(f"File not found: {file_path}")
            self.logger.info(f"Media root exists: {self.media_root.exists()}")
            if self.media_root.exists():
                try:
                    files = list(self.media_root.rglob('*'))[:20]  # List first 20 files
                    self.logger.info(f"Files in media root: {[str(f.relative_to(self.media_root)) for f in files if f.is_file()]}")
                except Exception as e:
                    self.logger.error(f"Error listing media files: {e}")
            return None  # Let the normal request flow handle this (will 404)
        
        # Determine content type
        content_type, encoding = mimetypes.guess_type(str(file_path))
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Serve the file
        try:
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=content_type,
            )
            
            # Add filename for downloads
            response['Content-Disposition'] = f'inline; filename="{file_path.name}"'
            
            # Add CORS headers for cross-origin access
            origin = request.headers.get('Origin')
            if origin:
                # Check if origin is in allowed origins
                if self._is_origin_allowed(origin):
                    response['Access-Control-Allow-Origin'] = origin
                    response['Access-Control-Allow-Credentials'] = 'true'
            
            # Add cache headers (cache for 1 day, revalidate after)
            response['Cache-Control'] = 'public, max-age=86400'
            
            # Add Vary header for proper caching with CORS
            response['Vary'] = 'Origin'
            
            return response
            
        except IOError:
            return None
    
    def _is_origin_allowed(self, origin):
        """Check if the origin is in CORS_ALLOWED_ORIGINS."""
        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        
        # Check exact match
        if origin in allowed_origins:
            return True
        
        # Check for traefik.me wildcard if enabled
        if getattr(settings, 'ALLOW_TRAEFIK_DOMAINS', False):
            if origin.endswith('.traefik.me') or '.traefik.me:' in origin:
                return True
        
        # Check CORS_ALLOW_ALL_ORIGINS
        if getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
            return True
            
        return False
