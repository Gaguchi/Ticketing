import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const isKa = i18n.language === 'ka';

  const toggle = () => {
    i18n.changeLanguage(isKa ? 'en' : 'ka');
  };

  return (
    <div
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.3)',
        overflow: 'hidden',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          padding: '4px 8px',
          background: isKa ? 'rgba(255,255,255,0.2)' : 'transparent',
          color: isKa ? '#fff' : 'rgba(255,255,255,0.5)',
          transition: 'all 0.2s',
        }}
      >
        KA
      </span>
      <span
        style={{
          padding: '4px 8px',
          background: !isKa ? 'rgba(255,255,255,0.2)' : 'transparent',
          color: !isKa ? '#fff' : 'rgba(255,255,255,0.5)',
          transition: 'all 0.2s',
        }}
      >
        EN
      </span>
    </div>
  );
};

export default LanguageSwitcher;
