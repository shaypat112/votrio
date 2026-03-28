"use client";

import { useSettings } from "./context";
import { SectionCard, Toggle } from "./primitives";

export function NotificationsSection() {
  const { settings, update } = useSettings();

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
        description="Fire immediately for critical findings."
        checked={settings.notifyHigh}
        onChange={(v) => update("notifyHigh", v)}
      />
      <Toggle
        label="Medium severity alerts"
        description="Notify when medium-risk issues appear."
        checked={settings.notifyMedium}
        onChange={(v) => update("notifyMedium", v)}
      />
      <Toggle
        label="Low severity alerts"
        description="Bundle lower-priority warnings into digests."
        checked={settings.notifyLow}
        onChange={(v) => update("notifyLow", v)}
      />
      <Toggle
        label="Weekly digest"
        description="Summary of scans every Friday morning."
        checked={settings.weeklyDigest}
        onChange={(v) => update("weeklyDigest", v)}
      />
      <Toggle
        label="Daily digest"
        description="Daily rollup of reviews and completed scans."
        checked={settings.dailyDigest}
        onChange={(v) => update("dailyDigest", v)}
      />
    </SectionCard>
  );
}
