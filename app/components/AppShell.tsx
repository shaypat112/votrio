"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase";
import { useTheme } from "@/app/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown } from "lucide-react";

function getDisplayName(user: User) {
  const meta = user.user_metadata ?? {};
  return (
    meta.full_name || meta.name || meta.user_name || user.email || "Account"
  );
}

function getAvatarUrl(user: User) {
  const meta = user.user_metadata ?? {};
  return meta.avatar_url || meta.picture || null;
}

function formatNotificationTitle(type: string) {
  switch (type) {
    case "scan.completed":
      return "Scan completed";
    case "review.created":
      return "Review created";
    case "repository.published":
      return "Repository published";
    default:
      return type.replace(".", " ");
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<
    Array<{ id: string; name: string; slug: string; role?: string }>
  >([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      data: Record<string, unknown>;
      read_at: string | null;
      created_at: string;
    }>
  >([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        return;
      }
      setNotifLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        if (mounted) setNotifLoading(false);
        return;
      }
      const res = await fetch(`/api/notifications?accessToken=${accessToken}`);
      if (!mounted) return;
      if (res.ok) {
        const data = await res.json();
        setNotifications(data?.notifications ?? []);
      }
      setNotifLoading(false);
    };

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [user, supabase]);

  useEffect(() => {
    // mark client-mounted so we can avoid rendering theme-dependent UI on the server
    setMounted(true);
  }, []);

  useEffect(() => {
    // load selected team from localStorage
    try {
      const v = window.localStorage.getItem("votrio-selected-team");
      if (v) setSelectedTeamId(v);
    } catch {}
  }, []);

  const displayName = user ? getDisplayName(user) : "";
  const avatarUrl = user ? getAvatarUrl(user) : null;
  const initials = displayName
    .split(" ")
    .filter((part: string) => part.length > 0)
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  // Teams dropdown: fetch teams for the current user and expose a selector in the header
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      try {
        const res = await fetch(`/api/teams/list?accessToken=${accessToken}`);
        if (!mounted) return;
        if (!res.ok) return;
        const json = await res.json();
        const items = json?.teams ?? [];
        setTeams(items);
        // if no selected team yet, pick first
        if (!selectedTeamId && items.length > 0) {
          setSelectedTeamId(items[0].id);
          try {
            window.localStorage.setItem("votrio-selected-team", items[0].id);
          } catch {}
        }
      } catch (e) {
        // ignore
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user, supabase, selectedTeamId]);

  const onSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    try {
      window.localStorage.setItem("votrio-selected-team", teamId);
    } catch {}
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const isMarketingRoute =
    pathname === "/" ||
    pathname?.startsWith("/landing-page") ||
    pathname?.startsWith("/auth");
  const isPublicRoute =
    isMarketingRoute ||
    pathname?.startsWith("/documentation") ||
    pathname?.startsWith("/demo");

  const getNotificationLabel = (item: (typeof notifications)[number]) => {
    const repoName = item.data?.["repo_name"];
    const repoUrl = item.data?.["repo_url"];

    if (typeof repoName === "string" && repoName.length > 0) return repoName;
    if (typeof repoUrl === "string" && repoUrl.length > 0) return repoUrl;
    return "Activity update";
  };
  const getNotificationSeverity = (item: (typeof notifications)[number]) => {
    const sev = item.data?.["severity"];
    if (typeof sev === "string" && sev.length > 0) return sev;
    return "unknown";
  };

  const getNotificationIssues = (item: (typeof notifications)[number]) => {
    const issues = item.data?.["issues"];
    if (typeof issues === "number") return issues;
    if (typeof issues === "string") {
      const n = parseInt(issues, 10);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const markAllRead = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, markAll: true }),
    });
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
  };

  useEffect(() => {
    if (loading || user || isPublicRoute) return;
    router.replace("/auth");
  }, [isPublicRoute, loading, router, user]);

  if (isMarketingRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <main>{children}</main>
      </div>
    );
  }

  if (loading && !isPublicRoute) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user && !isPublicRoute) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors mt-4 ">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Link
                  href="/profile"
                  className="transition-colors hover:text-foreground"
                >
                  Profile
                </Link>
                <Link
                  href="/repositories"
                  className="transition-colors hover:text-foreground"
                >
                  Repositories
                </Link>
                <Link
                  href="/just-in-time-access"
                  className="transition-colors hover:text-foreground"
                >
                  JIT Access
                </Link>
                <Link
                  href="/documentation"
                  className="transition-colors hover:text-foreground"
                >
                  Docs
                </Link>
                <Link
                  href="/settings"
                  className="transition-colors hover:text-foreground"
                >
                  Settings
                </Link>
                {/* Teams dropdown (moved from header right) */}
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground hover:bg-muted">
                        <span className="text-xs text-muted-foreground">
                          Teams
                        </span>
                        <span className="font-medium text-sm">
                          {teams.find((t) => t.id === selectedTeamId)?.name ??
                            "Configure"}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="bg-card text-foreground"
                    >
                      <DropdownMenuLabel>Teams</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {teams.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No teams yet
                        </div>
                      ) : (
                        teams.map((t) => (
                          <DropdownMenuItem
                            key={t.id}
                            onClick={() => onSelectTeam(t.id)}
                          >
                            {t.name}
                          </DropdownMenuItem>
                        ))
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href="/settings?section=teams">Manage teams</a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </nav>
            </div>

            {!loading && user ? (
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted">
                      <Bell size={16} />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                          {unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-72 bg-card text-foreground"
                  >
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifLoading ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-auto">
                        {notifications.map((item) => (
                          <div
                            key={item.id}
                            className="px-3 py-2 text-xs text-foreground"
                          >
                            <div className="font-medium">
                              {formatNotificationTitle(item.type)}
                            </div>
                            <div className="text-muted-foreground">
                              {getNotificationLabel(item)}
                            </div>
                            {item.type === "scan.completed" ? (
                              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                {getNotificationSeverity(item)} severity ·{" "}
                                {getNotificationIssues(item)} issues
                              </div>
                            ) : null}
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(item.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={markAllRead}>
                      Mark all read
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Teams selector removed from header right - it's available in the left nav */}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 rounded-full border border-border bg-card px-2 py-1.5 text-sm text-foreground transition hover:bg-muted">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                          {initials || "U"}
                        </span>
                      )}
                      <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
                        {displayName}
                      </span>
                      <ChevronDown className="hidden sm:inline h-3 w-3 text-muted-foreground ml-1" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-card text-foreground"
                  >
                    <DropdownMenuLabel>{displayName}</DropdownMenuLabel>

                    <DropdownMenuItem onClick={signOut}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button asChild size="sm" variant="outline">
                  <Link href="/auth">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
