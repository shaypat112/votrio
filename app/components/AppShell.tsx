"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      data: Record<string, any>;
      read_at: string | null;
      created_at: string;
    }>
  >([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

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

  const displayName = user ? getDisplayName(user) : "";
  const avatarUrl = user ? getAvatarUrl(user) : null;
  const initials = displayName
    .split(" ")
    .filter((part: any) => part.length > 0)
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200">
      <header className="border-b border-zinc-800/70">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <Link
                href="/"
                className="text-sm font-semibold text-white tracking-wide"
              >
                votrio
              </Link>
              <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-zinc-400">
                <Link
                  href="/profile"
                  className="hover:text-zinc-100 transition-colors"
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard"
                  className="hover:text-zinc-100 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/repositories"
                  className="hover:text-zinc-100 transition-colors"
                >
                  Repositories
                </Link>
                <Link
                  href="/documentation"
                  className="hover:text-zinc-100 transition-colors"
                >
                  Docs
                </Link>
              </nav>
            </div>

            {!loading && user ? (
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800/70 bg-zinc-950 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900">
                      <Bell size={16} />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                          {unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifLoading ? (
                      <div className="px-3 py-2 text-xs text-zinc-500">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-zinc-500">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-auto">
                        {notifications.map((item) => (
                          <div
                            key={item.id}
                            className="px-3 py-2 text-xs text-zinc-200"
                          >
                            <div className="font-medium">
                              {item.type.replace(".", " ")}
                            </div>
                            <div className="text-zinc-400">
                              {item.data?.repo_name ??
                                item.data?.repo_url ??
                                "Activity update"}
                            </div>
                            <div className="text-[10px] text-zinc-500">
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 rounded-full border border-zinc-800/70 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-200">
                          {initials || "U"}
                        </span>
                      )}
                      <span className="hidden sm:inline text-xs font-medium text-zinc-300">
                        {displayName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-zinc-700/70 text-zinc-200 hover:bg-zinc-800"
              >
                <Link href="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
