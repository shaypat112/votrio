"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, ShieldCheck, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { buildAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { AccessSessionCard } from "./components/AccessSessionCard";
import { EmptySessionsState } from "./components/EmptySessionsState";
import { RequestAccessDialog } from "./components/RequestAccessDialog";
import type { AccessRequestForm, AccessSession } from "./types";

function sortSessions(a: AccessSession, b: AccessSession) {
  if (a.status !== b.status) {
    return a.status === "active" ? -1 : 1;
  }
  return a.expiresInMinutes - b.expiresInMinutes;
}

export default function JustInTimeAccessClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState<AccessSession[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedSessions = useMemo(
    () => [...sessions].sort(sortSessions),
    [sessions],
  );

  const loadSessions = async (token: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/jit", {
      headers: buildAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "Unable to load access sessions.");
      setSessions([]);
      setLoading(false);
      return;
    }

    setSessions((data?.sessions ?? []) as AccessSession[]);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const nextToken = sessionData.session?.access_token ?? null;
      if (!mounted) return;

      setAccessToken(nextToken);
      if (!nextToken) {
        setSessions([]);
        setLoading(false);
        return;
      }

      await loadSessions(nextToken);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextToken = session?.access_token ?? null;
        setAccessToken(nextToken);
        if (!nextToken) {
          setSessions([]);
          setLoading(false);
          return;
        }
        void loadSessions(nextToken);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleRequestAccess = async (values: AccessRequestForm) => {
    if (!accessToken) {
      return "Sign in again to create a JIT session.";
    }

    const res = await fetch("/api/jit", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        repoId: values.repoId,
        resourceType: values.resourceType,
        accessType: values.accessType,
        durationMinutes: values.durationMinutes,
        reason: values.reason,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return data?.error ?? "Unable to create access session.";
    }

    if (data?.session?.id) {
      await loadSessions(accessToken);
      router.push(`/just-in-time-access/${data.session.id}`);
    }

    return null;
  };

  const handleOpenSession = (sessionId: string) => {
    router.push(`/just-in-time-access/${sessionId}`);
  };

  const handleExtendSession = async (sessionId: string) => {
    if (!accessToken) return;

    await fetch(`/api/jit/${sessionId}`, {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ action: "extend", minutes: 30 }),
    });
    await loadSessions(accessToken);
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!accessToken) return;

    await fetch(`/api/jit/${sessionId}`, {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ action: "revoke" }),
    });
    await loadSessions(accessToken);
  };

  const activeSessions = sortedSessions.filter(
    (session) => session.status === "active",
  );
  const expiredSessions = sortedSessions.filter(
    (session) => session.status === "expired" || session.status === "revoked",
  ).length;
  const totalRemainingMinutes = activeSessions.reduce(
    (total, session) => total + session.expiresInMinutes,
    0,
  );

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="overflow-hidden rounded-3xl border border-border bg-[linear-gradient(to_bottom_right,color-mix(in_oklab,var(--background)_92%,var(--muted)),var(--background))]">
            <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Access Control
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Just-in-Time Access
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Temporary, secure access sessions with automatic expiration
                </p>
              </div>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="sm:w-fit"
              >
                Request Access
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40">
                  <ShieldCheck className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Active Sessions
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {activeSessions.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40">
                  <TimerReset className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Expired Sessions
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {expiredSessions}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40">
                  <Clock3 className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Remaining Minutes
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {totalRemainingMinutes}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Loading JIT sessions...
            </div>
          ) : sortedSessions.length === 0 ? (
            <EmptySessionsState onRequestAccess={() => setIsDialogOpen(true)} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedSessions.map((session) => (
                <AccessSessionCard
                  key={session.id}
                  session={session}
                  onOpen={handleOpenSession}
                  onExtend={handleExtendSession}
                  onRevoke={handleRevokeSession}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <RequestAccessDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleRequestAccess}
      />
    </>
  );
}
