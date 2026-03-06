"""
Test cases for JWT authentication: login, logout, token refresh,
token blacklisting, and cookie-based auth flow.
"""
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase, APIClient
from rest_framework import status


class LoginTests(APITestCase):
    """Test the login endpoint sets correct cookies."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        self.login_url = "/api/tickets/auth/login/"

    def test_login_success_sets_cookies(self):
        """Login should set access_token, refresh_token (httpOnly) and is_authenticated cookies."""
        response = self.client.post(
            self.login_url,
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check cookies are set
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertIn("access_token", cookies)
        self.assertIn("refresh_token", cookies)
        self.assertIn("is_authenticated", cookies)

        # access_token and refresh_token should be httpOnly
        self.assertTrue(cookies["access_token"]["httponly"])
        self.assertTrue(cookies["refresh_token"]["httponly"])

        # is_authenticated should NOT be httpOnly (JS needs to read it)
        self.assertFalse(cookies["is_authenticated"]["httponly"])
        self.assertEqual(cookies["is_authenticated"].value, "true")

    def test_login_returns_user_data(self):
        """Login response should contain user information."""
        response = self.client.post(
            self.login_url,
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.data)

    def test_login_invalid_credentials(self):
        """Login with wrong password should return 401."""
        response = self.client.post(
            self.login_url,
            {"username": "testuser", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        """Login with nonexistent user should return 401."""
        response = self.client.post(
            self.login_url,
            {"username": "nobody", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutTests(APITestCase):
    """Test the logout endpoint clears cookies and blacklists tokens."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        self.login_url = "/api/tickets/auth/login/"
        self.logout_url = "/api/tickets/auth/logout/"

    def _login(self):
        """Helper: login and return the response with cookies."""
        return self.client.post(
            self.login_url,
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )

    def test_logout_endpoint_exists(self):
        """Logout endpoint should be registered and return 200."""
        login_resp = self._login()
        self.assertEqual(login_resp.status_code, 200)

        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "logged out")

    def test_logout_clears_cookies(self):
        """Logout should clear all auth cookies."""
        self._login()
        response = self.client.post(self.logout_url)

        # Cookies should be set with empty value / max-age=0
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertIn(name, cookies)
            # Django sets max-age=0 for deleted cookies
            self.assertEqual(cookies[name]["max-age"], 0)

    def test_logout_blacklists_refresh_token(self):
        """After logout, the refresh token should be blacklisted and unusable."""
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError

        login_resp = self._login()
        refresh_cookie = login_resp.cookies.get("refresh_token")
        self.assertIsNotNone(refresh_cookie)
        refresh_value = refresh_cookie.value

        # Logout (should blacklist the token)
        self.client.post(self.logout_url)

        # Constructing a RefreshToken from a blacklisted token should raise TokenError
        with self.assertRaises(TokenError):
            RefreshToken(refresh_value)

    def test_logout_without_cookies_still_succeeds(self):
        """Logout without any cookies should still return 200 (graceful)."""
        client = APIClient()  # Fresh client, no cookies
        response = client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TokenRefreshTests(APITestCase):
    """Test the cookie-based token refresh endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        self.login_url = "/api/tickets/auth/login/"
        self.refresh_url = "/api/tickets/auth/token/refresh/"

    def _login(self):
        return self.client.post(
            self.login_url,
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )

    def test_refresh_success(self):
        """Refresh should return new cookies when valid refresh token exists."""
        self._login()
        response = self.client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "refreshed")

        # New cookies should be set
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertIn("access_token", cookies)
        self.assertIn("refresh_token", cookies)

    def test_refresh_rotates_token(self):
        """Refresh should issue a NEW refresh token (rotation enabled)."""
        login_resp = self._login()
        old_refresh = login_resp.cookies["refresh_token"].value

        refresh_resp = self.client.post(self.refresh_url)
        new_refresh = refresh_resp.cookies["refresh_token"].value

        # Tokens should be different (rotated)
        self.assertNotEqual(old_refresh, new_refresh)

    def test_refresh_blacklists_old_token(self):
        """After refresh with rotation, the old refresh token should be blacklisted."""
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

        login_resp = self._login()
        old_refresh_value = login_resp.cookies["refresh_token"].value
        old_token = RefreshToken(old_refresh_value)
        old_jti = old_token["jti"]

        # Refresh
        self.client.post(self.refresh_url)

        # Old token should be blacklisted
        self.assertTrue(
            BlacklistedToken.objects.filter(token__jti=old_jti).exists()
        )

    def test_refresh_without_cookie_returns_401(self):
        """Refresh without a refresh_token cookie should return 401."""
        client = APIClient()  # No cookies
        response = client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_invalid_token_returns_401(self):
        """Refresh with an invalid/corrupted token should return 401."""
        self.client.cookies["refresh_token"] = "invalid-garbage-token"
        response = self.client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_clears_cookies_on_failure(self):
        """When refresh fails, all auth cookies should be cleared."""
        self.client.cookies["refresh_token"] = "invalid-garbage-token"
        response = self.client.post(self.refresh_url)

        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertIn(name, cookies)
            self.assertEqual(cookies[name]["max-age"], 0)

    def test_blacklisted_token_cannot_refresh(self):
        """A blacklisted refresh token should not be usable for refresh."""
        login_resp = self._login()

        # First refresh works (and blacklists old token)
        self.client.post(self.refresh_url)

        # Manually set old token back in cookies
        old_refresh = login_resp.cookies["refresh_token"].value
        self.client.cookies["refresh_token"] = old_refresh

        # Second refresh with old (now blacklisted) token should fail
        response = self.client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CookieAuthenticationTests(APITestCase):
    """Test that cookie-based authentication works for protected endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        self.login_url = "/api/tickets/auth/login/"
        self.me_url = "/api/tickets/auth/me/"

    def test_authenticated_request_with_cookies(self):
        """After login, /auth/me/ should work using cookie auth."""
        self.client.post(
            self.login_url,
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")

    def test_unauthenticated_request_rejected(self):
        """Without cookies or tokens, /auth/me/ should return 401/403."""
        client = APIClient()
        response = client.get(self.me_url)
        self.assertIn(response.status_code, [401, 403])

    def test_auth_after_logout_fails(self):
        """After logout, /auth/me/ should fail."""
        self.client.post(
            self.login_url,
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )
        # Verify auth works
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 200)

        # Logout
        self.client.post("/api/tickets/auth/logout/")

        # Clear client cookies to simulate browser clearing them
        self.client.cookies.clear()

        # Auth should now fail
        response = self.client.get(self.me_url)
        self.assertIn(response.status_code, [401, 403])

    def test_auth_works_after_token_refresh(self):
        """After refreshing tokens, /auth/me/ should still work."""
        self.client.post(
            self.login_url,
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )
        # Refresh
        refresh_resp = self.client.post("/api/tickets/auth/token/refresh/")
        self.assertEqual(refresh_resp.status_code, 200)

        # Auth should still work with new cookies
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "testuser")
