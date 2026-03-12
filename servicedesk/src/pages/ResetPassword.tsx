import { useState, useEffect, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, Input, Button } from "../components/ui";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

type PageState = "validating" | "invalid" | "form" | "success";

export default function ResetPassword() {
  const { t } = useTranslation('auth');
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("validating");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!uid || !token) {
        setPageState("invalid");
        return;
      }

      try {
        const response = await apiService.post<{ valid: boolean }>(
          API_ENDPOINTS.AUTH_PASSWORD_RESET_VALIDATE,
          { uid, token }
        );
        setPageState(response.valid ? "form" : "invalid");
      } catch {
        setPageState("invalid");
      }
    };

    validateToken();
  }, [uid, token]);

  useEffect(() => {
    if (pageState === "success") {
      const timer = setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pageState, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword) {
      setError(t('password.validation.new'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('password.validation.minLength8'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('password.validation.mismatch'));
      return;
    }

    setLoading(true);
    try {
      await apiService.post(API_ENDPOINTS.AUTH_PASSWORD_RESET_CONFIRM, {
        uid,
        token,
        new_password: newPassword,
      });
      setPageState("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('resetPassword.msg.failed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="MAX network" className="h-12" />
        </div>

        {/* Validating State */}
        {pageState === "validating" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('resetPassword.validating')}</p>
          </div>
        )}

        {/* Invalid Token State */}
        {pageState === "invalid" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('resetPassword.invalidTitle')}
              </h1>
            </div>
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                {t('resetPassword.msg.invalidToken')}
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="block w-full text-center"
            >
              <Button variant="primary" fullWidth size="lg">
                {t('resetPassword.requestNew')}
              </Button>
            </Link>
            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-brand-400 hover:text-brand-500 transition-colors"
              >
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </div>
        )}

        {/* Form State */}
        {pageState === "form" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('resetPassword.title')}
              </h1>
              <p className="text-gray-500">{t('resetPassword.subtitle')}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t('password.new')}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('password.newPlaceholder')}
                autoComplete="new-password"
                autoFocus
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                }
              />

              <Input
                label={t('password.confirm')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('password.confirmPlaceholder')}
                autoComplete="new-password"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                }
              />

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                className="mt-6"
              >
                {t('resetPassword.submit')}
              </Button>
            </form>
          </div>
        )}

        {/* Success State */}
        {pageState === "success" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('resetPassword.successTitle')}
              </h1>
            </div>
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-green-700">
                  {t('resetPassword.msg.success')}
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500">
              {t('resetPassword.msg.redirecting')}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
