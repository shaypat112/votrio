"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { createClient } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DemoAccessStatus = {
  verified: boolean;
  locked: boolean;
  attempts: number;
  remainingAttempts: number;
  lockedAt: string | null;
};

export default function AccessCodeClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<DemoAccessStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      if (!mounted) return;

      if (!token) {
        router.replace("/auth");
        return;
      }

      setAccessToken(token);
      const res = await fetch(
        `/api/demo-access?accessToken=${encodeURIComponent(token)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!mounted) return;

      if (!res.ok) {
        setError(data?.error ?? "Unable to load access status.");
        setLoading(false);
        return;
      }

      const nextStatus = (data?.status ?? null) as DemoAccessStatus | null;
      setStatus(nextStatus);
      setLoading(false);

      if (nextStatus?.verified) {
        router.replace("/dashboard");
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleSubmit = async () => {
    if (!accessToken || !code.trim()) return;

    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/demo-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, code }),
    });
    const data = await res.json().catch(() => ({}));
    const nextStatus = (data?.status ?? null) as DemoAccessStatus | null;
    setStatus(nextStatus);
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Incorrect access code.");
      return;
    }

    router.replace("/dashboard");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border border-zinc-800 shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-between gap-3">
            <Button asChild variant="ghost" size="sm" className="px-2">
              <Link href="/" className="inline-flex items-center gap-2">
                <ArrowLeft size={14} />
                Back home
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Demo Access Code</CardTitle>
            <CardDescription className="text-sm">
              Enter the demo gate code to unlock the product after sign-in.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Checking access status...</p>
          ) : (
            <>
              <div className="space-y-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Enter access code"
                  disabled={Boolean(status?.locked) || submitting}
                />
                <p className="text-xs text-zinc-500">
                  {status?.locked
                    ? "This account is locked out of the demo."
                    : `${status?.remainingAttempts ?? 3} attempt(s) remaining.`}
                </p>
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <Button
                className="w-full"
                onClick={() => void handleSubmit()}
                disabled={loading || submitting || Boolean(status?.locked) || !code.trim()}
              >
                {submitting ? "Checking..." : "Unlock Demo"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
