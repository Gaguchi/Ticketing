import React from 'react';
import { useThemeVersion } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { themeVersion, setThemeVersion } = useThemeVersion();
  const isV2 = themeVersion === 'v2';

  const toggle = () => {
    setThemeVersion(isV2 ? 'v1' : 'v2');
  };

  return (
    <div
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        cursor: 'pointer',
        borderRadius: 4,
        border: '1px solid var(--color-border)',
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
          background: !isV2 ? 'var(--color-primary)' : 'transparent',
          color: !isV2 ? '#fff' : 'var(--color-text-muted)',
          transition: 'all 0.2s',
        }}
      >
        V1
      </span>
      <span
        style={{
          padding: '4px 8px',
          background: isV2 ? 'var(--color-primary)' : 'transparent',
          color: isV2 ? '#fff' : 'var(--color-text-muted)',
          transition: 'all 0.2s',
        }}
      >
        V2
      </span>
    </div>
  );
};

export default ThemeSwitcher;
