"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck2, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DemoAccessStatus = {
  verified: boolean;
  state: "not_requested" | "pending" | "approved" | "rejected";
  requestedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  approverUsername: string | null;
  company: string | null;
  useCase: string | null;
  note: string | null;
  requestId: string | null;
};

type PendingRequest = {
  id: string;
  createdAt: string;
  requesterId: string;
  requesterName: string;
  requesterUsername: string | null;
  company: string | null;
  useCase: string | null;
  note: string | null;
  status: string;
};

type DemoAccessResponse = {
  status: DemoAccessStatus;
  approverUsername: string | null;
  isApprover: boolean;
  pendingRequests: PendingRequest[];
};

const DEFAULT_STATUS: DemoAccessStatus = {
  verified: false,
  state: "not_requested",
  requestedAt: null,
  approvedAt: null,
  rejectedAt: null,
  approverUsername: null,
  company: null,
  useCase: null,
  note: null,
  requestId: null,
};

export default function AccessCodeClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<DemoAccessStatus>(DEFAULT_STATUS);
  const [approverUsername, setApproverUsername] = useState<string | null>(null);
  const [isApprover, setIsApprover] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [note, setNote] = useState("");
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
      const res = await fetch("/api/demo-access", {
        headers: buildAuthHeaders(token),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<DemoAccessResponse> & {
        error?: string;
      };
      if (!mounted) return;

      if (!res.ok) {
        setError(data?.error ?? "Unable to load demo access.");
        setLoading(false);
        return;
      }

      const nextStatus = data.status ?? DEFAULT_STATUS;
      setStatus(nextStatus);
      setApproverUsername(data.approverUsername ?? null);
      setIsApprover(Boolean(data.isApprover));
      setPendingRequests(data.pendingRequests ?? []);
      setCompany(nextStatus.company ?? "");
      setUseCase(nextStatus.useCase ?? "");
      setNote(nextStatus.note ?? "");
      setLoading(false);

      if (nextStatus.verified) {
        router.replace("/dashboard");
      }
    };

    void init();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleRequestAccess = async () => {
    if (!accessToken) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/demo-access", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        action: "request",
        company,
        useCase,
        note,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Unable to send demo request.");
      return;
    }

    setStatus(data?.status ?? DEFAULT_STATUS);
    setApproverUsername(data?.approverUsername ?? approverUsername);
  };

  const handleReview = async (requestId: string, action: "approve" | "reject") => {
    if (!accessToken) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/demo-access", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        action,
        requestId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Unable to review request.");
      return;
    }

    setPendingRequests(data?.pendingRequests ?? []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const renderStatusCopy = () => {
    if (status.verified || status.state === "approved") {
      return "Your demo request was approved. Redirecting you to the dashboard.";
    }

    if (status.state === "pending") {
      return `Your request is waiting for approval from @${status.approverUsername ?? approverUsername ?? "the approver"}.`;
    }

    if (status.state === "rejected") {
      return "Your request was declined. Update the context below and send a new request.";
    }

    return `Book a demo to request access. Approval is handled by @${approverUsername ?? "the approver"}.`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-3xl border border-zinc-800 shadow-xl">
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
            {isApprover ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <CalendarCheck2 className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {isApprover ? "Demo Approval Queue" : "Book A Demo"}
            </CardTitle>
            <CardDescription className="text-sm">
              {renderStatusCopy()}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading demo access...</p>
          ) : (
            <>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              {isApprover ? (
                <div className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No pending demo requests right now.
                    </p>
                  ) : (
                    pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-zinc-800 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-sm">
                              {request.requesterName}
                              {request.requesterUsername
                                ? ` (@${request.requesterUsername})`
                                : ""}
                            </div>
                            <div className="text-xs text-zinc-500">
                              Requested {new Date(request.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Clock3 className="h-3.5 w-3.5" />
                            Pending
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Company
                            </div>
                            <div className="text-sm text-zinc-200">
                              {request.company ?? "Not provided"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Use Case
                            </div>
                            <div className="text-sm text-zinc-200">
                              {request.useCase ?? "Not provided"}
                            </div>
                          </div>
                        </div>

                        {request.note ? (
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Notes
                            </div>
                            <div className="text-sm text-zinc-300 whitespace-pre-wrap">
                              {request.note}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex gap-3">
                          <Button
                            onClick={() => void handleReview(request.id, "approve")}
                            disabled={submitting}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleReview(request.id, "reject")}
                            disabled={submitting}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : status.state === "pending" ? (
                <div className="rounded-2xl border border-zinc-800 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-200">
                    <Clock3 className="h-4 w-4" />
                    Waiting for approval
                  </div>
                  <p className="text-sm text-zinc-500">
                    We sent your request to @{status.approverUsername ?? approverUsername ?? "the approver"}.
                  </p>
                  {status.requestedAt ? (
                    <p className="text-xs text-zinc-600">
                      Requested {new Date(status.requestedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  {status.state === "rejected" ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <div className="flex items-center gap-2 text-sm text-amber-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Request declined
                      </div>
                      <p className="mt-2 text-sm text-amber-100/80">
                        Add a bit more context and submit again.
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Input
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      placeholder="Company or team"
                      disabled={submitting}
                    />
                    <Textarea
                      value={useCase}
                      onChange={(event) => setUseCase(event.target.value)}
                      placeholder="What do you want to scan or evaluate in the demo?"
                      disabled={submitting}
                    />
                    <Textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional context, repo URL, or timing notes"
                      disabled={submitting}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => void handleRequestAccess()}
                    disabled={submitting || !company.trim() || !useCase.trim()}
                  >
                    {submitting ? "Sending request..." : "Request demo access"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
