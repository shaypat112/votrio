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
  GhostButton,
} from "./primitives";
import { Loader2, Save, X, Shield } from "lucide-react";

export function SecuritySection() {
  const { settings, update, save, saving, error, status, setStatus } = useSettings();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

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

      <div className="pt-4 border-t border-border mt-4">
        <DangerButton onClick={signOut}>
          <Shield className="h-3.5 w-3.5 mr-2" />
          Sign out all sessions
        </DangerButton>
      </div>
    </SectionCard>
  );
}
