"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Github,
  ServerCog,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/app/lib/supabase";
import type { AccessSession } from "../types";

function formatStatus(session: AccessSession) {
  if (session.status === "revoked") return "Revoked";
  if (session.status === "expired" || session.expiresInMinutes <= 0) return "Expired";
  return "Active";
}

export default function SessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<AccessSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const nextToken = sessionData.session?.access_token ?? null;
      if (!mounted) return;

      setAccessToken(nextToken);
      if (!nextToken) {
        setLoading(false);
        setError("Sign in again to load this session.");
        return;
      }

      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/jit/${sessionId}?accessToken=${encodeURIComponent(nextToken)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!mounted) return;

      if (!res.ok) {
        setSession(null);
        setError(data?.error ?? "Unable to load session.");
        setLoading(false);
        return;
      }

      setSession((data?.session ?? null) as AccessSession | null);
      setLoading(false);
    };

    init();
    return () => {
      mounted = false;
    };
  }, [sessionId, supabase]);

  const callAction = async (action: "start" | "extend" | "revoke", minutes?: number) => {
    if (!accessToken) return;

    setLoading(true);
    const res = await fetch(`/api/jit/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, action, minutes }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "Unable to update session.");
      setLoading(false);
      return;
    }

    if (action === "revoke") {
      router.push("/just-in-time-access");
      return;
    }

    setSession((data?.session ?? null) as AccessSession | null);
    setLoading(false);
  };

  const detailRows = useMemo(
    () =>
      session
        ? [
            { label: "Repository", value: session.repoName },
            { label: "Environment slug", value: session.environmentSlug },
            { label: "Region", value: session.environmentRegion },
            { label: "Runtime", value: session.sandboxRuntime },
            { label: "Branch", value: session.branchName },
            { label: "Access level", value: session.accessType },
          ]
        : [],
    [session],
  );

  if (!session) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="px-0">
          <Link href="/just-in-time-access">
            <ArrowLeft className="h-4 w-4" />
            Back to sessions
          </Link>
        </Button>
        <div className="rounded-3xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {loading ? "Loading session" : "Session not found"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ??
              "This sandbox session may not exist, or you may not have access to it."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/just-in-time-access")} className="px-0">
        <ArrowLeft className="h-4 w-4" />
        Back to sessions
      </Button>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sandbox session
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {session.environmentName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Repo-linked just-in-time access for {session.repoName}. Review the
                environment settings, current scope, and session controls before entering.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-border bg-background text-foreground">
              {formatStatus(session)}
            </Badge>
            <Button asChild variant="outline">
              <a href={session.repoUrl} target="_blank" rel="noreferrer">
                View Repo
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40">
              <Clock3 className="h-5 w-5 text-foreground" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Remaining access
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {session.expiresInMinutes} min
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40">
              <Github className="h-5 w-5 text-foreground" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Repository
            </p>
            <p className="text-lg font-semibold text-foreground">{session.repoName}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40">
              <ServerCog className="h-5 w-5 text-foreground" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Runtime
            </p>
            <p className="text-lg font-semibold text-foreground">{session.sandboxRuntime}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Sandbox Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {detailRows.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-muted/30 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Reason for access
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground">{session.reason}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Last synced
              </p>
              <p className="mt-2 text-sm text-foreground">
                {new Date(session.lastSyncedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void callAction("extend", 30)}
                disabled={session.status === "revoked" || loading}
              >
                Extend 30m
              </Button>
              <Button
                variant="secondary"
                onClick={() => void callAction("start")}
                disabled={session.status === "revoked" || loading}
              >
                <TimerReset className="h-4 w-4" />
                Refresh session
              </Button>
              <Button
                variant="destructive"
                onClick={() => void callAction("revoke")}
                disabled={loading}
              >
                Revoke
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
