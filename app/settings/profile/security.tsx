"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";
import { useSettings } from "./context";
import {
  SectionCard,
  Toggle,
  FieldGroup,
  StyledInput,
  DangerButton,
} from "./primitives";

export function SecuritySection() {
  const { settings, update } = useSettings();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <SectionCard
      title="Security"
      description="Authentication and session controls."
    >
      <Toggle
        label="Require 2FA for admins"
        description="Protect admin accounts with an additional verification step."
        checked={settings.require2fa}
        onChange={(v) => update("require2fa", v)}
      />
      <Toggle
        label="Session timeout at 12 h"
        description="Force re-authentication after 12 hours of inactivity."
        checked={settings.sessionTimeoutHours <= 12}
        onChange={(v) => update("sessionTimeoutHours", v ? 12 : 24)}
      />
      <Toggle
        label="Security alerts"
        description="Receive notifications on suspicious sign-in activity."
        checked={settings.securityAlerts}
        onChange={(v) => update("securityAlerts", v)}
      />

      <FieldGroup label="Session timeout (hours)">
        <StyledInput
          type="number"
          min={4}
          max={72}
          value={settings.sessionTimeoutHours}
          onChange={(e) =>
            update("sessionTimeoutHours", Number(e.target.value))
          }
        />
      </FieldGroup>

      <div className="pt-2">
        <DangerButton onClick={signOut}>Sign out all sessions</DangerButton>
      </div>
    </SectionCard>
  );
}
