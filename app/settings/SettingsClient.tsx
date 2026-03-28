"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openPortal } from "../dashboard/billing/page";
import { useRouter } from "next/navigation";

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
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookEvents: string[];
  retentionDays: number;
  shareDashboard: boolean;
  allowInvites: boolean;
};

type RepoVisibility = {
  id: string;
  repo_url: string;
  name: string;
  description: string | null;
  is_public: boolean;
  status: string;
  review_count: number;
  rating_avg: number;
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
  webhookEnabled: false,
  webhookUrl: "",
  webhookEvents: ["repository.published", "review.created"],
  retentionDays: 30,
  shareDashboard: false,
  allowInvites: true,
};

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
    <label className="flex items-start gap-3 rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 py-2">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-white"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex-1">
        <span className="block text-sm text-zinc-100">{label}</span>
        {description ? (
          <span className="block text-xs text-zinc-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function SettingsClient() {
  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [repos, setRepos] = useState<RepoVisibility[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      if (!supabase) {
        setError(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setError("Please sign in to manage settings.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/settings/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      if (!mounted) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Unable to load settings.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...(data?.settings ?? {}) }));
      await loadRepos(accessToken);
      setLoading(false);
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const update = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const loadRepos = async (accessToken: string) => {
    setLoadingRepos(true);
    const res = await fetch(`/api/repositories/mine?accessToken=${accessToken}`);
    if (res.ok) {
      const data = await res.json();
      setRepos((data?.repos ?? []) as RepoVisibility[]);
    }
    setLoadingRepos(false);
  };

  const updateRepoVisibility = async (repoId: string, isPublic: boolean) => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please sign in to update repository visibility.");
      return;
    }

    const res = await fetch("/api/repositories/update-visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, repoId, isPublic }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to update repository visibility.");
      return;
    }

    const data = await res.json();
    const updated = data?.repo as RepoVisibility | undefined;
    if (updated) {
      setRepos((prev) => prev.map((repo) => (repo.id === updated.id ? updated : repo)));
    }
  };

  const saveSettings = async () => {
    if (!supabase) return;
    setSaving(true);
    setStatus(null);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError("Please sign in to save settings.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/settings/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, settings }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to save settings.");
      setSaving(false);
      return;
    }

    setStatus("Settings updated.");
    setSaving(false);
  };

  const testWebhook = async () => {
    if (!supabase) return;
    setTestingWebhook(true);
    setStatus(null);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError("Please sign in to test webhooks.");
      setTestingWebhook(false);
      return;
    }

    const res = await fetch("/api/settings/test-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, webhookUrl: settings.webhookUrl }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Webhook test failed.");
      setTestingWebhook(false);
      return;
    }

    setStatus("Webhook delivered.");
    setTestingWebhook(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-10 text-sm text-zinc-500">
        Loading settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl py-10">
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  const provideFeedback = () => {
    router.push("/feedback");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="subtle">Settings</Badge>
          <h1 className="text-2xl font-semibold text-white">
            Workspace controls
          </h1>
          <Button variant="ghost" onClick={provideFeedback}>
            Provide FeedBack
          </Button>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {status ? (
        <Alert>
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={settings.fullName}
                onChange={(event) => update("fullName", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={settings.username}
                onChange={(event) => update("username", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input
                value={settings.avatarUrl}
                onChange={(event) => update("avatarUrl", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <Toggle
              label="2FA required for admins"
              description="Protect admin accounts with extra verification."
              checked
              onChange={() => {}}
            />
            <Toggle
              label="Session timeout"
              description="Force re-authentication after 12 hours."
              checked
              onChange={() => {}}
            />
            <Button size="sm" variant="outline">
              Sign out all sessions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Toggle
              label="Email notifications"
              description="Send scan alerts to your inbox."
              checked={settings.emailNotifications}
              onChange={(value) => update("emailNotifications", value)}
            />
            <Toggle
              label="High severity alerts"
              description="Fire immediately for critical issues."
              checked={settings.notifyHigh}
              onChange={(value) => update("notifyHigh", value)}
            />
            <Toggle
              label="Medium severity alerts"
              description="Notify when medium risks appear."
              checked={settings.notifyMedium}
              onChange={(value) => update("notifyMedium", value)}
            />
            <Toggle
              label="Low severity alerts"
              description="Bundle lower priority warnings."
              checked={settings.notifyLow}
              onChange={(value) => update("notifyLow", value)}
            />
            <Toggle
              label="Weekly digest"
              description="Summary of scans every Friday."
              checked={settings.weeklyDigest}
              onChange={(value) => update("weeklyDigest", value)}
            />
            <Toggle
              label="Daily digest"
              description="Daily summary of reviews and scans."
              checked={settings.dailyDigest}
              onChange={(value) => update("dailyDigest", value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scan automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Toggle
              label="Auto-scan on push"
              description="Trigger scans for every commit."
              checked={settings.scanOnPush}
              onChange={(value) => update("scanOnPush", value)}
            />
            <Toggle
              label="Auto-scan on pull request"
              description="Gate merges with AI review."
              checked={settings.scanOnPr}
              onChange={(value) => update("scanOnPr", value)}
            />
            <Toggle
              label="Fail build on high severity"
              description="Stop the pipeline on critical issues."
              checked={settings.failOnHigh}
              onChange={(value) => update("failOnHigh", value)}
            />
            <Toggle
              label="Fail build on medium severity"
              description="Block merges for medium risks."
              checked={settings.failOnMedium}
              onChange={(value) => update("failOnMedium", value)}
            />
            <div className="space-y-2">
              <Label>Ignored paths</Label>
              <textarea
                className="min-h-[96px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                value={settings.ignoredPaths}
                onChange={(event) => update("ignoredPaths", event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Risk threshold</Label>
                <select
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  value={settings.riskThreshold}
                  onChange={(event) =>
                    update(
                      "riskThreshold",
                      event.target.value as SettingsState["riskThreshold"],
                    )
                  }
                >
                  <option value="low">Low and above</option>
                  <option value="medium">Medium and above</option>
                  <option value="high">High only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Report format</Label>
                <select
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  value={settings.reportFormat}
                  onChange={(event) =>
                    update(
                      "reportFormat",
                      event.target.value as SettingsState["reportFormat"],
                    )
                  }
                >
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                  <option value="terminal">Terminal</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>AI model</Label>
              <select
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                value={settings.aiModel}
                onChange={(event) =>
                  update(
                    "aiModel",
                    event.target.value as SettingsState["aiModel"],
                  )
                }
              >
                <option value="mistral-large-latest">Mistral Large</option>
                <option value="mistral-medium-latest">Mistral Medium</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Toggle
              label="Enable webhook delivery"
              description="Push scan events to your internal tooling."
              checked={settings.webhookEnabled}
              onChange={(value) => update("webhookEnabled", value)}
            />
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={settings.webhookUrl}
                onChange={(event) => update("webhookUrl", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook events</Label>
              <div className="grid gap-2">
                {[
                  { id: "repository.published", label: "Repository published" },
                  { id: "review.created", label: "Review created" },
                ].map((event) => (
                  <label key={event.id} className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={settings.webhookEvents.includes(event.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...settings.webhookEvents, event.id]
                          : settings.webhookEvents.filter((item) => item !== event.id);
                        update("webhookEvents", next);
                      }}
                    />
                    {event.label}
                  </label>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={testWebhook}
              disabled={testingWebhook || !settings.webhookUrl}
            >
              {testingWebhook ? "Testing..." : "Send test event"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repository visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRepos ? (
              <p className="text-sm text-zinc-500">Loading repositories...</p>
            ) : repos.length === 0 ? (
              <p className="text-sm text-zinc-500">No repositories submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {repos.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-zinc-100">{repo.name}</p>
                      <p className="text-xs text-zinc-500">{repo.repo_url}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={repo.is_public ? "default" : "outline"}
                      onClick={() => updateRepoVisibility(repo.id, !repo.is_public)}
                    >
                      {repo.is_public ? "Public" : "Private"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Retention (days)</Label>
              <Input
                type="number"
                min={7}
                max={365}
                value={settings.retentionDays}
                onChange={(event) =>
                  update("retentionDays", Number(event.target.value))
                }
              />
            </div>
            <Toggle
              label="Share dashboard with team"
              description="Allow org members to view scan metrics."
              checked={settings.shareDashboard}
              onChange={(value) => update("shareDashboard", value)}
            />
            <Toggle
              label="Allow team invites"
              description="Enable admins to invite new members."
              checked={settings.allowInvites}
              onChange={(value) => update("allowInvites", value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <p className="text-zinc-100">Pro trial</p>
            <p>Unlimited scans, AI refactors, CI/CD gating.</p>
            <Button size="sm" variant="outline" onClick={openPortal}>
              Manage billing
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
