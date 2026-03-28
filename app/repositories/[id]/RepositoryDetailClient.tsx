"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      return;
    }
  };

  const latestScan = scans[0];
  const previousScan = scans[1];

  const chartData = useMemo(() => {
    return [...scans]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )
      .map((scan) => ({
        date: new Date(scan.created_at).toLocaleDateString(),
        score: scan.score,
        issues: scan.issues,
        severity: scan.severity,
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

    return { severityCounts, topFiles, total: findings.length };
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
      if (findingSort === "severity") {
        return (
          (SEVERITY_ORDER[b.severity ?? "unknown"] ?? 0) -
          (SEVERITY_ORDER[a.severity ?? "unknown"] ?? 0)
        );
      }
      return 0;
    });

    return result;
  }, [latestScan, findingQuery, findingSeverity, findingSort]);

  const repoSlug = repo?.repo_url ? parseRepoSlug(repo.repo_url) : null;

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading repository...</p>;
  }

  if (error && !repo) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-400">{error}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/repositories">Back to repositories</Link>
        </Button>
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Repository</p>
          <h1 className="text-2xl font-semibold text-white">{repo?.name}</h1>
          <p className="text-sm text-zinc-400">{repo?.repo_url}</p>
        </div>
        <div className="flex items-center gap-2">
          {repoSlug ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/reports/${encodeURIComponent(repoSlug)}`}>Scan report</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href="/repositories">All repositories</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-zinc-300">{repo?.description ?? "No description yet."}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>{repo?.review_count ?? 0} reviews</span>
            <span>Avg rating {repo?.rating_avg ?? 0}</span>
          </div>
          {repo?.tags?.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              {repo.tags.map((tagItem) => (
                <span key={tagItem} className="rounded-full border border-zinc-800 px-2 py-0.5">
                  {tagItem}
                </span>
              ))}
            </div>
          ) : null}
          {repo?.last_review_excerpt ? (
            <p className="text-xs text-zinc-400">“{repo.last_review_excerpt}”</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Scan insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanLoading ? (
            <p className="text-sm text-zinc-500">Loading scans...</p>
          ) : scanError ? (
            <p className="text-sm text-red-400">{scanError}</p>
          ) : !latestScan ? (
            <p className="text-sm text-zinc-500">
              No scan history yet. Run a scan to see insights here.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Severity</p>
                  <p className="text-lg font-semibold text-white">{latestScan.severity}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Issues</p>
                  <p className="text-lg font-semibold text-white">{latestScan.issues}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Score</p>
                  <p className="text-lg font-semibold text-white">{latestScan.score}</p>
                </div>
              </div>
              <Separator className="bg-zinc-800" />
              <p className="text-sm text-zinc-400">
                {latestScan.findings?.ai_summary ?? "No AI summary available yet."}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {latestScan && previousScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-white">Latest vs previous</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Score change</p>
              <p className="text-lg font-semibold text-white">
                {latestScan.score - previousScan.score >= 0 ? "+" : ""}
                {latestScan.score - previousScan.score}
              </p>
              <p className="text-xs text-zinc-500">
                Prev {previousScan.score} to Now {latestScan.score}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Issues change</p>
              <p className="text-lg font-semibold text-white">
                {latestScan.issues - previousScan.issues >= 0 ? "+" : ""}
                {latestScan.issues - previousScan.issues}
              </p>
              <p className="text-xs text-zinc-500">
                Prev {previousScan.issues} to Now {latestScan.issues}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Severity</p>
              <p className="text-lg font-semibold text-white">{latestScan.severity}</p>
              <p className="text-xs text-zinc-500">Prev {previousScan.severity}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {latestScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-white">Findings breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {Object.entries(breakdown.severityCounts).map(([sev, count]) => (
                <div key={sev} className="rounded-lg border border-zinc-800 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{sev}</p>
                  <p className="text-lg font-semibold text-white">{count}</p>
                </div>
              ))}
            </div>
            <Separator className="bg-zinc-800" />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Top files</p>
              {breakdown.topFiles.length ? (
                <div className="space-y-2">
                  {breakdown.topFiles.map((file) => (
                    <div
                      key={file.file}
                      className="flex items-center justify-between text-xs text-zinc-400"
                    >
                      <span className="truncate">{file.file}</span>
                      <span>{file.count} issues</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No file-level findings yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {latestScan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-white">Findings table</CardTitle>
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
              <p className="text-sm text-zinc-500">No findings match these filters.</p>
            ) : (
              <div className="space-y-2 text-xs text-zinc-400">
                {filteredFindings.slice(0, 50).map((item, index) => (
                  <div
                    key={`${item.file ?? "file"}-${item.line ?? index}`}
                    className="rounded-lg border border-zinc-800 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-zinc-100">{item.type ?? "Issue"}</span>
                      <div className="flex items-center gap-2">
                        {item.severity ? <Badge variant="outline">{item.severity}</Badge> : null}
                        {typeof item.score === "number" ? (
                          <span className="text-xs text-zinc-500">Score {item.score}</span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{item.message ?? "No message"}</p>
                    {item.file ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.file}:{item.line ?? "-"}
                      </p>
                    ) : null}
                    {item.source ? (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
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
            <CardTitle className="text-base text-white">Scan trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0f0f0f",
                      border: "1px solid #27272a",
                      color: "#e4e4e7",
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0f0f0f",
                      border: "1px solid #27272a",
                      color: "#e4e4e7",
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
            <CardTitle className="text-base text-white">Mini assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-64 space-y-3 overflow-auto rounded-lg border border-zinc-800 p-3 text-sm">
              {chatMessages.length === 0 ? (
                <p className="text-zinc-500">
                  Ask about this repo's scan results or how to fix issues.
                </p>
              ) : (
                chatMessages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={msg.role === "user" ? "text-white" : "text-zinc-300"}
                  >
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {msg.role}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="h-10 flex-1 rounded-md border border-zinc-800 bg-transparent px-3 text-sm text-zinc-100"
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
              <Button size="sm" onClick={sendChat} disabled={chatLoading}>
                {chatLoading ? "Thinking..." : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Leave a review</CardTitle>
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
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Recent reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-zinc-500">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {review.title ?? "Untitled review"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {review.profiles?.full_name ?? review.profiles?.username ?? "Reviewer"}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400">Rating {review.rating}</span>
                </div>
                <p className="text-sm text-zinc-300">{review.body}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
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
