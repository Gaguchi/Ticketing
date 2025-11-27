import { useState, FormEvent } from "react";
import { Card, Button, Textarea, Select } from "../ui";

interface QuickCreateProps {
  onSubmit: (data: {
    name: string;
    description: string;
    priority: string;
  }) => Promise<void>;
  loading?: boolean;
}

const PRIORITY_OPTIONS = [
  { value: "Low", label: "🟢 Low" },
  { value: "Medium", label: "🟡 Medium" },
  { value: "High", label: "🟠 High" },
  { value: "Critical", label: "🔴 Critical" },
];

export default function QuickCreate({
  onSubmit,
  loading = false,
}: QuickCreateProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please describe your issue");
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        priority,
      });
      // Reset form on success
      setName("");
      setDescription("");
      setPriority("Medium");
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    }
  };

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-brand-400"
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
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Need Help?</h2>
            <p className="text-sm text-gray-500">Create a new support ticket</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Title/Issue input */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="Describe your issue in a few words..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          />

          {/* Expanded form fields */}
          {expanded && (
            <>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about the issue (optional)..."
                rows={3}
              />

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="w-full sm:w-48">
                  <Select
                    label="Priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    options={PRIORITY_OPTIONS}
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setExpanded(false);
                      setName("");
                      setDescription("");
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    Create Ticket
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Simple submit when not expanded */}
          {!expanded && name.trim() && (
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Create Ticket
              </Button>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}
