"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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

export default function ReportDetailClient({ repoSlug }: { repoSlug: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [findingQuery, setFindingQuery] = useState("");
  const [findingSeverity, setFindingSeverity] = useState("all");
  const [findingSort, setFindingSort] = useState("severity");

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
  const previous = scans[1];
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

  const filteredFindings = useMemo(() => {
    const findings = latest?.findings?.list ?? [];
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
  }, [latest, findingQuery, findingSeverity, findingSort]);

  const breakdown = useMemo(() => {
    const findings = latest?.findings?.list ?? [];
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
  }, [latest]);

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    const context = [
      `Repository: ${latest?.repo ?? "unknown"}`,
      `Latest scan: ${latest?.created_at ?? "unknown"}`,
      `Severity: ${latest?.severity ?? "unknown"}`,
      `Issues: ${latest?.issues ?? 0}`,
      `Score: ${latest?.score ?? 0}`,
      latest?.findings?.ai_summary
        ? `Summary: ${latest.findings.ai_summary}`
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

      {latest && previous ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-white">Latest vs previous</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Score change</p>
              <p className="text-lg font-semibold text-white">
                {latest.score - previous.score >= 0 ? "+" : ""}
                {latest.score - previous.score}
              </p>
              <p className="text-xs text-zinc-500">
                Prev {previous.score} to Now {latest.score}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Issues change</p>
              <p className="text-lg font-semibold text-white">
                {latest.issues - previous.issues >= 0 ? "+" : ""}
                {latest.issues - previous.issues}
              </p>
              <p className="text-xs text-zinc-500">
                Prev {previous.issues} to Now {latest.issues}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Severity</p>
              <p className="text-lg font-semibold text-white">{latest.severity}</p>
              <p className="text-xs text-zinc-500">Prev {previous.severity}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {latest ? (
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
            <div
              key={`${scan.repo}-${scan.created_at}`}
              className="flex items-center justify-between text-xs text-zinc-400"
            >
              <span>{new Date(scan.created_at).toLocaleDateString()}</span>
              <Badge variant="outline">{scan.severity}</Badge>
              <span>{scan.issues} issues</span>
              <span>Score {scan.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>

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
    </div>
  );
}
