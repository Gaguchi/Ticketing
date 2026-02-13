import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';

// ─── Language config (add new languages here) ───
const LANGUAGES = [
  { code: 'en', nativeLabel: 'English', flag: 'uk' as const },
  { code: 'ka', nativeLabel: 'ქართული', flag: 'ge' as const },
];

// ─── Inline SVG flags ───
const GeoFlag: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 30 20" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="30" height="20" fill="#fff" />
    <rect x="13" y="0" width="4" height="20" fill="#E8112D" />
    <rect x="0" y="8" width="30" height="4" fill="#E8112D" />
    <rect x="5" y="3" width="1.6" height="4" fill="#E8112D" />
    <rect x="3.5" y="4.2" width="4.6" height="1.6" fill="#E8112D" />
    <rect x="23.4" y="3" width="1.6" height="4" fill="#E8112D" />
    <rect x="21.9" y="4.2" width="4.6" height="1.6" fill="#E8112D" />
    <rect x="5" y="13" width="1.6" height="4" fill="#E8112D" />
    <rect x="3.5" y="14.2" width="4.6" height="1.6" fill="#E8112D" />
    <rect x="23.4" y="13" width="1.6" height="4" fill="#E8112D" />
    <rect x="21.9" y="14.2" width="4.6" height="1.6" fill="#E8112D" />
  </svg>
);

const UkFlag: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 60 40" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="60" height="40" fill="#003078" />
    <polygon points="0,0 20,13.3 0,4" fill="#fff" />
    <polygon points="60,0 40,13.3 60,4" fill="#fff" />
    <polygon points="0,40 20,26.7 0,36" fill="#fff" />
    <polygon points="60,40 40,26.7 60,36" fill="#fff" />
    <polygon points="0,0 24,16 16,16 0,5.3" fill="#fff" />
    <polygon points="60,0 36,16 44,16 60,5.3" fill="#fff" />
    <polygon points="0,40 24,24 16,24 0,34.7" fill="#fff" />
    <polygon points="60,40 36,24 44,24 60,34.7" fill="#fff" />
    <polygon points="0,0 20,13.3 16,13.3 0,2.2" fill="#C8102E" />
    <polygon points="60,0 40,13.3 44,13.3 60,2.2" fill="#C8102E" />
    <polygon points="0,40 20,26.7 16,26.7 0,37.8" fill="#C8102E" />
    <polygon points="60,40 40,26.7 44,26.7 60,37.8" fill="#C8102E" />
    <rect x="0" y="16" width="60" height="8" fill="#fff" />
    <rect x="26" y="0" width="8" height="40" fill="#fff" />
    <rect x="0" y="17.5" width="60" height="5" fill="#C8102E" />
    <rect x="27.5" y="0" width="5" height="40" fill="#C8102E" />
  </svg>
);

const FlagIcon: React.FC<{ flag: 'ge' | 'uk'; size?: number }> = ({ flag, size = 18 }) =>
  flag === 'ge' ? <GeoFlag size={size} /> : <UkFlag size={size} />;

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const code = i18n.language;

  return (
    <Select
      value={code}
      onChange={(c) => i18n.changeLanguage(c)}
      size="small"
      variant="borderless"
      popupMatchSelectWidth={false}
      suffixIcon={null}
      style={{ width: 46 }}
      options={LANGUAGES.map((lang) => ({
        value: lang.code,
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FlagIcon flag={lang.flag} size={16} />
            <span>{lang.nativeLabel}</span>
          </span>
        ),
      }))}
      labelRender={(props) => {
        const lang = LANGUAGES.find((l) => l.code === props.value);
        if (!lang) return null;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <FlagIcon flag={lang.flag} size={20} />
          </span>
        );
      }}
    />
  );
};

export default LanguageSwitcher;
