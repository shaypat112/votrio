import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Clock3, ServerCog, ShieldCheck, UserRound } from "lucide-react";

import type { AccessSession } from "../types";

function formatStarted(minutes: number) {
  if (minutes < 60) {
    return `Started ${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `Started ${hours} hr ago`;
}

function formatExpiration(session: AccessSession) {
  if (session.status === "revoked") {
    return "Revoked";
  }
  if (session.status === "expired" || session.expiresInMinutes <= 0) {
    return "Expired";
  }
  return `Expires in ${session.expiresInMinutes} min`;
}

export function AccessSessionCard({
  session,
  onOpen,
  onExtend,
  onRevoke,
}: {
  session: AccessSession;
  onOpen: (sessionId: string) => void;
  onExtend: (sessionId: string) => void;
  onRevoke: (sessionId: string) => void;
}) {
  const isExpired = session.status !== "active";

  return (
    <Card className="h-full border-border bg-card shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted/40">
              <ShieldCheck className="h-5 w-5 text-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle>{session.resourceName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {session.accessType} access
              </p>
            </div>
          </div>
          <Badge
            className={
              session.status === "revoked"
                ? "border-border bg-muted text-muted-foreground"
                : isExpired
                ? "border-border bg-muted text-muted-foreground"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }
          >
            {session.status === "revoked"
              ? "Revoked"
              : isExpired
                ? "Expired"
                : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              Granted To
            </p>
            <p className="mt-2 font-medium text-foreground">{session.grantedTo}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Access Window
            </p>
            <p className="mt-2 font-medium text-foreground">
              {formatStarted(session.startedMinutesAgo)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatExpiration(session)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <ServerCog className="h-3.5 w-3.5" />
            Sandbox
          </p>
          <p className="mt-2 font-medium text-foreground">{session.environmentName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {session.environmentName} · {session.environmentRegion}
          </p>
          {session.repoName ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Repository: {session.repoName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onOpen(session.id)}>
            Open Session
            <ArrowUpRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => onExtend(session.id)} disabled={session.status === "revoked"}>
            Extend
          </Button>
          <Button variant="destructive" onClick={() => onRevoke(session.id)}>
            Revoke
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
