interface ProgressChainProps {
  currentStatus: string;
  className?: string;
}

const STATUSES = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "waiting", label: "Waiting" },
  { key: "resolved", label: "Resolved" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-status-open",
  in_progress: "bg-status-inProgress",
  waiting: "bg-status-waiting",
  resolved: "bg-status-resolved",
};

export default function ProgressChain({
  currentStatus,
  className = "",
}: ProgressChainProps) {
  const currentIndex = STATUSES.findIndex((s) => s.key === currentStatus);
  const isResolved = currentStatus === "resolved";

  return (
    <div className={`flex items-center ${className}`}>
      {STATUSES.map((status, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isCompleted = isResolved;

        // Determine dot styling
        let dotClass = "";
        if (isCompleted) {
          dotClass = "bg-status-resolved";
        } else if (isCurrent) {
          dotClass = STATUS_COLORS[status.key] || "bg-brand-400";
        } else if (isPast) {
          dotClass = "bg-gray-400";
        } else {
          dotClass = "bg-gray-200 border-2 border-gray-300";
        }

        // Determine line styling
        let lineClass = "";
        if (isCompleted) {
          lineClass = "bg-status-resolved";
        } else if (index < currentIndex) {
          lineClass = "bg-gray-400";
        } else {
          lineClass = "bg-gray-200";
        }

        return (
          <div key={status.key} className="flex items-center">
            {/* Dot */}
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 ${dotClass}`}
              title={status.label}
            />

            {/* Connector line (not after last item) */}
            {index < STATUSES.length - 1 && (
              <div className={`w-6 sm:w-8 h-0.5 ${lineClass}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
