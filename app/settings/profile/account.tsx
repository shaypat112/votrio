"use client";

import { useRouter } from "next/navigation";
import { useSettings } from "./context";
import { SectionCard, FieldGroup, StyledInput } from "./primitives";

export function AccountSection() {
  const { settings, update } = useSettings();
  const router = useRouter();

  return (
    <SectionCard
      title="Account"
      description="Your personal profile information."
    >
      <FieldGroup label="Full name">
        <StyledInput
          value={settings.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          placeholder="Jane Smith"
        />
      </FieldGroup>

      <FieldGroup label="Username">
        <StyledInput
          value={settings.username}
          onChange={(e) => update("username", e.target.value)}
          placeholder="janesmith"
        />
      </FieldGroup>

      <FieldGroup label="Avatar URL">
        <StyledInput
          value={settings.avatarUrl}
          onChange={(e) => update("avatarUrl", e.target.value)}
          placeholder="https://…"
        />
      </FieldGroup>

      <div className="pt-2">
        <button
          onClick={() => router.push("/feedback")}
          className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Submit feedback →
        </button>
      </div>
    </SectionCard>
  );
}
