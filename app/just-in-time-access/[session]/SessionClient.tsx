"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type SessionState = {
  sessionId: string;
  status: string;
  repoId?: string | null;
  createdAt?: string;
};

export default function SessionClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jit/${sessionId}`);
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const callAction = async (action: string, body?: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jit/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!session && loading)
    return <p className="text-sm text-muted-foreground">Loading session...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-4 bg-card">
        <p className="text-sm">
          Session: <strong>{sessionId}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Status: {session?.status ?? "unknown"}
        </p>
        {session?.repoId && (
          <p className="text-sm text-muted-foreground">
            Repo: {session.repoId}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => callAction("start")} disabled={loading}>
          Start
        </Button>
        <Button
          onClick={() => callAction("extend", { minutes: 30 })}
          disabled={loading}
        >
          Extend 30m
        </Button>
        <Button
          variant="destructive"
          onClick={() => callAction("revoke")}
          disabled={loading}
        >
          Revoke
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}
