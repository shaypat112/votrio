"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  LockKeyhole,
} from "lucide-react";
import { cn } from "../lib/utils";
import { SettingsProvider, useSettings } from "./profile/context";
import { useTheme } from "@/app/components/theme-provider";

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

const ADMIN_SECTION = { id: "admin", label: "Admin", icon: LockKeyhole } as const;

export type SectionId =
  | (typeof NAV_SECTIONS)[number]["id"]
  | typeof ADMIN_SECTION.id;

function Sidebar({ active }: { active: SectionId }) {
  const { save, saving, admin } = useSettings();
  const sections = admin.isAdmin ? [...NAV_SECTIONS, ADMIN_SECTION] : NAV_SECTIONS;

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-background sm:flex">
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/settings?section=${id}`}
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
          </Link>
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
  const searchParams = useSearchParams();
  const { loading } = useSettings();
  const { theme } = useTheme();

  const active = (searchParams?.get("section") as SectionId) ?? "account";

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
      style={{
        fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
        // override the background CSS variable locally so settings area is true black in dark mode
        ...(theme === "dark" ? { ["--background"]: "#000" } : {}),
      }}
    >
      <Sidebar active={active} />

      <main className="flex-1 bg-background px-6 py-10 sm:px-10">
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
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <SettingsInner>{children}</SettingsInner>
      </Suspense>
    </SettingsProvider>
  );
}
