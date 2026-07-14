"use client";

import { useSettings } from "./context";
import { SectionCard, Toggle, GhostButton } from "./primitives";
import { Loader2, Save, X, Bell } from "lucide-react";

export function NotificationsSection() {
  const { settings, update, save, saving, error, status, setStatus } = useSettings();

  const handleSave = async () => {
    setStatus(null);
    await save();
    if (!error) {
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleCancel = () => {
    setStatus(null);
    setStatus("Changes cancelled.");
    setTimeout(() => setStatus(null), 2000);
  };

  return (
    <SectionCard
      title="Notifications"
      description="Control how and when you're alerted."
    >
      <Toggle
        label="Email notifications"
        description="Deliver scan alerts to your inbox."
        checked={settings.emailNotifications}
        onChange={(v) => update("emailNotifications", v)}
      />
      <Toggle
        label="High severity alerts"
        description="Get notified for critical and high-severity issues."
        checked={settings.notifyHigh}
        onChange={(v) => update("notifyHigh", v)}
      />
      <Toggle
        label="Medium severity alerts"
        description="Get notified for medium-severity issues."
        checked={settings.notifyMedium}
        onChange={(v) => update("notifyMedium", v)}
      />
      <Toggle
        label="Low severity alerts"
        description="Get notified for low-severity issues."
        checked={settings.notifyLow}
        onChange={(v) => update("notifyLow", v)}
      />
      <Toggle
        label="Daily digest"
        description="Receive a daily summary of all scan results."
        checked={settings.dailyDigest}
        onChange={(v) => update("dailyDigest", v)}
      />
      <Toggle
        label="Weekly digest"
        description="Receive a weekly summary of all scan results."
        checked={settings.weeklyDigest}
        onChange={(v) => update("weeklyDigest", v)}
      />

      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
        <div className="flex gap-2">
          <GhostButton onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save changes
              </>
            )}
          </GhostButton>
          <GhostButton onClick={handleCancel} disabled={saving}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </GhostButton>
        </div>
        
        {status && (
          <p className="text-xs text-green-600 dark:text-green-400">{status}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </SectionCard>
  );
}
