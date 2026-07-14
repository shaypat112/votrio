"use client";

import { useSettings } from "./context";
import { SectionCard, Toggle, FieldGroup, StyledSelect, GhostButton } from "./primitives";
import type { SettingsState } from "./context";
import { Loader2, Save, X, ScanLine } from "lucide-react";

export function ScanningSection() {
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
        label="Fail on high severity"
        description="Block CI pipeline when high-severity issues are found."
        checked={settings.failOnHigh}
        onChange={(v) => update("failOnHigh", v)}
      />
      <Toggle
        label="Fail on medium severity"
        description="Block CI pipeline when medium-severity issues are found."
        checked={settings.failOnMedium}
        onChange={(v) => update("failOnMedium", v)}
      />

      <FieldGroup label="Risk threshold">
        <StyledSelect
          value={settings.riskThreshold}
          onChange={(v) => update("riskThreshold", v as SettingsState["riskThreshold"])}
        >
          <option value="low">Low - Report all issues</option>
          <option value="medium">Medium - Report medium and above</option>
          <option value="high">High - Report only critical issues</option>
        </StyledSelect>
      </FieldGroup>

      <FieldGroup label="Report format">
        <StyledSelect
          value={settings.reportFormat}
          onChange={(v) => update("reportFormat", v as SettingsState["reportFormat"])}
        >
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
          <option value="terminal">Terminal</option>
        </StyledSelect>
      </FieldGroup>

      <FieldGroup label="Ignored paths">
        <textarea
          className="min-h-22 w-full rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none resize-none transition-colors"
          value={settings.ignoredPaths}
          onChange={(e) => update("ignoredPaths", e.target.value)}
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
    </SectionCard>
  );
}
