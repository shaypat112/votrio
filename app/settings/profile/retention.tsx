"use client";

import { useSettings } from "./context";
import { SectionCard, DangerButton } from "./primitives";

type ClearScope = "scan_history" | "notifications" | "all";

export function RetentionSection() {
  const { accessToken, setError, setStatus } = useSettings();

  const clearData = async (scope: ClearScope) => {
    if (!accessToken) return;
    setError(null);

    const res = await fetch("/api/settings/clear-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, scope }),
    });

    if (res.ok) {
      setStatus("Data cleared.");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to clear data.");
    }
  };

  return (
    <SectionCard
      title="Data retention"
      description="Manage how long scan data is kept."
    >
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Retention window
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Scan data is automatically removed after 30 days.
            </p>
          </div>
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-mono text-zinc-300">
            30 days
          </span>
        </div>
      </div>

      <div className="pt-1">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Danger zone
        </p>
        <div className="flex flex-wrap gap-2">
          <DangerButton onClick={() => clearData("scan_history")}>
            Clear scan history
          </DangerButton>
          <DangerButton onClick={() => clearData("notifications")}>
            Clear notifications
          </DangerButton>
          <DangerButton onClick={() => clearData("all")}>
            Clear all data
          </DangerButton>
        </div>
      </div>
    </SectionCard>
  );
}
