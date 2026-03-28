"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: {
    ai_summary?: string;
    list?: Array<any>;
    files?: Array<{ path: string }>;
  } | null;
};

export default function ReportDetailClient({ repoSlug }: { repoSlug: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const repo = decodeURIComponent(repoSlug);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        if (mounted) {
          setError("Please sign in to view scan reports.");
          setLoading(false);
        }
        return;
      }

      const res = await fetch(
        `/api/reports/repo?accessToken=${accessToken}&repo=${encodeURIComponent(repo)}`,
      );

      if (!mounted) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Unable to load scan reports.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setScans((data?.scans ?? []) as ScanRow[]);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [repoSlug, supabase]);

  const latest = scans[0];

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading scan report...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-400">{error}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/profile">Back to profile</Link>
        </Button>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">No scan history for this repository yet.</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/profile">Back to profile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Scan report</p>
          <h1 className="text-2xl font-semibold text-white">{latest.repo}</h1>
          <p className="text-sm text-zinc-400">
            Latest scan from {new Date(latest.created_at).toLocaleString()}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/profile">Back to profile</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Severity</p>
              <p className="text-lg font-semibold text-white">{latest.severity}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Issues</p>
              <p className="text-lg font-semibold text-white">{latest.issues}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Score</p>
              <p className="text-lg font-semibold text-white">{latest.score}</p>
            </div>
          </div>
          <Separator className="bg-zinc-800" />
          <p className="text-sm text-zinc-400">
            {latest.findings?.ai_summary ?? "No AI summary available yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">AI suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-300">
          {latest.findings?.list?.length ? (
            <div className="space-y-3">
              {latest.findings.list.slice(0, 10).map((item, index) => (
                <div key={`${latest.repo}-${index}`} className="rounded-md border border-zinc-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-200">{item.type ?? "Issue"}</div>
                    {item.severity ? (
                      <Badge variant="outline">{item.severity}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{item.message ?? "Review details"}</p>
                  {item.file ? (
                    <p className="text-xs text-zinc-500 mt-1">
                      {item.file}:{item.line ?? "-"}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No AI suggestions captured yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Recent scans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scans.map((scan) => (
            <div key={`${scan.repo}-${scan.created_at}`} className="flex items-center justify-between text-xs text-zinc-400">
              <span>{new Date(scan.created_at).toLocaleDateString()}</span>
              <span>{scan.severity}</span>
              <span>{scan.issues} issues</span>
              <span>Score {scan.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
