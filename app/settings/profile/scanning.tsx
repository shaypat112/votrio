"use client";

import { useSettings } from "./context";
import { SectionCard, Toggle, FieldGroup, StyledSelect } from "./primitives";
import type { SettingsState } from "./context";

export function ScanningSection() {
  const { settings, update } = useSettings();

  return (
    <SectionCard
      title="Scan automation"
      description="Configure automated scan triggers and thresholds."
    >
      <Toggle
        label="Auto-scan on push"
        description="Trigger a scan for every commit pushed."
        checked={settings.scanOnPush}
        onChange={(v) => update("scanOnPush", v)}
      />
      <Toggle
        label="Auto-scan on pull request"
        description="Gate merges with an AI code review."
        checked={settings.scanOnPr}
        onChange={(v) => update("scanOnPr", v)}
      />

      <FieldGroup label="Ignored paths">
        <textarea
          className="min-h-22 w-full rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none resize-none transition-colors"
          value={settings.ignoredPaths}
          onChange={(e) => update("ignoredPaths", e.target.value)}
        />
      </FieldGroup>
    </SectionCard>
  );
}
