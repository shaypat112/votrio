"use client";

import { useState } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import {
  User,
  Bell,
  Shield,
  Zap,
  Webhook,
  Eye,
  Database,
  Users,
  CreditCard,
} from "lucide-react";
import { cn } from "../lib/utils";
import { SettingsProvider, useSettings } from "./profile/context";

const NAV_SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "scanning", label: "Scanning", icon: Zap },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "repos", label: "Repositories", icon: Eye },
  { id: "retention", label: "Data", icon: Database },
  { id: "teams", label: "Teams", icon: Users },
  { id: "plan", label: "Plan", icon: CreditCard },
] as const;

export type SectionId = (typeof NAV_SECTIONS)[number]["id"];

function Sidebar({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  const { save, saving } = useSettings();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-white/[0.06] bg-black/80 backdrop-blur-xl">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white">
          <div className="h-2.5 w-2.5 rounded-sm bg-black" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">
          Settings
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
              active === id
                ? "bg-white/[0.08] text-white"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active === id
                  ? "text-white"
                  : "text-zinc-600 group-hover:text-zinc-400",
              )}
            />
            {label}
            {active === id && (
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-600" />
            )}
          </button>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <button
          onClick={save}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm font-medium text-black",
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
  );
}

function Banners() {
  const { status, error } = useSettings();

  return (
    <div className="space-y-2">
      {status && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400">
          <Check className="h-4 w-4 shrink-0" /> {status}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          <span className="h-4 w-4 shrink-0 text-red-400">!</span> {error}
        </div>
      )}
    </div>
  );
}

function SettingsInner({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<SectionId>("account");
  const { loading } = useSettings();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-black text-zinc-100"
      style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}
    >
      <Sidebar active={active} onSelect={setActive} />

      <main className="ml-56 flex-1 px-10 py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <Banners />
          {children}
        </div>
      </main>
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <SettingsInner>{children}</SettingsInner>
    </SettingsProvider>
  );
}
