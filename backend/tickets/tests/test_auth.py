"""
Test cases for Auth API endpoints:
  - register_user
  - password_reset_request
  - password_reset_validate
  - password_reset_confirm
  - login (case-insensitivity)
  - rate limiting (login and registration)
  - cookie attributes (httpOnly, SameSite, Secure)
  - password validation on registration
  - /auth/me/ endpoint
  - protected endpoint access without auth
"""
from unittest.mock import patch

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase, APIClient
from rest_framework import status


@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class RegisterTests(APITestCase):
    """Test the user registration endpoint."""

    register_url = "/api/tickets/auth/register/"

    def test_register_success(self, _mock_throttle):
        """Registering with valid data should return 201 and set cookies."""
        response = self.client.post(
            self.register_url,
            {
                "username": "newuser",
                "email": "new@example.com",
                "password": "StrongPass123!",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], "newuser")
        self.assertEqual(response.data["user"]["email"], "new@example.com")
        self.assertEqual(response.data["user"]["first_name"], "New")
        self.assertEqual(response.data["user"]["last_name"], "User")

    def test_register_sets_auth_cookies(self, _mock_throttle):
        """Registration should set access_token, refresh_token, is_authenticated cookies."""
        response = self.client.post(
            self.register_url,
            {
                "username": "cookieuser",
                "email": "cookie@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertIn("access_token", cookies)
        self.assertIn("refresh_token", cookies)
        self.assertIn("is_authenticated", cookies)
        self.assertTrue(cookies["access_token"]["httponly"])
        self.assertTrue(cookies["refresh_token"]["httponly"])

    def test_register_user_created_in_db(self, _mock_throttle):
        """A new Django User should exist after registration."""
        self.client.post(
            self.register_url,
            {
                "username": "dbuser",
                "email": "db@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertTrue(User.objects.filter(username="dbuser").exists())

    def test_register_duplicate_username(self, _mock_throttle):
        """Registering with an existing username should return 400."""
        User.objects.create_user(
            username="taken", email="taken@example.com", password="pass12345"
        )
        response = self.client.post(
            self.register_url,
            {
                "username": "taken",
                "email": "other@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_register_duplicate_email(self, _mock_throttle):
        """Registering with an existing email should return 400."""
        User.objects.create_user(
            username="existing", email="dup@example.com", password="pass12345"
        )
        response = self.client.post(
            self.register_url,
            {
                "username": "newname",
                "email": "dup@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_register_missing_username(self, _mock_throttle):
        """Omitting username should return 400."""
        response = self.client.post(
            self.register_url,
            {"email": "no_user@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_email(self, _mock_throttle):
        """Omitting email should return 400."""
        response = self.client.post(
            self.register_url,
            {"username": "noemail", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_password(self, _mock_throttle):
        """Omitting password should return 400."""
        response = self.client.post(
            self.register_url,
            {"username": "nopass", "email": "nopass@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_empty_body(self, _mock_throttle):
        """Sending empty body should return 400."""
        response = self.client.post(self.register_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_optional_names_default_empty(self, _mock_throttle):
        """first_name and last_name should default to empty strings."""
        response = self.client.post(
            self.register_url,
            {
                "username": "nonames",
                "email": "nonames@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="nonames")
        self.assertEqual(user.first_name, "")
        self.assertEqual(user.last_name, "")

    def test_register_authenticated_access_after(self, _mock_throttle):
        """After registering, the client should be able to access /auth/me/."""
        self.client.post(
            self.register_url,
            {
                "username": "authcheck",
                "email": "authcheck@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        response = self.client.get("/api/tickets/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "authcheck")


# ============================================================================
# Password Reset Request
# ============================================================================
@patch("tickets.views.PasswordResetThrottle.allow_request", return_value=True)
class PasswordResetRequestTests(APITestCase):
    """Test the password reset request endpoint."""

    reset_url = "/api/tickets/auth/password-reset/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="resetme",
            email="resetme@example.com",
            password="OldPass123!",
        )

    def test_valid_email_returns_200(self, _mock_throttle):
        """Requesting reset for a valid email should return 200."""
        response = self.client.post(
            self.reset_url,
            {"email": "resetme@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_nonexistent_email_returns_200(self, _mock_throttle):
        """For security, non-existent email should still return 200."""
        response = self.client.post(
            self.reset_url,
            {"email": "nobody@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_missing_email_returns_400(self, _mock_throttle):
        """Omitting email should return 400."""
        response = self.client.post(self.reset_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_email_returns_400(self, _mock_throttle):
        """Empty email string should return 400."""
        response = self.client.post(
            self.reset_url, {"email": ""}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_case_insensitive_email(self, _mock_throttle):
        """Should match email regardless of case."""
        response = self.client.post(
            self.reset_url,
            {"email": "RESETME@Example.COM"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_inactive_user_not_found(self, _mock_throttle):
        """Inactive users should not receive reset emails (still returns 200)."""
        self.user.is_active = False
        self.user.save()
        response = self.client.post(
            self.reset_url,
            {"email": "resetme@example.com"},
            format="json",
        )
        # Should still return 200 to not leak info, but no email sent
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_response_message_is_generic(self, _mock_throttle):
        """Response message should not reveal whether the email exists."""
        response = self.client.post(
            self.reset_url,
            {"email": "resetme@example.com"},
            format="json",
        )
        msg = response.data["message"]
        self.assertIn("If an account", msg)


# ============================================================================
# Password Reset Validate
# ============================================================================
class PasswordResetValidateTests(APITestCase):
    """Test the token validation endpoint."""

    validate_url = "/api/tickets/auth/password-reset/validate/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="valuser",
            email="valuser@example.com",
            password="ValPass123!",
        )
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_valid_token(self):
        """A freshly generated token should be valid."""
        response = self.client.post(
            self.validate_url,
            {"uid": self.uid, "token": self.token},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])

    def test_invalid_token(self):
        """An invalid token string should return 400 with valid=False."""
        response = self.client.post(
            self.validate_url,
            {"uid": self.uid, "token": "invalid-token-string"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])

    def test_invalid_uid(self):
        """An invalid uid should return 400."""
        response = self.client.post(
            self.validate_url,
            {"uid": "baduid", "token": self.token},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])

    def test_expired_token(self):
        """After changing the password, the old token should be invalid."""
        # Token is generated against user state; changing password invalidates it
        self.user.set_password("ChangedPass456!")
        self.user.save()

        response = self.client.post(
            self.validate_url,
            {"uid": self.uid, "token": self.token},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])

    def test_nonexistent_user_uid(self):
        """A uid pointing to a deleted user should return 400."""
        fake_uid = urlsafe_base64_encode(force_bytes(99999))
        response = self.client.post(
            self.validate_url,
            {"uid": fake_uid, "token": self.token},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_fields(self):
        """Empty uid and token should return 400."""
        response = self.client.post(
            self.validate_url,
            {"uid": "", "token": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ============================================================================
# Password Reset Confirm
# ============================================================================
@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class PasswordResetConfirmTests(APITestCase):
    """Test the password reset confirmation endpoint."""

    confirm_url = "/api/tickets/auth/password-reset/confirm/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="confirmuser",
            email="confirm@example.com",
            password="OldPass123!",
        )
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_valid_reset(self, _mock_throttle):
        """Should successfully change the password with a valid token."""
        response = self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "NewSecure456!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_can_login_with_new_password(self, _mock_throttle):
        """After reset, the user should be able to login with the new password."""
        self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "NewSecure456!",
            },
            format="json",
        )
        login_resp = self.client.post(
            "/api/tickets/auth/login/",
            {"username": "confirmuser", "password": "NewSecure456!"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    def test_old_password_no_longer_works(self, _mock_throttle):
        """After reset, the old password should fail."""
        self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "NewSecure456!",
            },
            format="json",
        )
        login_resp = self.client.post(
            "/api/tickets/auth/login/",
            {"username": "confirmuser", "password": "OldPass123!"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_token(self, _mock_throttle):
        """Using an invalid token should return 400."""
        response = self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": "bad-token",
                "new_password": "NewSecure456!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_uid(self, _mock_throttle):
        """Using an invalid uid should return 400."""
        response = self.client.post(
            self.confirm_url,
            {
                "uid": "baduid",
                "token": self.token,
                "new_password": "NewSecure456!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_rejected(self, _mock_throttle):
        """Django's password validators should reject weak passwords."""
        response = self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_common_password_rejected(self, _mock_throttle):
        """Django's common password validator should reject well-known passwords."""
        response = self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "password",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_new_password(self, _mock_throttle):
        """Omitting new_password should return 400."""
        response = self.client.post(
            self.confirm_url,
            {"uid": self.uid, "token": self.token},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_used_twice(self, _mock_throttle):
        """A token should be invalidated after successful use (password change invalidates it)."""
        # First use succeeds
        self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "NewSecure456!",
            },
            format="json",
        )
        # Second use should fail
        response = self.client.post(
            self.confirm_url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "AnotherPass789!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_user_uid(self, _mock_throttle):
        """A uid pointing to a non-existent user should return 400."""
        fake_uid = urlsafe_base64_encode(force_bytes(99999))
        response = self.client.post(
            self.confirm_url,
            {
                "uid": fake_uid,
                "token": self.token,
                "new_password": "NewSecure456!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ============================================================================
# Login Case-Insensitivity
# ============================================================================
@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class LoginCaseInsensitivityTests(APITestCase):
    """Test that login username is case-insensitive."""

    login_url = "/api/tickets/auth/login/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="CasedUser",
            email="cased@example.com",
            password="CasePass123!",
        )

    def test_exact_case_login(self, _mock_throttle):
        """Login with exact case should work."""
        response = self.client.post(
            self.login_url,
            {"username": "CasedUser", "password": "CasePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_lowercase_login(self, _mock_throttle):
        """Login with all lowercase username should work."""
        response = self.client.post(
            self.login_url,
            {"username": "caseduser", "password": "CasePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_uppercase_login(self, _mock_throttle):
        """Login with all uppercase username should work."""
        response = self.client.post(
            self.login_url,
            {"username": "CASEDUSER", "password": "CasePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_mixed_case_login(self, _mock_throttle):
        """Login with mixed case should work."""
        response = self.client.post(
            self.login_url,
            {"username": "cAsEdUsEr", "password": "CasePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_wrong_password_still_fails(self, _mock_throttle):
        """Case-insensitive username with wrong password should fail."""
        response = self.client.post(
            self.login_url,
            {"username": "caseduser", "password": "WrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_returns_original_username(self, _mock_throttle):
        """After case-insensitive login, response should contain the original username."""
        response = self.client.post(
            self.login_url,
            {"username": "caseduser", "password": "CasePass123!"},
            format="json",
        )
        self.assertEqual(response.data["user"]["username"], "CasedUser")

    def test_login_username_whitespace_stripped(self, _mock_throttle):
        """Leading/trailing whitespace in username should be stripped."""
        response = self.client.post(
            self.login_url,
            {"username": "  CasedUser  ", "password": "CasePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_empty_username(self, _mock_throttle):
        """Empty username should return 400."""
        response = self.client.post(
            self.login_url,
            {"username": "", "password": "CasePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_empty_password(self, _mock_throttle):
        """Empty password should return 400."""
        response = self.client.post(
            self.login_url,
            {"username": "CasedUser", "password": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ============================================================================
# Registration Password Validation
# ============================================================================
@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class RegisterPasswordValidationTests(APITestCase):
    """Test that registration rejects weak passwords via Django validators."""

    register_url = "/api/tickets/auth/register/"

    def test_short_password_rejected(self, _mock_throttle):
        """Passwords shorter than 8 characters should be rejected."""
        response = self.client.post(
            self.register_url,
            {
                "username": "shortpw",
                "email": "shortpw@example.com",
                "password": "Ab1!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertFalse(User.objects.filter(username="shortpw").exists())

    def test_common_password_rejected(self, _mock_throttle):
        """Common passwords like 'password' should be rejected."""
        response = self.client.post(
            self.register_url,
            {
                "username": "commonpw",
                "email": "commonpw@example.com",
                "password": "password",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertFalse(User.objects.filter(username="commonpw").exists())

    def test_numeric_only_password_rejected(self, _mock_throttle):
        """Entirely numeric passwords should be rejected."""
        response = self.client.post(
            self.register_url,
            {
                "username": "numericpw",
                "email": "numericpw@example.com",
                "password": "12345678",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertFalse(User.objects.filter(username="numericpw").exists())

    def test_password_similar_to_username_not_checked(self, _mock_throttle):
        """KNOWN BUG: register_user calls validate_password(password) without a user
        object, so UserAttributeSimilarityValidator cannot compare against username/email.
        This test documents the current (broken) behavior: a password identical to the
        username is accepted when it should be rejected."""
        response = self.client.post(
            self.register_url,
            {
                "username": "johndoe123",
                "email": "similar@example.com",
                "password": "johndoe123",
            },
            format="json",
        )
        # BUG: This should be 400, but the view doesn't pass the user object
        # to validate_password(), so similarity check is skipped.
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_strong_password_accepted(self, _mock_throttle):
        """A strong password meeting all validators should be accepted."""
        response = self.client.post(
            self.register_url,
            {
                "username": "strongpw",
                "email": "strongpw@example.com",
                "password": "X!k9mQ#pL2vR",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="strongpw").exists())

    def test_user_not_created_when_password_invalid(self, _mock_throttle):
        """No user should be created in DB when password validation fails."""
        self.client.post(
            self.register_url,
            {
                "username": "notcreated",
                "email": "notcreated@example.com",
                "password": "123",
            },
            format="json",
        )
        self.assertFalse(User.objects.filter(username="notcreated").exists())


# ============================================================================
# Login Rate Limiting
# ============================================================================
class LoginRateLimitTests(APITestCase):
    """Test that AuthRateThrottle limits login attempts to 10/minute.

    Note: AuthRateThrottle extends AnonRateThrottle which only throttles
    unauthenticated requests. We use wrong passwords so the user never gets
    authenticated (no cookies set), ensuring the throttle counts every request.
    """

    login_url = "/api/tickets/auth/login/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="ratelimit",
            email="ratelimit@example.com",
            password="RateLimit123!",
        )

    def test_login_rate_limited_after_10_failed_attempts(self):
        """After 10 failed login attempts (anon), the 11th should return 429."""
        for i in range(10):
            self.client.post(
                self.login_url,
                {"username": "ratelimit", "password": "WrongPassword!"},
                format="json",
            )
        # 11th request should be throttled
        response = self.client.post(
            self.login_url,
            {"username": "ratelimit", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("error", response.data)

    def test_throttle_error_message(self):
        """The throttle response should include a helpful error message."""
        for i in range(10):
            self.client.post(
                self.login_url,
                {"username": "ratelimit", "password": "WrongPassword!"},
                format="json",
            )
        response = self.client.post(
            self.login_url,
            {"username": "ratelimit", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("Too many", response.data["error"])


# ============================================================================
# Registration Rate Limiting
# ============================================================================
class RegisterRateLimitTests(APITestCase):
    """Test that AuthRateThrottle limits registration attempts to 10/minute.

    Note: AuthRateThrottle extends AnonRateThrottle which only throttles
    unauthenticated requests. We use invalid registrations (missing fields)
    so the user never gets created/authenticated, ensuring throttle counts.
    """

    register_url = "/api/tickets/auth/register/"

    def test_register_rate_limited_after_10_attempts(self):
        """After 10 registration attempts (anon), the 11th should return 429."""
        # Use missing-password requests so user is never created and client
        # stays unauthenticated (AnonRateThrottle only counts anon requests).
        for i in range(10):
            self.client.post(
                self.register_url,
                {
                    "username": f"rateuser{i}",
                    "email": f"rateuser{i}@example.com",
                    # missing password -> 400, user never created
                },
                format="json",
            )
        # 11th should be throttled
        response = self.client.post(
            self.register_url,
            {
                "username": "rateuser_extra",
                "email": "rateuser_extra@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("error", response.data)


# ============================================================================
# Cookie Attributes on Login
# ============================================================================
@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class LoginCookieAttributeTests(APITestCase):
    """Test cookie attributes (httpOnly, SameSite, Secure, path) on login response."""

    login_url = "/api/tickets/auth/login/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="cookieattr",
            email="cookieattr@example.com",
            password="CookieAttr123!",
        )

    def test_access_token_is_httponly(self, _mock_throttle):
        """access_token cookie must be httpOnly."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertTrue(cookies["access_token"]["httponly"])

    def test_refresh_token_is_httponly(self, _mock_throttle):
        """refresh_token cookie must be httpOnly."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertTrue(cookies["refresh_token"]["httponly"])

    def test_is_authenticated_not_httponly(self, _mock_throttle):
        """is_authenticated cookie must NOT be httpOnly (JS needs to read it)."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertFalse(cookies["is_authenticated"]["httponly"])
        self.assertEqual(cookies["is_authenticated"].value, "true")

    def test_samesite_lax_on_all_cookies(self, _mock_throttle):
        """All auth cookies must have SameSite=Lax."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertEqual(
                cookies[name]["samesite"], "Lax",
                f"{name} cookie should have SameSite=Lax"
            )

    def test_cookies_path_is_root(self, _mock_throttle):
        """All auth cookies should have path='/'."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertEqual(
                cookies[name]["path"], "/",
                f"{name} cookie should have path='/'"
            )

    def test_secure_false_when_use_https_off(self, _mock_throttle):
        """When USE_HTTPS is False, Secure flag should not be set on cookies."""
        # In tests, USE_HTTPS defaults to False
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            # When secure is False, the cookie attribute is empty string
            self.assertFalse(
                cookies[name]["secure"],
                f"{name} cookie should not have Secure flag when USE_HTTPS=False"
            )

    @override_settings(JWT_AUTH_COOKIE_SECURE=True)
    def test_secure_true_when_setting_enabled(self, _mock_throttle):
        """When JWT_AUTH_COOKIE_SECURE is True, Secure flag should be set."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertTrue(
                cookies[name]["secure"],
                f"{name} cookie should have Secure flag when JWT_AUTH_COOKIE_SECURE=True"
            )

    def test_access_token_max_age(self, _mock_throttle):
        """access_token cookie max_age should equal ACCESS_TOKEN_LIFETIME (1 hour = 3600s)."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertEqual(cookies["access_token"]["max-age"], 3600)

    def test_refresh_token_max_age(self, _mock_throttle):
        """refresh_token cookie max_age should equal REFRESH_TOKEN_LIFETIME (7 days)."""
        response = self.client.post(
            self.login_url,
            {"username": "cookieattr", "password": "CookieAttr123!"},
            format="json",
        )
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        expected = 7 * 24 * 3600  # 7 days in seconds
        self.assertEqual(cookies["refresh_token"]["max-age"], expected)


# ============================================================================
# Logout Cookie Clearing
# ============================================================================
@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class LogoutCookieClearingTests(APITestCase):
    """Test that logout properly clears cookies with correct attributes."""

    login_url = "/api/tickets/auth/login/"
    logout_url = "/api/tickets/auth/logout/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="logoutuser",
            email="logoutuser@example.com",
            password="LogoutPass123!",
        )

    def _login(self):
        return self.client.post(
            self.login_url,
            {"username": "logoutuser", "password": "LogoutPass123!"},
            format="json",
        )

    def test_logout_clears_all_three_cookies(self, _mock_throttle):
        """Logout should clear access_token, refresh_token, and is_authenticated."""
        self._login()
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertIn(name, cookies)
            self.assertEqual(cookies[name]["max-age"], 0)

    def test_logout_cookies_have_correct_path(self, _mock_throttle):
        """Cleared cookies should have path='/' to match the original cookies."""
        self._login()
        response = self.client.post(self.logout_url)
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertEqual(
                cookies[name]["path"], "/",
                f"{name} cleared cookie should have path='/'"
            )

    def test_logout_cookies_have_samesite_lax(self, _mock_throttle):
        """Cleared cookies should have SameSite=Lax to match originals."""
        self._login()
        response = self.client.post(self.logout_url)
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertEqual(
                cookies[name]["samesite"], "Lax",
                f"{name} cleared cookie should have SameSite=Lax"
            )

    def test_logout_response_body(self, _mock_throttle):
        """Logout should return {'status': 'logged out'}."""
        self._login()
        response = self.client.post(self.logout_url)
        self.assertEqual(response.data["status"], "logged out")


# ============================================================================
# Token Refresh Flow
# ============================================================================
@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class TokenRefreshFlowTests(APITestCase):
    """Test the complete token refresh flow using cookies."""

    login_url = "/api/tickets/auth/login/"
    refresh_url = "/api/tickets/auth/token/refresh/"
    me_url = "/api/tickets/auth/me/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="refreshuser",
            email="refreshuser@example.com",
            password="RefreshPass123!",
        )

    def _login(self):
        return self.client.post(
            self.login_url,
            {"username": "refreshuser", "password": "RefreshPass123!"},
            format="json",
        )

    def test_refresh_without_login_returns_401(self, _mock_throttle):
        """Attempting refresh without any cookie should return 401."""
        client = APIClient()
        response = client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_invalid_token_returns_401(self, _mock_throttle):
        """Refresh with garbage token should return 401."""
        self.client.cookies["refresh_token"] = "not-a-real-jwt-token"
        response = self.client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_clears_cookies_on_invalid(self, _mock_throttle):
        """When refresh fails, all auth cookies should be cleared."""
        self.client.cookies["refresh_token"] = "garbage-token"
        response = self.client.post(self.refresh_url)
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        for name in ("access_token", "refresh_token", "is_authenticated"):
            self.assertIn(name, cookies)
            self.assertEqual(cookies[name]["max-age"], 0)

    def test_refresh_sets_new_cookies(self, _mock_throttle):
        """After successful refresh, new access_token and refresh_token cookies should be set."""
        self._login()
        response = self.client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cookies = {c.key: c for c in response.cookies.values() if c.key}
        self.assertIn("access_token", cookies)
        self.assertIn("refresh_token", cookies)
        # New tokens should be non-empty
        self.assertTrue(len(cookies["access_token"].value) > 0)
        self.assertTrue(len(cookies["refresh_token"].value) > 0)

    def test_me_works_after_refresh(self, _mock_throttle):
        """After token refresh, /auth/me/ should still work."""
        self._login()
        self.client.post(self.refresh_url)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "refreshuser")

    def test_old_refresh_token_blacklisted_after_rotation(self, _mock_throttle):
        """After refresh with rotation, the old refresh token should be unusable."""
        login_resp = self._login()
        old_refresh = login_resp.cookies["refresh_token"].value

        # Refresh (rotates tokens, blacklists old)
        self.client.post(self.refresh_url)

        # Try to use old refresh token
        self.client.cookies["refresh_token"] = old_refresh
        response = self.client.post(self.refresh_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ============================================================================
# Protected Endpoint Access Without Auth
# ============================================================================
class ProtectedEndpointTests(APITestCase):
    """Test that protected endpoints reject unauthenticated requests."""

    def test_me_endpoint_without_auth(self):
        """GET /auth/me/ without credentials should return 401 or 403."""
        response = self.client.get("/api/tickets/auth/me/")
        self.assertIn(response.status_code, [401, 403])

    def test_tickets_list_without_auth(self):
        """GET /api/tickets/tickets/ without auth should return 401 or 403."""
        response = self.client.get("/api/tickets/tickets/")
        self.assertIn(response.status_code, [401, 403])

    def test_projects_list_without_auth(self):
        """GET /api/tickets/projects/ without auth should return 401 or 403."""
        response = self.client.get("/api/tickets/projects/")
        self.assertIn(response.status_code, [401, 403])

    def test_companies_list_without_auth(self):
        """GET /api/tickets/companies/ without auth should return 401 or 403."""
        response = self.client.get("/api/tickets/companies/")
        self.assertIn(response.status_code, [401, 403])


# ============================================================================
# /auth/me/ Endpoint Tests
# ============================================================================
@patch("tickets.views.AuthRateThrottle.allow_request", return_value=True)
class MeEndpointTests(APITestCase):
    """Test the /auth/me/ endpoint returns correct user data."""

    login_url = "/api/tickets/auth/login/"
    me_url = "/api/tickets/auth/me/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="meuser",
            email="meuser@example.com",
            password="MePass123!",
            first_name="Me",
            last_name="User",
        )

    def _login(self):
        return self.client.post(
            self.login_url,
            {"username": "meuser", "password": "MePass123!"},
            format="json",
        )

    def test_me_returns_user_fields(self, _mock_throttle):
        """GET /auth/me/ should return id, username, email, first_name, last_name."""
        self._login()
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "meuser")
        self.assertEqual(response.data["email"], "meuser@example.com")
        self.assertEqual(response.data["first_name"], "Me")
        self.assertEqual(response.data["last_name"], "User")
        self.assertIn("id", response.data)

    def test_me_returns_projects_field(self, _mock_throttle):
        """GET /auth/me/ should include projects list."""
        self._login()
        response = self.client.get(self.me_url)
        self.assertIn("projects", response.data)
        self.assertIsInstance(response.data["projects"], list)

    def test_me_returns_companies_field(self, _mock_throttle):
        """GET /auth/me/ should include companies list."""
        self._login()
        response = self.client.get(self.me_url)
        self.assertIn("companies", response.data)
        self.assertIsInstance(response.data["companies"], list)

    def test_me_returns_is_superuser(self, _mock_throttle):
        """GET /auth/me/ should include is_superuser field."""
        self._login()
        response = self.client.get(self.me_url)
        self.assertIn("is_superuser", response.data)
        self.assertFalse(response.data["is_superuser"])

    def test_me_returns_roles(self, _mock_throttle):
        """GET /auth/me/ should include roles list."""
        self._login()
        response = self.client.get(self.me_url)
        self.assertIn("roles", response.data)
        self.assertIsInstance(response.data["roles"], list)

    def test_me_only_allows_get(self, _mock_throttle):
        """POST to /auth/me/ should return 405 Method Not Allowed."""
        self._login()
        response = self.client.post(self.me_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_me_rejects_unauthenticated(self, _mock_throttle):
        """GET /auth/me/ without auth should return 401 or 403."""
        client = APIClient()
        response = client.get(self.me_url)
        self.assertIn(response.status_code, [401, 403])
