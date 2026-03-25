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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200">
      <header className="border-b border-zinc-800/70">
        <div className="flex h-14 items-center justify-between px-6">
          <Link
            href="/"
            className="text-sm font-semibold text-white tracking-wide"
          >
            votrio
          </Link>

          <nav className="flex items-center gap-3">
            {!loading && user ? (
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
                    <Link href="/submit-repo"> Manual Code Review </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/documentation">Docs</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/documentation"
                  className="text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Docs
                </Link>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-zinc-700/70 text-zinc-200 hover:bg-zinc-800"
                >
                  <Link href="/auth">Sign in</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
