import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, Input, Button } from "../components/ui";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

export default function ForgotPassword() {
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t('forgotPassword.validation.email'));
      return;
    }

    setLoading(true);
    try {
      await apiService.post(API_ENDPOINTS.AUTH_PASSWORD_RESET, {
        email: email.trim(),
        source: 'servicedesk',
      });
      setSubmitted(true);
    } catch {
      // The backend always returns 200, but handle network errors gracefully
      setSubmitted(true);
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

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {t('forgotPassword.title')}
          </h1>
          <p className="text-gray-500">{t('forgotPassword.subtitle')}</p>
        </div>

        {submitted ? (
          /* Success State */
          <div>
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-green-700">
                  {t('forgotPassword.msg.checkEmail')}
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="block w-full text-center text-sm font-medium text-brand-400 hover:text-brand-500 transition-colors"
            >
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        ) : (
          /* Form State */
          <div>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t('forgotPassword.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('forgotPassword.emailPlaceholder')}
                autoComplete="email"
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
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
                {t('forgotPassword.submit')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-brand-400 hover:text-brand-500 transition-colors"
              >
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
