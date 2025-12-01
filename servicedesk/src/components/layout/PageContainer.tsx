import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

const maxWidthStyles = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-full",
};

export default function PageContainer({
  children,
  maxWidth = "2xl",
  className = "",
}: PageContainerProps) {
  return (
    <main
      className={`${maxWidthStyles[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-6 ${className}`}
    >
      {children}
    </main>
  );
}
