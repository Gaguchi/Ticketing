import { useState, FormEvent, useEffect, useRef, DragEvent } from "react";
import { Button, Input, Textarea } from "./ui";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    remoteDesktopTool?: string;
    remoteDesktopId?: string;
    attachments?: File[];
  }) => Promise<{ id: number; ticket_key: string } | void>;
}

// File type utilities
const isImageFile = (file: File) => file.type.startsWith("image/");
const isPdfFile = (file: File) => file.type === "application/pdf";

const getFileIcon = (file: File) => {
  if (isImageFile(file)) {
    return (
      <svg
        className="w-5 h-5 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (isPdfFile(file)) {
    return (
      <svg
        className="w-5 h-5 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
};

// Attachment with preview URL
interface AttachmentWithPreview {
  file: File;
  previewUrl?: string;
}

// Remote desktop tool icons (from Simple Icons)
const REMOTE_TOOLS = [
  {
    value: "anydesk",
    label: "AnyDesk",
    color: "#EF443B",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M8.322 3.677L0 12l8.322 8.323L16.645 12zm7.371.01l-1.849 1.85 6.49 6.456-6.49 6.49 1.85 1.817L24 11.993Z" />
      </svg>
    ),
  },
  {
    value: "teamviewer",
    label: "TeamViewer",
    color: "#004680",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="m20.17 11.998-6.225-3.401.685 2.144H9.37l.684-2.145L3.829 12l6.225 3.404-.683-2.147h5.26l-.686 2.147zM20.448 0H3.553A3.553 3.553 0 0 0 .001 3.552v16.895A3.553 3.553 0 0 0 3.553 24h16.895A3.553 3.553 0 0 0 24 20.447V3.552A3.553 3.553 0 0 0 20.448 0zM12 21.646c-5.328 0-9.648-4.32-9.648-9.648 0-5.329 4.32-9.646 9.648-9.646S21.65 6.672 21.65 12s-4.32 9.648-9.649 9.648z" />
      </svg>
    ),
  },
  {
    value: "rustdesk",
    label: "RustDesk",
    color: "#024EFF",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="m20.6081 5.6014-1.9708 1.9588c-.347.3111-.515.8114-.3203 1.2342 1.3127 2.7471.8142 6.0223-1.3403 8.175-2.1554 2.1516-5.4343 2.6492-8.1842 1.3375-.4052-.1819-.8806-.0277-1.1926.288l-2.0031 2.0003a1.0652 1.0652 0 0 0 .192 1.6708 12.0048 12.0048 0 0 0 14.6864-1.765A11.9725 11.9725 0 0 0 22.2808 5.836a1.0652 1.0652 0 0 0-1.6727-.2345zM3.5614 3.4737A11.9716 11.9716 0 0 0 1.6967 18.137a1.0652 1.0652 0 0 0 1.6727.2345L5.33 16.4238c.3554-.3102.528-.816.3314-1.2444-1.3136-2.747-.816-6.0222 1.3394-8.1749C9.1553 4.852 12.4351 4.3543 15.185 5.666c.4006.1791.8695.0305 1.1824-.2769l2.0142-2.0123a1.0634 1.0634 0 0 0-.192-1.6708A12.0085 12.0085 0 0 0 3.519 3.5272z" />
      </svg>
    ),
  },
  {
    value: "chrome",
    label: "Chrome Remote Desktop",
    color: "#4285F4",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z" />
      </svg>
    ),
  },
  {
    value: "other",
    label: "Other",
    color: "#6B7280",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="w-5 h-5"
        strokeWidth={2}
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

type ModalStep = "form" | "success";

export default function CreateTicketModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTicketModalProps) {
  const [step, setStep] = useState<ModalStep>("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [remoteDesktopTool, setRemoteDesktopTool] = useState("");
  const [remoteDesktopId, setRemoteDesktopId] = useState("");
  const [attachments, setAttachments] = useState<AttachmentWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdTicket, setCreatedTicket] = useState<{
    id: number;
    ticket_key: string;
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
      setStep("form");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleClose = () => {
    // Clean up preview URLs to prevent memory leaks
    attachments.forEach((att) => {
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
    });
    setName("");
    setDescription("");
    setRemoteDesktopTool("");
    setRemoteDesktopId("");
    setAttachments([]);
    setError("");
    setCreatedTicket(null);
    setStep("form");
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please describe your issue");
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit({
        name: name.trim(),
        description: description.trim(),
        remoteDesktopTool: remoteDesktopTool || undefined,
        remoteDesktopId: remoteDesktopId.trim() || undefined,
        attachments:
          attachments.length > 0 ? attachments.map((a) => a.file) : undefined,
      });
      if (result) {
        setCreatedTicket(result);
        setStep("success");
      } else {
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFiles(files);
    }
  };

  const addFiles = (files: File[]) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        setError(`${file.name} exceeds 10MB limit`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`${file.name} is not an allowed file type`);
        return false;
      }
      return true;
    });

    // Create attachments with preview URLs for images
    const newAttachments: AttachmentWithPreview[] = validFiles.map((file) => ({
      file,
      previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      // Clean up preview URL
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 p-4 bg-black/40"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-md shadow-xl animate-in fade-in slide-in-from-top-4 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "form" ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                Submit a Request
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                {/* Subject */}
                <Input
                  ref={inputRef}
                  label="What do you need help with?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., I can't access my email"
                />

                {/* Description */}
                <Textarea
                  label="Tell us more (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any details that might help us resolve this faster..."
                  rows={3}
                />

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attach screenshots or files (optional)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
                      ${
                        isDragging
                          ? "border-brand-400 bg-brand-50"
                          : "border-gray-300 hover:border-gray-400"
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.txt"
                    />
                    <svg
                      className="w-8 h-8 mx-auto text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">
                      Drop files here or{" "}
                      <span className="text-brand-500 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG, PDF up to 10MB
                    </p>
                  </div>

                  {/* File list - separate images and files */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {/* Image previews */}
                      {attachments.some((a) => isImageFile(a.file)) && (
                        <div className="grid grid-cols-3 gap-2">
                          {attachments
                            .filter((a) => isImageFile(a.file))
                            .map((att, idx) => {
                              const originalIndex = attachments.findIndex(
                                (a) => a === att
                              );
                              return (
                                <div
                                  key={idx}
                                  className="relative group aspect-square rounded-md overflow-hidden border border-gray-200"
                                >
                                  <img
                                    src={att.previewUrl}
                                    alt={att.file.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => removeFile(originalIndex)}
                                      className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                                    <p className="text-[10px] text-white truncate">
                                      {att.file.name}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Non-image files list */}
                      {attachments.some((a) => !isImageFile(a.file)) && (
                        <div className="space-y-2">
                          {attachments
                            .filter((a) => !isImageFile(a.file))
                            .map((att, idx) => {
                              const originalIndex = attachments.findIndex(
                                (a) => a === att
                              );
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {getFileIcon(att.file)}
                                    <span className="text-sm text-gray-700 truncate">
                                      {att.file.name}
                                    </span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                      {formatFileSize(att.file.size)}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(originalIndex)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Remote Desktop Section */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        x="2"
                        y="3"
                        width="20"
                        height="14"
                        rx="2"
                        strokeWidth={1.5}
                      />
                      <path
                        strokeLinecap="round"
                        strokeWidth={1.5}
                        d="M8 21h8M12 17v4"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      Need remote assistance? (optional)
                    </span>
                  </div>

                  {/* Tool Selection */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {REMOTE_TOOLS.map((tool) => (
                      <button
                        key={tool.value}
                        type="button"
                        onClick={() =>
                          setRemoteDesktopTool(
                            remoteDesktopTool === tool.value ? "" : tool.value
                          )
                        }
                        className={`
                          flex flex-col items-center gap-1 p-2 rounded-md border transition-all
                          ${
                            remoteDesktopTool === tool.value
                              ? "border-brand-400 bg-brand-50 ring-1 ring-brand-400"
                              : "border-gray-200 hover:border-gray-300"
                          }
                        `}
                        title={tool.label}
                      >
                        <span
                          style={{
                            color:
                              remoteDesktopTool === tool.value
                                ? tool.color
                                : "#9CA3AF",
                          }}
                        >
                          {tool.icon}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate w-full text-center">
                          {tool.value === "chrome" ? "Chrome" : tool.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* ID Input */}
                  {remoteDesktopTool && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <Input
                        label={`Your ${
                          REMOTE_TOOLS.find(
                            (t) => t.value === remoteDesktopTool
                          )?.label
                        } ID`}
                        value={remoteDesktopId}
                        onChange={(e) => setRemoteDesktopId(e.target.value)}
                        placeholder="e.g., 123 456 789"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This helps IT connect to your computer faster if remote
                        assistance is needed.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Submit Request
                </Button>
              </div>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Request Submitted!
            </h2>
            <p className="text-gray-600 mb-1">
              Your ticket number is{" "}
              <span className="font-mono font-semibold text-brand-500">
                #{createdTicket?.ticket_key}
              </span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              We'll get back to you as soon as possible.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
