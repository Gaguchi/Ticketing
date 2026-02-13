import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/layout";
import { Card, Button, Input, Avatar } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

export default function Profile() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { user, logout } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const userName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.username
    : "User";

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: "error", text: t('password.validation.mismatch') });
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({
        type: "error",
        text: t('password.validation.minLength8'),
      });
      return;
    }

    setSaving(true);
    try {
      await apiService.post(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, passwordData);
      setMessage({ type: "success", text: t('password.msg.success') });
      setPasswordData({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
      setShowPasswordForm(false);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : t('password.msg.failed'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer maxWidth="md">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
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
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {tCommon('btn.back')}
      </Link>

      {/* Profile Header */}
      <div className="text-center mb-8">
        <Avatar name={userName} size="xl" className="mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900">{userName}</h1>
        <p className="text-gray-500">{user?.email}</p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Settings */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('profile.title')}
        </h2>

        {/* Change Password */}
        <div className="border-b border-gray-100 pb-4 mb-4">
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full flex items-center justify-between text-left hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-600"
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
              </div>
              <div>
                <p className="font-medium text-gray-900">{t('password.title')}</p>
                <p className="text-sm text-gray-500">
                  {t('password.update')}
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                showPasswordForm ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showPasswordForm && (
            <form
              onSubmit={handlePasswordChange}
              className="mt-4 space-y-4 pl-13"
            >
              <Input
                type="password"
                label={t('password.current')}
                value={passwordData.old_password}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    old_password: e.target.value,
                  })
                }
                required
              />
              <Input
                type="password"
                label={t('password.new')}
                value={passwordData.new_password}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    new_password: e.target.value,
                  })
                }
                required
              />
              <Input
                type="password"
                label={t('password.confirm')}
                value={passwordData.confirm_password}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirm_password: e.target.value,
                  })
                }
                required
              />
              <div className="flex gap-2">
                <Button type="submit" loading={saving}>
                  {t('password.update')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      old_password: "",
                      new_password: "",
                      confirm_password: "",
                    });
                  }}
                >
                  {tCommon('btn.cancel')}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Account Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('profile.username')}</p>
              <p className="font-medium text-gray-900">{user?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-600"
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
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('profile.email')}</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <Button variant="danger" fullWidth onClick={logout}>
        {t('profile.signOut')}
      </Button>
    </PageContainer>
  );
}
