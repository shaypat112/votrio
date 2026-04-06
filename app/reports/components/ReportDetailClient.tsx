"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, TriangleAlert } from "lucide-react";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScanFinding = {
  title?: string;
  severity?: string;
  description?: string;
  file?: string;
  path?: string;
  fix?: string;
  recommendation?: string;
  score?: number;
};

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: {
    ai_summary?: string;
    list?: ScanFinding[] | null;
  } | null;
};

function tone(severity: string) {
  if (severity === "critical" || severity === "high") return "text-red-400";
  if (severity === "medium") return "text-amber-400";
  return "text-emerald-400";
}

export function ReportDetailClient({ repo }: { repo: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [latest, setLatest] = useState<ScanRow | null>(null);
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;
      if (!accessToken) {
        if (mounted) {
          setError("Sign in to view this report.");
          setLoading(false);
        }
        return;
      }

      const res = await fetch(`/api/scans/report?repo=${encodeURIComponent(repo)}`, {
        headers: buildTeamAuthHeaders(accessToken, selectedTeamId),
      });
      const data = await res.json().catch(() => ({}));

      if (!mounted) return;

      if (!res.ok) {
        setError(data?.error ?? "Unable to load report.");
        setLoading(false);
        return;
      }

      setLatest((data?.latest ?? null) as ScanRow | null);
      setHistory((data?.scans ?? []) as ScanRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [repo, selectedTeamId, supabase]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <p className="text-sm text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  if (error || !latest) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
            Back to reports
          </Link>
        </Button>
        <Card className="border-border bg-card">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold text-foreground">
              Report not found
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {error ??
                "This repository does not have scan history in the currently selected team."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const findings = latest.findings?.list ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/reports">
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>
      </Button>

      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,var(--card),var(--background))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.1)]">
        <div className="space-y-4">
          <Badge className="border-border bg-background text-foreground">
            Repository Report
          </Badge>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              {latest.repo}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {latest.findings?.ai_summary ??
                "Latest scan summary unavailable, but the repository metadata and issue history are still available below."}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Severity
              </p>
              <p className={`mt-2 text-lg font-semibold ${tone(latest.severity)}`}>
                {latest.severity}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Issues
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{latest.issues}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Score
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{latest.score}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Last scanned
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {new Date(latest.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Top findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No structured findings were stored for this scan. The repo summary and history are still available.
              </p>
            ) : (
              findings.slice(0, 8).map((finding, index) => (
                <div key={`${finding.title ?? finding.path ?? "finding"}-${index}`} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {finding.title ?? finding.path ?? finding.file ?? "Untitled finding"}
                      </p>
                      {(finding.file || finding.path) ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {finding.file ?? finding.path}
                        </p>
                      ) : null}
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-medium ${tone(finding.severity ?? "low")}`}>
                      {(finding.severity === "critical" || finding.severity === "high") ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : (
                        <TriangleAlert className="h-4 w-4" />
                      )}
                      {(finding.severity ?? "low").toUpperCase()}
                    </div>
                  </div>
                  {finding.description ? (
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {finding.description}
                    </p>
                  ) : null}
                  {(finding.fix || finding.recommendation) ? (
                    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Suggested fix
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {finding.fix ?? finding.recommendation}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Scan history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((scan) => (
              <div key={`${scan.repo}-${scan.created_at}`} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(scan.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {scan.issues} issues · score {scan.score}
                    </p>
                  </div>
                  <Badge variant="outline">{scan.severity}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
