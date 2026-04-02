"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import {
  User,
  Bell,
  Shield,
  Zap,
  Webhook,
  Eye,
  Database,
  Palette,
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
  { id: "appearance", label: "Appearance", icon: Palette },
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
    <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur-xl sm:flex">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
          <div className="h-2.5 w-2.5 rounded-sm bg-background" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
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
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active === id
                  ? "text-accent-foreground"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {label}
            {active === id && (
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <button
          onClick={save}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background",
            "transition-all hover:opacity-90 active:scale-[0.98]",
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
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4 shrink-0" /> {status}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <span className="h-4 w-4 shrink-0 text-red-500">!</span> {error}
        </div>
      )}
    </div>
  );
}

function SettingsInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading } = useSettings();

  const active = (searchParams?.get("section") as SectionId) ?? "account";
  const onSelect = (id: SectionId) => {
    // navigate while preserving pathname; set ?section=<id>
    router.push(`?section=${id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}
    >
      <Sidebar active={active} onSelect={onSelect} />

      <main className="flex-1 bg-gradient-to-br from-background via-muted/20 to-background px-6 py-10 sm:px-10">
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
