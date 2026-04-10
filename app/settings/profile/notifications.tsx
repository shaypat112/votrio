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
    </SectionCard>
  );
}
