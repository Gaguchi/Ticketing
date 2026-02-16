import React from 'react';
import { useThemeVersion } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { resolvedMode, setThemePreference } = useThemeVersion();
  const isDark = resolvedMode === 'dark';

  const toggle = () => {
    setThemePreference(isDark ? 'light' : 'dark');
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
        fontSize: 'var(--fs-sm)',
        fontWeight: 600,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          padding: '4px 8px',
          background: !isDark ? 'var(--color-primary)' : 'transparent',
          color: !isDark ? '#fff' : 'var(--color-text-muted)',
          transition: 'all 0.2s',
        }}
      >
        Light
      </span>
      <span
        style={{
          padding: '4px 8px',
          background: isDark ? 'var(--color-primary)' : 'transparent',
          color: isDark ? '#fff' : 'var(--color-text-muted)',
          transition: 'all 0.2s',
        }}
      >
        Dark
      </span>
    </div>
  );
};

export default ThemeSwitcher;
