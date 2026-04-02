"use client";

import { useMemo, useState } from "react";
import { Clock3, ShieldCheck, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { mockAccessSessions } from "./data";
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
  const [sessions, setSessions] = useState<AccessSession[]>(mockAccessSessions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sortedSessions = useMemo(
    () => [...sessions].sort(sortSessions),
    [sessions],
  );

  const handleRequestAccess = (values: AccessRequestForm) => {
    const resourceName =
      values.resourceType === "Database"
        ? "Production Database"
        : values.resourceType === "Admin Panel"
          ? "Admin Panel"
          : "Staging API";

    const nextSession: AccessSession = {
      id: `session-${Date.now()}`,
      resourceName,
      resourceType: values.resourceType,
      accessType: values.accessType,
      status: "active",
      grantedTo: "you@company.com",
      startedMinutesAgo: 0,
      expiresInMinutes: values.durationMinutes,
    };

    setSessions((prev) => [nextSession, ...prev]);
  };

  const handleOpenSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId && session.status === "expired"
          ? { ...session, status: "active", expiresInMinutes: 15 }
          : session,
      ),
    );
  };

  const handleExtendSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              status: "active",
              expiresInMinutes:
                (session.expiresInMinutes > 0 ? session.expiresInMinutes : 0) + 30,
            }
          : session,
      ),
    );
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const activeSessions = sortedSessions.filter((session) => session.status === "active");
  const expiredSessions = sortedSessions.length - activeSessions.length;
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
              <Button onClick={() => setIsDialogOpen(true)} className="sm:w-fit">
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Access Sessions
              </h2>
              <p className="text-sm text-muted-foreground">
                Review currently granted access and act before sessions expire.
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              New Request
            </Button>
          </div>

          {sortedSessions.length === 0 ? (
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
