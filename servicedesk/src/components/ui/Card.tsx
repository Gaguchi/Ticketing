import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

const variantStyles = {
  default: "bg-white shadow-card",
  elevated: "bg-white shadow-modal",
  outlined: "bg-white border border-gray-200",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      hoverable = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-md
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${
            hoverable
              ? "transition-shadow duration-200 hover:shadow-card-hover cursor-pointer"
              : ""
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
