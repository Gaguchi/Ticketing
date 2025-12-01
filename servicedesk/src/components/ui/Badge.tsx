import { HTMLAttributes, forwardRef } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-brand-100 text-brand-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

const dotStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-500",
  primary: "bg-brand-400",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = "default",
      size = "sm",
      dot = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center font-medium rounded-full
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotStyles[variant]}`}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
