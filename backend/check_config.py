#!/usr/bin/env python
"""
Configuration checker for Dokploy deployment
Run this to verify environment variables are set correctly
"""
import os
import sys

# Add the project to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.conf import settings

def check_config():
    """Check and display current configuration"""
    print("=" * 60)
    print("🔍 DJANGO CONFIGURATION CHECK")
    print("=" * 60)
    
    # Critical Settings
    print("\n📋 Critical Settings:")
    print(f"  DEBUG: {settings.DEBUG}")
    print(f"  ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    
    # HTTPS Settings
    print("\n🔒 HTTPS/Security Settings:")
    use_https = os.getenv('USE_HTTPS', 'False').lower() in ('true', '1', 'yes')
    print(f"  USE_HTTPS env var: {os.getenv('USE_HTTPS', 'NOT SET')}")
    print(f"  USE_HTTPS resolved: {use_https}")
    print(f"  SECURE_SSL_REDIRECT: {settings.SECURE_SSL_REDIRECT}")
    print(f"  SESSION_COOKIE_SECURE: {settings.SESSION_COOKIE_SECURE}")
    print(f"  CSRF_COOKIE_SECURE: {settings.CSRF_COOKIE_SECURE}")
    
    # CORS Settings
    print("\n🌐 CORS Settings:")
    print(f"  CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}")
    print(f"  CORS_ALLOW_CREDENTIALS: {settings.CORS_ALLOW_CREDENTIALS}")
    
    # Database
    print("\n🗄️  Database Settings:")
    db = settings.DATABASES['default']
    print(f"  ENGINE: {db['ENGINE']}")
    print(f"  HOST: {db['HOST']}")
    print(f"  PORT: {db['PORT']}")
    print(f"  NAME: {db['NAME']}")
    print(f"  USER: {db['USER']}")
    
    # Warnings
    print("\n⚠️  Warnings:")
    warnings = []
    
    if settings.SECURE_SSL_REDIRECT and not use_https:
        warnings.append("SECURE_SSL_REDIRECT is True but USE_HTTPS is False/not set!")
    
    if not settings.ALLOWED_HOSTS or settings.ALLOWED_HOSTS == ['*']:
        warnings.append("ALLOWED_HOSTS should be set to your domain")
    
    if not settings.CORS_ALLOWED_ORIGINS:
        warnings.append("CORS_ALLOWED_ORIGINS is empty - frontend won't be able to connect")
    
    if settings.DEBUG and not use_https:
        warnings.append("DEBUG is True in production (but SSL redirect is disabled)")
    
    if warnings:
        for warning in warnings:
            print(f"  ⚠️  {warning}")
    else:
        print("  ✅ No warnings")
    
    # Recommendations
    print("\n💡 Recommendations:")
    if settings.SECURE_SSL_REDIRECT:
        print("  🔴 PROBLEM: SSL redirect is ENABLED!")
        print("     Add to Dokploy environment variables: USE_HTTPS=False")
        print("     Then restart the backend service")
    else:
        print("  ✅ SSL redirect is disabled (correct for HTTP)")
    
    print("\n" + "=" * 60)
    print("🔧 To fix HTTP→HTTPS redirect in Dokploy:")
    print("   1. Go to Backend Service → Environment Variables")
    print("   2. Add: USE_HTTPS=False")
    print("   3. Restart/Redeploy the service")
    print("=" * 60)

if __name__ == '__main__':
    try:
        check_config()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
