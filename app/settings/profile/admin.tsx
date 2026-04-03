"use client";

import { useEffect, useState } from "react";
import { useSettings } from "./context";
import { DangerButton, GhostButton, SectionCard } from "./primitives";

type AdminUser = {
  id: string;
  username: string | null;
  fullName: string | null;
  demoStatus: string;
  requestedAt: string | null;
  approvedAt: string | null;
  scanCount: number;
};

export function AdminSection() {
  const { accessToken, admin, setError, setStatus } = useSettings();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!admin.isAdmin || !accessToken) return;

    let mounted = true;
    const load = async () => {
      const res = await fetch(
        `/api/admin?accessToken=${encodeURIComponent(accessToken)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!mounted) return;

      if (res.ok) {
        setUsers(data?.users ?? []);
      } else {
        setError(data?.error ?? "Unable to load admin panel.");
      }
      setLoaded(true);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [accessToken, admin.isAdmin, setError]);

  const runAction = async (
    targetUserId: string,
    action: "approve_demo" | "reject_demo" | "revoke_demo",
  ) => {
    if (!accessToken) return;
    setWorkingId(targetUserId);
    setError(null);
    setStatus(null);

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, targetUserId, action }),
    });
    const data = await res.json().catch(() => ({}));
    setWorkingId(null);

    if (res.ok) {
      setUsers(data?.users ?? []);
      setStatus("Admin action applied.");
    } else {
      setError(data?.error ?? "Unable to apply admin action.");
    }
  };

  if (!admin.isAdmin) {
    return (
      <SectionCard
        title="Admin"
        description="This section is only available to the configured admin identity."
      >
        <p className="text-sm text-muted-foreground">
          Sign in as app user <strong>{admin.profileUsername ?? "shivang"}</strong> through
          GitHub account <strong>{admin.githubLogin ?? "shaypat112"}</strong> to access
          admin controls.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Admin panel"
      description="Control demo access and monitor user activity."
    >
      <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
        Signed in as admin <strong>{admin.profileUsername}</strong> via GitHub{" "}
        <strong>{admin.githubLogin}</strong>.
      </div>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {user.fullName ?? user.username ?? user.id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.username ? `@${user.username}` : user.id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Demo: {user.demoStatus} · Scans: {user.scanCount}
                  </div>
                  {user.requestedAt ? (
                    <div className="text-xs text-muted-foreground">
                      Requested {new Date(user.requestedAt).toLocaleString()}
                    </div>
                  ) : null}
                  {user.approvedAt ? (
                    <div className="text-xs text-muted-foreground">
                      Approved {new Date(user.approvedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <GhostButton
                    onClick={() => void runAction(user.id, "approve_demo")}
                    disabled={workingId === user.id}
                  >
                    Approve
                  </GhostButton>
                  <DangerButton
                    onClick={() => void runAction(user.id, "reject_demo")}
                    disabled={workingId === user.id}
                  >
                    Reject
                  </DangerButton>
                  <DangerButton
                    onClick={() => void runAction(user.id, "revoke_demo")}
                    disabled={workingId === user.id}
                  >
                    Revoke
                  </DangerButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
