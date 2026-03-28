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
      <Toggle
        label="Fail build on high severity"
        description="Block the pipeline when critical issues are found."
        checked={settings.failOnHigh}
        onChange={(v) => update("failOnHigh", v)}
      />
      <Toggle
        label="Fail build on medium severity"
        description="Block merges for medium-risk findings."
        checked={settings.failOnMedium}
        onChange={(v) => update("failOnMedium", v)}
      />

      <FieldGroup label="Ignored paths">
        <textarea
          className="min-h-[88px] w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none resize-none transition-colors"
          value={settings.ignoredPaths}
          onChange={(e) => update("ignoredPaths", e.target.value)}
        />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Risk threshold">
          <StyledSelect
            value={settings.riskThreshold}
            onChange={(v) =>
              update("riskThreshold", v as SettingsState["riskThreshold"])
            }
          >
            <option value="low">Low and above</option>
            <option value="medium">Medium and above</option>
            <option value="high">High only</option>
          </StyledSelect>
        </FieldGroup>
        <FieldGroup label="Report format">
          <StyledSelect
            value={settings.reportFormat}
            onChange={(v) =>
              update("reportFormat", v as SettingsState["reportFormat"])
            }
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="terminal">Terminal</option>
          </StyledSelect>
        </FieldGroup>
      </div>

      <FieldGroup label="AI model">
        <StyledSelect
          value={settings.aiModel}
          onChange={(v) => update("aiModel", v as SettingsState["aiModel"])}
        >
          <option value="mistral-large-latest">Mistral Large</option>
          <option value="mistral-medium-latest">Mistral Medium</option>
        </StyledSelect>
      </FieldGroup>
    </SectionCard>
  );
}
