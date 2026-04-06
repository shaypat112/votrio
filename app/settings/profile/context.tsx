"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettingsState = {
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

export type AdminState = {
  isAdmin: boolean;
  profileUsername: string | null;
  githubLogin: string | null;
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
  webhookEvents: ["scan.completed"],
  retentionDays: 30,
};

// ─── Context shape ─────────────────────────────────────────────────────────────

type SettingsContextValue = {
  settings: SettingsState;
  update: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => void;
  save: () => Promise<void>;
  saving: boolean;
  loading: boolean;
  error: string | null;
  status: string | null;
  setError: (msg: string | null) => void;
  setStatus: (msg: string | null) => void;
  accessToken: string | null;
  admin: AdminState;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminState>({
    isAdmin: false,
    profileUsername: null,
    githubLogin: null,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!supabase) {
        setError("Supabase not configured.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        setError("Please sign in to manage settings.");
        setLoading(false);
        return;
      }

      setAccessToken(token);

      const res = await fetch("/api/settings/load", {
        method: "POST",
        headers: buildAuthHeaders(token, { "Content-Type": "application/json" }),
      });

      if (!mounted) return;

      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...(data?.settings ?? {}) }));
        setAdmin({
          isAdmin: Boolean(data?.admin?.isAdmin),
          profileUsername:
            typeof data?.admin?.profileUsername === "string"
              ? data.admin.profileUsername
              : null,
          githubLogin:
            typeof data?.admin?.githubLogin === "string"
              ? data.admin.githubLogin
              : null,
        });
      }

      setLoading(false);
    };

    load();
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

  const save = async () => {
    if (!supabase) return;
    setSaving(true);
    setStatus(null);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError("Please sign in to save settings.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/settings/save", {
      method: "POST",
      headers: buildAuthHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ settings }),
    });

    if (res.ok) {
      setStatus("Changes saved.");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to save settings.");
    }

    setSaving(false);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        update,
        save,
        saving,
        loading,
        error,
        status,
        setError,
        setStatus,
        accessToken,
        admin,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
