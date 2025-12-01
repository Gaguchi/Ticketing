import { useState } from "react";

interface FloatingCreateButtonProps {
  onClick: () => void;
}

export default function FloatingCreateButton({
  onClick,
}: FloatingCreateButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-white px-4 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-200"
      aria-label="Create new ticket"
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
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      <span
        className={`font-medium overflow-hidden transition-all duration-200 ${
          isHovered ? "max-w-32 opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        New Ticket
      </span>
    </button>
  );
}
