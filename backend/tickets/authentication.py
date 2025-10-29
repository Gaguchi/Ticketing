from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


class SuperSecretKeyAuthentication(BaseAuthentication):
    """
    Custom authentication class that allows bypassing JWT authentication
    using a super secret key header for testing purposes.
    
    Usage:
        Add header: X-Super-Secret-Key: <your-super-secret-key>
    
    WARNING: Only use this in development/testing environments!
    """
    
    def authenticate(self, request):
        # Get the super secret key from request headers
        secret_key = request.META.get('HTTP_X_SUPER_SECRET_KEY')
        
        if not secret_key:
            return None
        
        # Verify the secret key matches
        if secret_key != settings.SUPER_SECRET_KEY:
            raise AuthenticationFailed('Invalid super secret key')
        
        # Return the first superuser (admin) or create one if doesn't exist
        try:
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                # Fallback to first user or anonymous
                user = User.objects.first()
            
            if user:
                return (user, None)
            else:
                raise AuthenticationFailed('No users found in database')
                
        except Exception as e:
            raise AuthenticationFailed(f'Authentication error: {str(e)}')
