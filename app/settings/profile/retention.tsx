"use client";

import { buildAuthHeaders } from "@/app/lib/http";
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
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ scope }),
    });

    if (res.ok) {
      setStatus("Data cleared.");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to clear data.");
    }
  };

  const deleteAccount = async () => {
    if (!accessToken) return;
    const confirmed = window.confirm(
      "Delete your account permanently? This removes your profile, scans, notifications, and sign-in access.",
    );
    if (!confirmed) return;

    setError(null);
    const res = await fetch("/api/settings/delete-account", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
    });

    if (res.ok) {
      window.location.href = "/";
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data?.error ?? "Unable to delete account.");
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
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-500">Delete account</p>
          <p className="mt-1 text-xs text-red-500/80">
            Permanently removes your profile, notifications, scans, linked repositories, and sign-in access.
          </p>
          <DangerButton
            onClick={() => void deleteAccount()}
            className="mt-4 w-full bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 hover:text-white"
          >
            Delete my account permanently
          </DangerButton>
        </div>
      </div>
    </SectionCard>
  );
}
