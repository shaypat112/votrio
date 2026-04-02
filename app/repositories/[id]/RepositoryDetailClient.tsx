"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUpRight,
  Bot,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RepoDetail = {
  id: string;
  name: string;
  repo_url: string;
  description: string | null;
  tags: string[];
  review_count: number;
  rating_avg: number;
  last_review_excerpt: string | null;
};

type Review = {
  id: string;
  repo_id: string;
  author_id: string;
  rating: number;
  title: string | null;
  body: string;
  version: number;
  created_at: string;
  edited_at: string | null;
  profiles?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
};

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: {
    ai_summary?: string;
    list?: Array<{
      file?: string;
      line?: number;
      severity?: string;
      type?: string;
      message?: string;
      score?: number;
      source?: string;
    }>;
    files?: Array<{ path: string }>;
  } | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

const SEVERITY_TONE: Record<string, string> = {
  critical:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  unknown: "border-border bg-muted text-muted-foreground",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/35 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function RepositoryDetailClient({ repoId }: { repoId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [repo, setRepo] = useState<RepoDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ rating: "5", title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [runningScan, setRunningScan] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [findingQuery, setFindingQuery] = useState("");
  const [findingSeverity, setFindingSeverity] = useState("all");
  const [findingSort, setFindingSort] = useState("severity");

  const load = async (nextPage = 1, accessToken?: string) => {
    setLoading(true);
    setError(null);

    const [repoRes, reviewsRes] = await Promise.all([
      fetch(`/api/repositories/${repoId}`),
      fetch(`/api/reviews?repoId=${repoId}&page=${nextPage}&pageSize=5`),
    ]);

    if (!repoRes.ok || !reviewsRes.ok) {
      const repoErr = await repoRes.json().catch(() => ({}));
      const reviewsErr = await reviewsRes.json().catch(() => ({}));
      setError(repoErr?.error ?? reviewsErr?.error ?? "Unable to load repository.");
      setLoading(false);
      return;
    }

    const repoData = await repoRes.json();
    const reviewsData = await reviewsRes.json();
    setRepo(repoData?.repo ?? null);
    setReviews((reviewsData?.reviews ?? []) as Review[]);
    setPage(nextPage);
    setLoading(false);

    if (accessToken) {
      await loadScans(accessToken);
    }
  };

  const loadScans = async (accessToken: string) => {
    setScanLoading(true);
    setScanError(null);

    const res = await fetch(
      `/api/reports/repo-id?accessToken=${accessToken}&repoId=${repoId}`,
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setScanError(data?.error ?? "Unable to load scan reports.");
      setScanLoading(false);
      return;
    }

    const data = await res.json();
    setScans((data?.scans ?? []) as ScanRow[]);
    setScanLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      const accessToken = sessionData.session?.access_token;
      if (mounted) {
        setCurrentUserId(userData.user?.id ?? null);
      }
      await load(1, accessToken);
      if (!sessionData.session?.access_token && mounted) {
        setError(null);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [repoId, supabase]);

  const submitReview = async () => {
    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please sign in to leave a review.");
      setSubmitting(false);
      return;
    }

    const payload = {
      accessToken,
      repoId,
      rating: Number(form.rating),
      title: form.title || null,
      body: form.body,
    };

    const res = await fetch("/api/reviews", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, reviewId: editingId } : payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to submit review.");
      setSubmitting(false);
      return;
    }

    setForm({ rating: "5", title: "", body: "" });
    setEditingId(null);
    await load(1);
    setSubmitting(false);
  };

  const editReview = (review: Review) => {
    setEditingId(review.id);
    setForm({
      rating: String(review.rating),
      title: review.title ?? "",
      body: review.body,
    });
  };

  const deleteReview = async (reviewId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please sign in to delete a review.");
      return;
    }

    const res = await fetch("/api/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, reviewId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to delete review.");
      return;
    }

    await load(page);
  };

  const flagReview = async (reviewId: string) => {
    const reason = window.prompt("Why are you reporting this review?");
    if (!reason) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please sign in to report a review.");
      return;
    }

    const res = await fetch("/api/reviews/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, reviewId, reason }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to report review.");
    }
  };

  const latestScan = scans[0];
  const previousScan = scans[1];

  const chartData = useMemo(() => {
    return [...scans]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      )
      .map((scan) => ({
        date: new Date(scan.created_at).toLocaleDateString(),
        score: scan.score,
        issues: scan.issues,
      }));
  }, [scans]);

  const breakdown = useMemo(() => {
    const findings = latestScan?.findings?.list ?? [];
    const severityCounts: Record<string, number> = {};
    const fileCounts: Record<string, number> = {};

    for (const item of findings) {
      const sev = item.severity ?? "unknown";
      severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
      if (item.file) {
        fileCounts[item.file] = (fileCounts[item.file] ?? 0) + 1;
      }
    }

    const topFiles = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, count]) => ({ file, count }));

    return { severityCounts, topFiles };
  }, [latestScan]);

  const filteredFindings = useMemo(() => {
    const findings = latestScan?.findings?.list ?? [];
    const query = findingQuery.trim().toLowerCase();

    let result = findings.filter((item) => {
      if (findingSeverity !== "all" && item.severity !== findingSeverity) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        item.file,
        item.message,
        item.type,
        item.severity,
        item.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    result = [...result].sort((a, b) => {
      if (findingSort === "score") {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      if (findingSort === "file") {
        return (a.file ?? "").localeCompare(b.file ?? "");
      }
      return (
        (SEVERITY_ORDER[b.severity ?? "unknown"] ?? 0) -
        (SEVERITY_ORDER[a.severity ?? "unknown"] ?? 0)
      );
    });

    return result;
  }, [latestScan, findingQuery, findingSeverity, findingSort]);

  const repoSlug = repo?.repo_url ? parseRepoSlug(repo.repo_url) : null;
  const scoreDelta =
    latestScan && previousScan ? latestScan.score - previousScan.score : 0;
  const issuesDelta =
    latestScan && previousScan ? latestScan.issues - previousScan.issues : 0;

  const runRepositoryScan = async () => {
    if (!repo || !repoSlug || runningScan) return;

    setScanError(null);
    setRunningScan(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const providerToken = sessionData.session?.provider_token;

    if (!accessToken) {
      setScanError("Please sign in to scan this repository.");
      setRunningScan(false);
      return;
    }

    const res = await fetch("/api/github/repo-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        providerToken: providerToken ?? null,
        repo: repoSlug,
        repoId,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setScanError(data?.error ?? "Unable to scan repository.");
      setRunningScan(false);
      return;
    }

    await loadScans(accessToken);
    setRunningScan(false);
  };

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading || !latestScan) return;

    const context = [
      `Repository: ${latestScan.repo ?? repo?.name ?? "unknown"}`,
      `Latest scan: ${latestScan.created_at ?? "unknown"}`,
      `Severity: ${latestScan.severity ?? "unknown"}`,
      `Issues: ${latestScan.issues ?? 0}`,
      `Score: ${latestScan.score ?? 0}`,
      latestScan.findings?.ai_summary
        ? `Summary: ${latestScan.findings.ai_summary}`
        : "Summary: none",
      "Top files: " +
        (breakdown.topFiles.length
          ? breakdown.topFiles.map((f) => `${f.file} (${f.count})`).join(", ")
          : "none"),
    ].join("\n");

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: message },
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: nextMessages,
        context,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.error ?? "Chat failed. Check your API key.",
        },
      ]);
      setChatLoading(false);
      return;
    }

    const data = await res.json();
    setChatMessages((prev) => [
      ...prev,
      { role: "assistant", content: data?.message ?? "" },
    ]);
    setChatLoading(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 w-64" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-64 rounded-3xl" />
          <div className="grid gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !repo) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{error}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/repositories">Back to repositories</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_28%),linear-gradient(to_bottom_right,color-mix(in_oklab,var(--background)_86%,var(--muted)),var(--background))] p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Repository
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {repo?.name}
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {repo?.description ?? "No description yet."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-background/80 px-3 py-1.5">
                {repo?.review_count ?? 0} reviews
              </span>
              <span className="rounded-full border border-border bg-background/80 px-3 py-1.5">
                Avg rating {repo?.rating_avg ?? 0}
              </span>
              {repo?.tags?.map((tagItem) => (
                <span
                  key={tagItem}
                  className="rounded-full border border-border bg-background/80 px-3 py-1.5"
                >
                  {tagItem}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{repo?.repo_url}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={runRepositoryScan}
              disabled={runningScan || !repoSlug}
              className="rounded-full"
            >
              {runningScan ? "Scanning..." : "Scan now"}
            </Button>
            {repoSlug ? (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href={`/reports/${encodeURIComponent(repoSlug)}`}>
                  Scan report
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/repositories">All repositories</Link>
            </Button>
          </div>
        </div>

        {repo?.last_review_excerpt ? (
          <div className="mt-5 rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Latest community note
            </span>
            <p className="mt-2 text-foreground">“{repo.last_review_excerpt}”</p>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanLoading ? (
            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <Skeleton className="h-56 rounded-3xl" />
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            </div>
          ) : scanError ? (
            <p className="text-sm text-red-500">{scanError}</p>
          ) : !latestScan ? (
            <p className="text-sm text-muted-foreground">
              No scan history yet. Run a scan to see insights here.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-border bg-[linear-gradient(to_bottom_right,color-mix(in_oklab,var(--background)_86%,var(--muted)),var(--background))] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      AI summary
                    </p>
                    <h3 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                      <Sparkles className="h-5 w-5" />
                      Mistral analysis
                    </h3>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                      SEVERITY_TONE[latestScan.severity] ?? SEVERITY_TONE.unknown
                    }`}
                  >
                    {latestScan.severity}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {latestScan.findings?.ai_summary ??
                    "No AI summary available yet."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <StatCard label="Severity" value={latestScan.severity} />
                <StatCard label="Issues" value={latestScan.issues} />
                <StatCard label="Score" value={latestScan.score} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {latestScan && previousScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest vs previous</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Score change"
              value={`${scoreDelta >= 0 ? "+" : ""}${scoreDelta}`}
              hint={`Prev ${previousScan.score} to Now ${latestScan.score}`}
            />
            <StatCard
              label="Issues change"
              value={`${issuesDelta >= 0 ? "+" : ""}${issuesDelta}`}
              hint={`Prev ${previousScan.issues} to Now ${latestScan.issues}`}
            />
            <StatCard
              label="Severity"
              value={latestScan.severity}
              hint={`Prev ${previousScan.severity}`}
            />
          </CardContent>
        </Card>
      ) : null}

      {latestScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {Object.entries(breakdown.severityCounts).map(([sev, count]) => (
                <StatCard key={sev} label={sev} value={count} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Top files
              </p>
              {breakdown.topFiles.length ? (
                <div className="space-y-2">
                  {breakdown.topFiles.map((file) => (
                    <div
                      key={file.file}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
                    >
                      <span className="truncate text-foreground">{file.file}</span>
                      <span>{file.count} issues</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No file-level findings yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {latestScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings table</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search findings"
                value={findingQuery}
                onChange={(event) => setFindingQuery(event.target.value)}
                className="h-9 text-sm"
              />
              <div className="w-full sm:w-44">
                <Select value={findingSeverity} onValueChange={setFindingSeverity}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm">All</SelectItem>
                    <SelectItem value="critical" className="text-sm">Critical</SelectItem>
                    <SelectItem value="high" className="text-sm">High</SelectItem>
                    <SelectItem value="medium" className="text-sm">Medium</SelectItem>
                    <SelectItem value="low" className="text-sm">Low</SelectItem>
                    <SelectItem value="unknown" className="text-sm">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-44">
                <Select value={findingSort} onValueChange={setFindingSort}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severity" className="text-sm">Severity</SelectItem>
                    <SelectItem value="score" className="text-sm">Score</SelectItem>
                    <SelectItem value="file" className="text-sm">File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No findings match these filters.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredFindings.slice(0, 50).map((item, index) => (
                  <div
                    key={`${item.file ?? "file"}-${item.line ?? index}`}
                    className="rounded-2xl border border-border bg-muted/25 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {item.type ?? "Issue"}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.severity ? (
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${
                              SEVERITY_TONE[item.severity] ?? SEVERITY_TONE.unknown
                            }`}
                          >
                            {item.severity}
                          </span>
                        ) : null}
                        {typeof item.score === "number" ? (
                          <span className="text-xs text-muted-foreground">
                            Score {item.score}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.message ?? "No message"}
                    </p>
                    {item.file ? (
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {item.file}:{item.line ?? "-"}
                      </p>
                    ) : null}
                    {item.source ? (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {item.source}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {latestScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-56 text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                  <XAxis dataKey="date" tick={{ fill: "currentColor", fontSize: 12 }} />
                  <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56 text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                  <XAxis dataKey="date" tick={{ fill: "currentColor", fontSize: 12 }} />
                  <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="issues" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {latestScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Mistral assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border bg-[linear-gradient(to_bottom,var(--muted),transparent)] p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Ask about findings, fixes, or blast radius
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Grounded in the latest scan summary
                </span>
              </div>

              <div className="max-h-72 space-y-3 overflow-auto rounded-2xl border border-border bg-background p-4 text-sm">
                {chatMessages.length === 0 ? (
                  <p className="text-muted-foreground">
                    Ask about this repo&apos;s scan results or how to fix issues.
                  </p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={`${msg.role}-${index}`}
                      className={`rounded-2xl border px-4 py-3 ${
                        msg.role === "user"
                          ? "ml-auto max-w-[85%] border-foreground/10 bg-foreground text-background"
                          : "max-w-[90%] border-border bg-muted/35 text-foreground"
                      }`}
                    >
                      <span
                        className={`text-xs uppercase tracking-[0.2em] ${
                          msg.role === "user"
                            ? "text-background/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {msg.role}
                      </span>
                      <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className="h-11 flex-1 rounded-2xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                  placeholder="Ask about the latest scan..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={sendChat}
                  disabled={chatLoading}
                  className="h-11 rounded-2xl px-5"
                >
                  {chatLoading ? "Thinking..." : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave a review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rating</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Review</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              rows={4}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={submitReview} disabled={submitting || !form.body.trim()}>
              {editingId ? "Update review" : "Submit review"}
            </Button>
            {editingId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm({ rating: "5", title: "", body: "" });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Recent reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {review.title ?? "Untitled review"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {review.profiles?.full_name ?? review.profiles?.username ?? "Reviewer"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Rating {review.rating}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{review.body}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  {review.edited_at ? <span>Edited</span> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.author_id === currentUserId ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => editReview(review)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteReview(review.id)}>
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => flagReview(review.id)}>
                      Report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => load(Math.max(1, page - 1))}>
            Previous
          </Button>
          <Button size="sm" variant="outline" onClick={() => load(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function parseRepoSlug(repoUrl: string) {
  const trimmed = repoUrl.trim();
  if (trimmed.startsWith("git@")) {
    const match = trimmed.match(/:(.+?)(\.git)?$/);
    return match?.[1] ?? null;
  }

  try {
    const url = new URL(trimmed);
    const slug = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "");
    return slug || null;
  } catch {
    return null;
  }
}
