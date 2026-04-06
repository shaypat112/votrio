"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { cn } from "../lib/utils";
import {
  User,
  Bell,
  Shield,
  Zap,
  Webhook,
  Database,
  Users,
  CreditCard,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SettingsState = {
  fullName: string;
  username: string;
  avatarUrl: string;
  emailNotifications: boolean;
  notifyHigh: boolean;
  notifyMedium: boolean;
  notifyLow: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  scanOnPush: boolean;
  scanOnPr: boolean;
  failOnHigh: boolean;
  failOnMedium: boolean;
  ignoredPaths: string;
  riskThreshold: "low" | "medium" | "high";
  reportFormat: "json" | "markdown" | "terminal";
  aiModel: "mistral-large-latest" | "mistral-medium-latest";
  require2fa: boolean;
  sessionTimeoutHours: number;
  securityAlerts: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookEvents: string[];
  retentionDays: number;
};

const defaultSettings: SettingsState = {
  fullName: "",
  username: "",
  avatarUrl: "",
  emailNotifications: true,
  notifyHigh: true,
  notifyMedium: true,
  notifyLow: false,
  dailyDigest: false,
  weeklyDigest: true,
  scanOnPush: true,
  scanOnPr: true,
  failOnHigh: true,
  failOnMedium: false,
  ignoredPaths: "node_modules/**, dist/**, .next/**",
  riskThreshold: "medium",
  reportFormat: "markdown",
  aiModel: "mistral-large-latest",
  require2fa: false,
  sessionTimeoutHours: 12,
  securityAlerts: true,
  webhookEnabled: false,
  webhookUrl: "",
  webhookEvents: ["repository.published", "review.created", "scan.completed"],
  retentionDays: 30,
};

type Team = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: string;
};

type TeamMember = {
  id: string;
  role: string;
  user_id: string;
  profiles?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
};

// ─── Nav sections ─────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "scanning", label: "Scanning", icon: Zap },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "retention", label: "Data", icon: Database },
  { id: "teams", label: "Teams", icon: Users },
  { id: "plan", label: "Plan", icon: CreditCard },
] as const;

type SectionId = (typeof NAV_SECTIONS)[number]["id"];

// ─── Primitives ───────────────────────────────────────────────────────────────

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-colors",
        "border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
          checked ? "bg-white" : "bg-zinc-700",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm",
            "transform transition-transform duration-200",
            checked
              ? "translate-x-4 bg-foreground"
              : "translate-x-0 bg-zinc-400",
          )}
        />
      </button>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-zinc-100",
        "placeholder:text-zinc-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-0",
        "transition-colors",
        props.className,
      )}
    />
  );
}

function StyledSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-zinc-100",
        "focus:border-white/20 focus:outline-none focus:ring-0 transition-colors",
        "appearance-none cursor-pointer",
      )}
    >
      {children}
    </select>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function DangerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400",
        "hover:border-red-800/60 hover:bg-red-950/40 hover:text-red-300 transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsClient() {
  const supabase = useMemo(() => createClient(), []);
  const [activeSection, setActiveSection] = useState<SectionId>("account");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamStatus, setTeamStatus] = useState<string | null>(null);
  const router = useRouter();

  const update = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase) {
        setError("Supabase not configured.");
        setLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Please sign in.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/settings/load", {
        method: "POST",
        headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      });
      if (!mounted) return;
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...(data?.settings ?? {}) }));
      }
      setLoadingTeams(true);
      const teamsRes = await fetch("/api/teams/list", {
        headers: buildAuthHeaders(accessToken),
      });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        const nextTeams = (teamsData?.teams ?? []) as Team[];
        setTeams(nextTeams);
        if (!selectedTeamId && nextTeams.length > 0) {
          const nextTeamId = nextTeams[0].id;
          setSelectedTeamId(nextTeamId);

          const membersRes = await fetch(
            `/api/teams/members?teamId=${nextTeamId}`,
            {
              headers: buildAuthHeaders(accessToken),
            },
          );
          if (membersRes.ok) {
            const membersData = await membersRes.json();
            setTeamMembers(membersData?.members ?? []);
          }
        }
      }
      setLoadingTeams(false);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedTeamId, supabase]);

  const saveSettings = async () => {
    if (!supabase) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData.session?.access_token;
    if (!at) {
      setError("Please sign in.");
      setSaving(false);
      return;
    }
    const res = await fetch("/api/settings/save", {
      method: "POST",
      headers: buildAuthHeaders(at, { "Content-Type": "application/json" }),
      body: JSON.stringify({ settings }),
    });
    if (res.ok) setStatus("Changes saved.");
    else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Unable to save.");
    }
    setSaving(false);
  };

  const testWebhook = async () => {
    if (!supabase) return;
    setTestingWebhook(true);
    setStatus(null);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData.session?.access_token;
    if (!at) {
      setTestingWebhook(false);
      return;
    }
    const res = await fetch("/api/settings/test-webhook", {
      method: "POST",
      headers: buildAuthHeaders(at, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        webhookUrl: settings.webhookUrl,
      }),
    });
    if (res.ok) setStatus("Test event delivered.");
    else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Webhook test failed.");
    }
    setTestingWebhook(false);
  };

  const createTeam = async () => {
    if (!supabase || !teamName.trim()) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData.session?.access_token;
    if (!at) return;
    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: buildAuthHeaders(at, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: teamName.trim() }),
    });
    if (res.ok) {
      setTeamName("");
      await loadTeams(at);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamStatus(d?.error ?? "Unable to create.");
    }
  };

  const addMember = async () => {
    if (!supabase || !selectedTeamId || !inviteUsername.trim()) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData.session?.access_token;
    if (!at) return;
    const res = await fetch("/api/teams/add-member", {
      method: "POST",
      headers: buildAuthHeaders(at, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        teamId: selectedTeamId,
        username: inviteUsername.trim(),
      }),
    });
    if (res.ok) {
      setInviteUsername("");
      await loadTeamMembers(selectedTeamId, at);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamStatus(d?.error ?? "Unable to add.");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData.session?.access_token;
    if (!at || !selectedTeamId) return;
    const res = await fetch("/api/teams/remove-member", {
      method: "POST",
      headers: buildAuthHeaders(at, { "Content-Type": "application/json" }),
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) await loadTeamMembers(selectedTeamId, at);
    else {
      const d = await res.json().catch(() => ({}));
      setTeamStatus(d?.error ?? "Unable to remove.");
    }
  };

  const clearData = async (scope: "scan_history" | "notifications" | "all") => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData.session?.access_token;
    if (!at) return;
    const res = await fetch("/api/settings/clear-data", {
      method: "POST",
      headers: buildAuthHeaders(at, { "Content-Type": "application/json" }),
      body: JSON.stringify({ scope }),
    });
    if (res.ok) setStatus("Data cleared.");
    else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Unable to clear.");
    }
  };

  const openBillingPortal = async () => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const at = sessionData.session?.access_token;
    if (!at) return;
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: buildAuthHeaders(at, { "Content-Type": "application/json" }),
    });
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Unable to open portal.");
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-xl border border-red-900/40 bg-red-950/20 px-5 py-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}
    >
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-border bg-background/80 backdrop-blur-xl mt-10">
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                activeSection === id
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  activeSection === id
                    ? "text-white"
                    : "text-zinc-600 group-hover:text-zinc-400",
                )}
              />
              {label}
              {activeSection === id && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-600" />
              )}
            </button>
          ))}
        </nav>

        {/* Save CTA */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg bg-card py-2 text-sm font-medium text-foreground",
              "transition-all hover:bg-zinc-100 active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Save changes
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="ml-56 flex-1 px-10 py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Toast / banners */}
          {status && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400">
              <Check className="h-4 w-4 shrink-0" /> {status}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* ── Account ── */}
          {activeSection === "account" && (
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
                  className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline transition-colors"
                >
                  Submit feedback →
                </button>
              </div>
            </SectionCard>
          )}

          {/* ── Security ── */}
          {activeSection === "security" && (
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
                <DangerButton onClick={signOut}>
                  Sign out all sessions
                </DangerButton>
              </div>
            </SectionCard>
          )}

          {/* ── Notifications ── */}
          {activeSection === "notifications" && (
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
            </SectionCard>
          )}

          {/* ── Scanning ── */}
          {activeSection === "scanning" && (
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
                      update(
                        "riskThreshold",
                        v as SettingsState["riskThreshold"],
                      )
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
                  onChange={(v) =>
                    update("aiModel", v as SettingsState["aiModel"])
                  }
                >
                  <option value="mistral-large-latest">Mistral Large</option>
                  <option value="mistral-medium-latest">Mistral Medium</option>
                </StyledSelect>
              </FieldGroup>
            </SectionCard>
          )}

          {/* ── Webhooks ── */}
          {activeSection === "webhooks" && (
            <SectionCard
              title="Webhooks"
              description="Push scan events to your own infrastructure."
            >
              <Toggle
                label="Enable webhook delivery"
                description="Start sending events to your endpoint."
                checked={settings.webhookEnabled}
                onChange={(v) => update("webhookEnabled", v)}
              />
              <FieldGroup label="Webhook URL">
                <StyledInput
                  value={settings.webhookUrl}
                  onChange={(e) => update("webhookUrl", e.target.value)}
                  placeholder="https://your-server.com/webhook"
                />
              </FieldGroup>

              <FieldGroup label="Events">
                <div className="space-y-2">
                  {[
                    {
                      id: "repository.published",
                      label: "Repository published",
                    },
                    { id: "review.created", label: "Review created" },
                    { id: "scan.completed", label: "Scan completed" },
                  ].map((evt) => (
                    <label
                      key={evt.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-white"
                        checked={settings.webhookEvents.includes(evt.id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...settings.webhookEvents, evt.id]
                            : settings.webhookEvents.filter(
                                (x) => x !== evt.id,
                              );
                          update("webhookEvents", next);
                        }}
                      />
                      <span className="text-sm text-zinc-200">{evt.label}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>

              <div className="pt-2">
                <button
                  onClick={testWebhook}
                  disabled={testingWebhook || !settings.webhookUrl}
                  className={cn(
                    "rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300",
                    "hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white transition-colors",
                    "disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2",
                  )}
                >
                  {testingWebhook && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {testingWebhook ? "Sending…" : "Send test event"}
                </button>
              </div>
            </SectionCard>
          )}

          {/* ── Data retention ── */}
          {activeSection === "retention" && (
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
              </div>
            </SectionCard>
          )}

          {/* ── Teams ── */}
          {activeSection === "teams" && (
            <SectionCard
              title="Teams"
              description="Create and manage team access."
            >
              <FieldGroup label="New team">
                <div className="flex gap-2">
                  <StyledInput
                    placeholder="Team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="flex-1"
                  />
                  <button
                    onClick={createTeam}
                    disabled={!teamName.trim()}
                    className={cn(
                      "rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200",
                      "hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white transition-colors",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                  >
                    Create
                  </button>
                </div>
              </FieldGroup>

              {teamStatus && (
                <p className="text-xs text-red-400">{teamStatus}</p>
              )}

              {loadingTeams ? (
                <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : teams.length === 0 ? (
                <p className="text-sm text-zinc-500">No teams yet.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={async () => {
                          setSelectedTeamId(team.id);
                          const { data: s } = await supabase.auth.getSession();
                          const at = s.session?.access_token;
                          if (at) await loadTeamMembers(team.id, at);
                        }}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                          selectedTeamId === team.id
                            ? "bg-card text-foreground"
                            : "border border-white/[0.08] text-zinc-400 hover:border-white/[0.14] hover:text-zinc-200",
                        )}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>

                  {selectedTeamId && (
                    <div className="space-y-4 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
                      <FieldGroup label="Add member">
                        <div className="flex gap-2">
                          <StyledInput
                            placeholder="username"
                            value={inviteUsername}
                            onChange={(e) => setInviteUsername(e.target.value)}
                            className="flex-1"
                          />
                          <button
                            onClick={addMember}
                            disabled={!inviteUsername.trim()}
                            className={cn(
                              "rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200",
                              "hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white transition-colors",
                              "disabled:opacity-40 disabled:cursor-not-allowed",
                            )}
                          >
                            Add
                          </button>
                        </div>
                      </FieldGroup>

                      <div className="space-y-2">
                        {teamMembers.length === 0 ? (
                          <p className="text-xs text-zinc-500">
                            No members yet.
                          </p>
                        ) : (
                          teamMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2"
                            >
                              <div>
                                <p className="text-sm text-zinc-100">
                                  {member.profiles?.full_name ??
                                    member.profiles?.username ??
                                    "Member"}
                                </p>
                                <p className="text-xs text-zinc-600">
                                  {member.profiles?.username ?? member.user_id}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-md border border-white/[0.07] px-2 py-0.5 text-xs text-zinc-400">
                                  {member.role}
                                </span>
                                <DangerButton
                                  onClick={() => removeMember(member.id)}
                                >
                                  Remove
                                </DangerButton>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </SectionCard>
          )}

          {/* ── Plan ── */}
          {activeSection === "plan" && (
            <SectionCard title="Plan" description="Your current subscription.">
              <div className="rounded-lg border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-white">
                        Pro trial
                      </p>
                      <span className="rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        Active
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      Unlimited scans · AI refactors · CI/CD gating
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-1">
                <button
                  onClick={openBillingPortal}
                  className={cn(
                    "rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300",
                    "hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white transition-colors",
                  )}
                >
                  Manage billing →
                </button>
              </div>
            </SectionCard>
          )}
        </div>
      </main>
    </div>
  );
}
