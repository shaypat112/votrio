"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/app/lib/supabase";

const fallbackScans = [
  {
    repo: "shaypat112/votrio",
    date: "Today",
    severity: "high",
    issues: 4,
    score: 74,
  },
  {
    repo: "votrio/docs",
    date: "Yesterday",
    severity: "medium",
    issues: 2,
    score: 62,
  },
  {
    repo: "votrio/cli",
    date: "2 days ago",
    severity: "low",
    issues: 1,
    score: 38,
  },
];

const metrics = [
  { label: "Repo health", value: "78", suffix: "/100" },
  { label: "Active scans", value: "3" },
  { label: "High risk", value: "1" },
];

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: { ai_summary?: string };
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const [scans, setScans] = useState(fallbackScans);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("scan_history")
        .select("repo, created_at, severity, issues, score, findings")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!mounted) return;

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      const mapped = (data as ScanRow[]).map((row) => ({
        repo: row.repo,
        date: formatDate(row.created_at),
        severity: row.severity,
        issues: row.issues,
        score: row.score,
      }));

      setScans(mapped);
      setAiInsight((data as ScanRow[])[0]?.findings?.ai_summary ?? null);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Badge variant="subtle">Dashboard</Badge>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">
            Repo health overview
          </h1>
          <p className="text-sm text-zinc-400">
            Track recent scans, risk levels, and AI recommendations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm">Start scan</Button>
          <Button size="sm" variant="outline">
            View reports
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl text-white">
                {metric.value}
                {metric.suffix ? (
                  <span className="text-sm text-zinc-500">{metric.suffix}</span>
                ) : null}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Alert>
        <AlertTitle>AI refactor suggestions ready</AlertTitle>
        <AlertDescription>
          {aiInsight ??
            "3 improvements detected in your last scan. Review fixes before your next release."}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Latest scans</CardTitle>
          <CardDescription>
            Summary of your most recent repository checks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={`${scan.repo}-${scan.date}`}>
                  <TableCell className="font-medium text-zinc-100">
                    {scan.repo}
                  </TableCell>
                  <TableCell>{scan.date}</TableCell>
                  <TableCell>{scan.issues}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{scan.severity}</Badge>
                  </TableCell>
                  <TableCell>{scan.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && (
            <div className="mt-3 text-xs text-zinc-500">
              Loading scan history from Supabase...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
