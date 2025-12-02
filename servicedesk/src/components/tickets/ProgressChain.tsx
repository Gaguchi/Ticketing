interface ProgressChainProps {
  currentStatus: string;
  className?: string;
  showLabels?: boolean;
  isResolved?: boolean;
  isFinalColumn?: boolean;
}

const STATUSES = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "waiting", label: "Waiting" },
  { key: "done", label: "Done" },
];

const STATUS_COLORS: Record<string, { bg: string; ring: string }> = {
  open: { bg: "bg-blue-500", ring: "ring-blue-200" },
  in_progress: { bg: "bg-yellow-500", ring: "ring-yellow-200" },
  waiting: { bg: "bg-orange-500", ring: "ring-orange-200" },
  done: { bg: "bg-green-500", ring: "ring-green-200" },
};

export default function ProgressChain({
  currentStatus,
  className = "",
  showLabels = false,
  isResolved = false,
  isFinalColumn = false,
}: ProgressChainProps) {
  const currentIndex = STATUSES.findIndex((s) => s.key === currentStatus);

  return (
    <div className={className}>
      <div className="flex items-center">
        {STATUSES.map((status, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === STATUSES.length - 1;

          // Determine dot styling
          let dotClass = "";
          let ringClass = "";

          if (isResolved) {
            // All dots green when resolved
            dotClass = "bg-green-500";
            ringClass = index <= currentIndex ? "ring-2 ring-green-200" : "";
          } else if (isCurrent) {
            const colors = STATUS_COLORS[status.key] || {
              bg: "bg-brand-400",
              ring: "ring-brand-200",
            };
            dotClass = colors.bg;
            ringClass = `ring-2 ${colors.ring}`;
          } else if (isPast) {
            dotClass = "bg-gray-400";
          } else {
            dotClass = "bg-gray-200";
          }

          // Determine line styling
          let lineClass = "";
          if (isResolved) {
            lineClass = "bg-green-500";
          } else if (index < currentIndex) {
            lineClass = "bg-gray-400";
          } else {
            lineClass = "bg-gray-200";
          }

          return (
            <div key={status.key} className="flex items-center">
              {/* Dot */}
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${dotClass} ${ringClass}`}
                title={status.label}
              />

              {/* Connector line (not after last item) */}
              {!isLast && (
                <div
                  className={`w-6 sm:w-8 h-0.5 transition-colors ${lineClass}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex items-center mt-2">
          {STATUSES.map((status, index) => {
            const isCurrent = index === currentIndex;
            const isLast = index === STATUSES.length - 1;

            // Determine label to show
            let label = status.label;
            if (isCurrent && isFinalColumn && !isResolved) {
              label = "Awaiting Review";
            } else if (isResolved && isLast) {
              label = "Resolved";
            }

            return (
              <div key={status.key} className="flex items-center">
                <span
                  className={`text-xs text-center w-3 ${
                    isCurrent
                      ? isResolved
                        ? "text-green-600 font-medium"
                        : "text-gray-900 font-medium"
                      : "text-gray-400"
                  }`}
                  style={{ width: "3rem", marginLeft: "-1.25rem" }}
                >
                  {isCurrent || (isResolved && isLast) ? label : ""}
                </span>
                {!isLast && <div className="w-6 sm:w-8" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
