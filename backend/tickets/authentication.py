from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


class CookieJWTAuthentication(BaseAuthentication):
    """
    Authenticate using JWT stored in httpOnly cookie.
    Falls through to next auth class if no cookie present.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
        if raw_token is None:
            return None

        try:
            validated_token = AccessToken(raw_token)
            user_id = validated_token['user_id']
            user = User.objects.get(id=user_id)
            return (user, validated_token)
        except (TokenError, User.DoesNotExist, KeyError):
            # Cookie present but invalid - let other auth classes try
            return None


class SuperSecretKeyAuthentication(BaseAuthentication):
    """
    Custom authentication class that allows bypassing JWT authentication
    using a super secret key header for testing purposes.

    Usage:
        Add header: X-Super-Secret-Key: <your-super-secret-key>

    WARNING: Only use this in development/testing environments!
    """

    def authenticate(self, request):
        # Only allow dev bypass in DEBUG mode
        from django.conf import settings as django_settings
        if not django_settings.DEBUG:
            return None

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
