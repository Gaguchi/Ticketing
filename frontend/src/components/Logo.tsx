import React from "react";
import logoImage from "../assets/logo.png";

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

/**
 * iTech logo component
 * Used across the application for branding consistency
 */
export const Logo: React.FC<LogoProps> = ({
  size = 32,
  showText = false,
  textColor = "#262626",
}) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img
        src={logoImage}
        alt="iTech Logo"
        style={{
          height: size,
          width: "auto",
          objectFit: "contain",
        }}
      />
      {showText && (
        <span
          style={{
            fontSize: size * 0.45,
            fontWeight: 600,
            color: textColor,
          }}
        >
          iTech
        </span>
      )}
    </div>
  );
};

/**
 * Logo icon only (for collapsed sidebar, favicons, etc.)
 */
export const LogoIcon: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <img
      src={logoImage}
      alt="iTech Logo"
      style={{
        height: size,
        width: "auto",
        objectFit: "contain",
      }}
    />
  );
};

export default Logo;
