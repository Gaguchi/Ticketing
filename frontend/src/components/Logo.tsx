import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

/**
 * ServiceDesk-style blue logo component
 * Used across the application for branding consistency
 */
export const Logo: React.FC<LogoProps> = ({
  size = 32,
  showText = false,
  textColor = "#262626",
}) => {
  const iconSize = size;
  const fontSize = size * 0.4;
  const borderRadius = size * 0.125;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: borderRadius,
          background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          boxShadow: "0 2px 8px rgba(24, 144, 255, 0.35)",
        }}
      >
        SD
      </div>
      {showText && (
        <span
          style={{
            fontSize: size * 0.45,
            fontWeight: 600,
            color: textColor,
          }}
        >
          ServiceDesk
        </span>
      )}
    </div>
  );
};

/**
 * Logo icon only (for collapsed sidebar, favicons, etc.)
 */
export const LogoIcon: React.FC<{ size?: number }> = ({ size = 32 }) => {
  const borderRadius = size * 0.125;
  const fontSize = size * 0.4;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius,
        background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        letterSpacing: "-0.5px",
        boxShadow: "0 2px 8px rgba(24, 144, 255, 0.35)",
      }}
    >
      SD
    </div>
  );
};

export default Logo;
