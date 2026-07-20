"use client";

import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clipboard, Download,
  FileCode2, Filter, FolderGit2, LoaderCircle, RotateCw, Search, ShieldAlert, X,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Severity = "low" | "medium" | "high" | "critical";
type Finding = {
  file: string; line: number; severity: Severity; score: number; type: string;
  message: string; snippet?: string; suggestion?: string; source: "regex" | "ai";
  category?: "code" | "secrets"; confidence?: string; advisoryId?: string; technicalDetails?: string;
};
type ScanResult = { repoUrl: string; totalFindings: number; findings: Finding[]; scan?: { score?: number; created_at?: string } | null };
type Stage = "validating" | "cloning" | "detecting" | "reading" | "analyzing" | "recommendations";
const stages: { id: Stage; title: string; fallback: string }[] = [
  { id: "validating", title: "Validating repository", fallback: "Checking the GitHub URL and preparing isolation." },
  { id: "cloning", title: "Reading files", fallback: "Fetching the repository with safe clone limits." },
  { id: "detecting", title: "Detecting package managers", fallback: "Looking for manifests and lockfiles." },
  { id: "reading", title: "Parsing manifests", fallback: "Cataloging supported source and manifest files." },
  { id: "analyzing", title: "Analyzing risky code", fallback: "Reviewing code and possible secret exposure." },
  { id: "recommendations", title: "Generating recommendations", fallback: "Ranking findings and suggested fixes." },
];
const severityRank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function severityClass(severity: Severity) {
  return { critical: "border-rose-500/30 bg-rose-500/10 text-rose-300", high: "border-orange-500/30 bg-orange-500/10 text-orange-300", medium: "border-amber-500/30 bg-amber-500/10 text-amber-300", low: "border-sky-500/30 bg-sky-500/10 text-sky-300" }[severity];
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function ScanWorkspace() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [repoUrl, setRepoUrl] = useState("");
  const [failOn, setFailOn] = useState<Severity>("high");
  const [phase, setPhase] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [stageDetails, setStageDetails] = useState<Partial<Record<Stage, string>>>({});
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [sort, setSort] = useState<"severity" | "path">("severity");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [falsePositive, setFalsePositive] = useState<Set<string>>(new Set());
  const [ignored, setIgnored] = useState<Map<string, string>>(new Map());
  const [ignoreTarget, setIgnoreTarget] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const findingKey = (finding: Finding) => `${finding.file}:${finding.line}:${finding.type}`;
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 3000); };

  const saveFindingStatus = async (findingKey: string, status: "reviewed" | "false_positive" | "ignored" | "open", reason?: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !result) return;
    const response = await fetch("/api/findings/status", { method: "PUT", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ repository: result.repoUrl, findingKey, status, reason }) });
    if (!response.ok) notify("Could not save this decision. Apply the finding_reviews migration, then try again.");
  };

  useEffect(() => {
    if (!result) return;
    let active = true;
    const loadReviewStatus = async () => {
      const { data } = await supabase.auth.getSession(); const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch(`/api/findings/status?repository=${encodeURIComponent(result.repoUrl)}`, { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!active || !response.ok) return;
      const reviews = payload.reviews as Array<{ finding_key: string; status: string; reason: string | null }>;
      setReviewed(new Set(reviews.filter((item) => item.status === "reviewed").map((item) => item.finding_key)));
      setFalsePositive(new Set(reviews.filter((item) => item.status === "false_positive").map((item) => item.finding_key)));
      setIgnored(new Map(reviews.filter((item) => item.status === "ignored").map((item) => [item.finding_key, item.reason ?? ""])));
    };
    void loadReviewStatus(); return () => { active = false; };
  }, [result, selectedTeamId, supabase]);

  const startScan = async () => {
    const normalizedUrl = repoUrl.trim();
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(normalizedUrl)) {
      setError("Enter a full GitHub repository URL, for example https://github.com/org/repository."); return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setError("Sign in to run a repository scan."); return; }
    setPhase("scanning"); setError(null); setResult(null); setActiveStage("validating"); setStageDetails({});
    setReviewed(new Set()); setFalsePositive(new Set()); setIgnored(new Map());
    try {
      const response = await fetch("/api/scan/github", {
        method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json", Accept: "text/event-stream" }),
        body: JSON.stringify({ repoUrl: normalizedUrl, options: { failOn } }),
      });
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to start scan.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n"); buffer = messages.pop() ?? "";
        for (const message of messages) {
          const event = message.match(/^event: (.+)$/m)?.[1]; const raw = message.match(/^data: (.+)$/m)?.[1];
          if (!event || !raw) continue;
          const payload = JSON.parse(raw) as { stage?: Stage; detail?: string; error?: string } | ScanResult;
          if (event === "progress" && "stage" in payload && payload.stage) { setActiveStage(payload.stage); setStageDetails((previous) => ({ ...previous, [payload.stage!]: payload.detail ?? "" })); }
          if (event === "complete") { setResult(payload as ScanResult); setPhase("done"); setActiveStage("recommendations"); }
          if (event === "error") throw new Error("error" in payload ? payload.error : "Scan failed.");
        }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Scan failed."); setPhase("error"); }
  };

  const findings = (result?.findings ?? []).filter((finding) => {
    const text = `${finding.message} ${finding.file} ${finding.type}`.toLowerCase();
    return (severity === "all" || finding.severity === severity) && text.includes(query.toLowerCase());
  }).sort((a, b) => sort === "severity" ? severityRank[b.severity] - severityRank[a.severity] : a.file.localeCompare(b.file) || a.line - b.line);
  const counts = (result?.findings ?? []).reduce<Record<Severity, number>>((all, finding) => ({ ...all, [finding.severity]: all[finding.severity] + 1 }), { critical: 0, high: 0, medium: 0, low: 0 });
  const score = result?.findings.length ? Math.max(...result.findings.map((finding) => finding.score)) : 0;
  const categoryCount = (category: "code" | "secrets") => result?.findings.filter((finding) => finding.category === category).length ?? 0;
  const severityChart = (["critical", "high", "medium", "low"] as Severity[]).map((level) => ({ name: level, value: counts[level], color: { critical: "#fb7185", high: "#fb923c", medium: "#fbbf24", low: "#38bdf8" }[level] }));

  return <main className="mx-auto max-w-7xl space-y-6 pb-12">
    <section className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,.16),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.12),transparent_28%),var(--card)] p-6 sm:p-8">
      <Badge variant="outline" className="border-sky-500/30 text-sky-300">Repository security scan</Badge>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find the risks worth fixing first.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Votrio performs a read-only, shallow clone and static source review. Repository credentials are never included in scan output.</p></div>{result && <Button variant="outline" onClick={() => { setResult(null); setPhase("idle"); }}><RotateCw /> New scan</Button>}</div>
      <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_150px_auto]"><div><label htmlFor="repo-url" className="mb-2 block text-sm font-medium">GitHub repository URL</label><div className="relative"><FolderGit2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="repo-url" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/owner/repository" disabled={phase === "scanning"} className="h-9 pl-9" aria-describedby="repo-help" /></div><p id="repo-help" className="mt-2 text-xs text-muted-foreground">Public GitHub HTTPS URLs only. Private repositories are scanned from the connected repositories workflow.</p></div><div><label htmlFor="fail-on" className="mb-2 block text-sm font-medium">Fail threshold</label><select id="fail-on" value={failOn} onChange={(event) => setFailOn(event.target.value as Severity)} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" disabled={phase === "scanning"}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div><Button size="lg" onClick={startScan} disabled={phase === "scanning"} className="self-end">{phase === "scanning" ? <LoaderCircle className="animate-spin" /> : <ShieldAlert />} {phase === "scanning" ? "Scanning" : result ? "Rescan" : "Start scan"}</Button></div>
      {error && <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    </section>

    {phase === "scanning" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin text-sky-400" /> Scan in progress</CardTitle></CardHeader><CardContent className="space-y-1">{stages.map((stage, index) => { const reached = activeStage ? stages.findIndex((item) => item.id === activeStage) >= index : false; const current = activeStage === stage.id; return <div key={stage.id} className="flex gap-3 rounded-xl p-3"><div className="mt-0.5">{current ? <LoaderCircle className="h-4 w-4 animate-spin text-sky-400" /> : reached ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />}</div><div><p className={reached ? "text-sm font-medium" : "text-sm text-muted-foreground"}>{stage.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{stageDetails[stage.id] ?? stage.fallback}</p></div></div>; })}</CardContent></Card>}

    {phase === "scanning" && <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>}

    {result && <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric title="Overall risk" value={`${score}/100`} detail={score >= 75 ? "Needs attention" : score >= 55 ? "Review recommended" : "Lower observed risk"} /><Metric title="Total findings" value={String(result.totalFindings)} detail="Static checks completed" /><Metric title="Code issues" value={String(categoryCount("code"))} detail="Risky-code rules" /><Metric title="Secret exposure" value={String(categoryCount("secrets"))} detail="Credential-pattern rules" /></div>
      <Card><CardHeader><CardTitle>Severity distribution</CardTitle></CardHeader><CardContent className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityChart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={4}>{severityChart.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value, name) => [value, String(name).toUpperCase()]} /></PieChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Scan coverage</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Coverage label="Dependencies" value="Not assessed" detail="No advisory database connected" /><Coverage label="Configuration" value="Not assessed" detail="Config rules not enabled" /><Coverage label="Outdated packages" value="Not assessed" detail="No registry comparison" /><Coverage label="Supply chain & licenses" value="Not assessed" detail="No SBOM or license engine" /></CardContent></Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-semibold">Findings</h2><p className="mt-1 text-sm text-muted-foreground">Review findings from the latest scan. Review state is local to this browser session.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => download("votrio-findings.json", JSON.stringify(result, null, 2), "application/json")}><Download /> JSON</Button><Button variant="outline" size="sm" onClick={() => download("votrio-findings.csv", ["severity,category,file,line,type,message", ...result.findings.map((f) => [f.severity, f.category ?? "code", f.file, f.line, f.type, JSON.stringify(f.message)].join(","))].join("\n"), "text/csv")}><Download /> CSV</Button></div></div>
      <Card><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_160px_160px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, rule, or message" className="pl-9" /></div><select value={severity} onChange={(event) => setSeverity(event.target.value as "all" | Severity)} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="all">All severities</option>{(["critical", "high", "medium", "low"] as Severity[]).map((level) => <option key={level} value={level}>{level} ({counts[level]})</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value as "severity" | "path")} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="severity">Sort by severity</option><option value="path">Sort by path</option></select></div></CardContent></Card>
      <div className="space-y-3">
        {findings.length === 0 ? <Card><CardContent className="p-10 text-center"><Filter className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 font-medium">No matching findings</p><p className="mt-1 text-sm text-muted-foreground">Try clearing the search or choosing another severity.</p></CardContent></Card> : findings.map((finding) => {
          const key = findingKey(finding); const isExpanded = expanded === key; const isIgnored = ignored.has(key);
          return <Card key={key} className={isIgnored ? "opacity-60" : ""}><CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <button className="flex min-w-0 flex-1 gap-3 text-left" onClick={() => setExpanded(isExpanded ? null : key)} aria-expanded={isExpanded}>
                <span className="mt-0.5">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><Badge className={severityClass(finding.severity)}>{finding.severity}</Badge><Badge variant="outline">{finding.category === "secrets" ? "Secret exposure" : "Code issue"}</Badge>{isIgnored && <Badge variant="outline">Ignored</Badge>}</span><span className="mt-2 block font-medium">{finding.message}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><FileCode2 className="h-3.5 w-3.5" /> {finding.file}:{finding.line} · {finding.type}</span></span>
              </button>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(`${finding.file}:${finding.line}\n${finding.suggestion ?? finding.message}`); notify("Remediation copied."); }}><Clipboard /> Copy fix</Button>{isIgnored ? <Button size="sm" variant="outline" onClick={() => { setIgnored((current) => { const next = new Map(current); next.delete(key); return next; }); void saveFindingStatus(key, "open"); }}><RotateCw /> Reopen</Button> : <><Button size="sm" variant={reviewed.has(key) ? "secondary" : "outline"} onClick={() => { setReviewed((current) => new Set(current).add(key)); void saveFindingStatus(key, "reviewed"); }}>{reviewed.has(key) ? "Reviewed" : "Mark reviewed"}</Button><Button size="sm" variant={falsePositive.has(key) ? "secondary" : "outline"} onClick={() => { setFalsePositive((current) => new Set(current).add(key)); void saveFindingStatus(key, "false_positive"); }}>False positive</Button><Button size="sm" variant="outline" onClick={() => { setIgnoreTarget(key); setIgnoreReason(""); }}>Ignore</Button></>}</div>
            </div>
            {isExpanded && <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2"><Detail label="Impact" value={finding.severity === "critical" || finding.severity === "high" ? "May expose application behavior or sensitive data if reachable." : "Requires review in its runtime context."} /><Detail label="Recommended fix" value={finding.suggestion ?? "Review and replace the flagged pattern."} /><Detail label="Advisory ID" value={finding.advisoryId ?? "Not available"} /><Detail label="Confidence" value={finding.confidence ?? "Not available"} /><div className="md:col-span-2"><Detail label="Technical details" value={finding.technicalDetails ?? finding.snippet ?? "No additional technical details are available."} /></div></div>}
          </CardContent></Card>;
        })}
      </div>
    </section>}
    {ignoreTarget && <div role="dialog" aria-modal="true" aria-labelledby="ignore-title" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="ignore-title" className="font-semibold">Ignore this finding</h2><p className="mt-1 text-sm text-muted-foreground">A reason is required and will be saved to your finding review history.</p></div><Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setIgnoreTarget(null)}><X /></Button></div><Textarea value={ignoreReason} onChange={(event) => setIgnoreReason(event.target.value)} placeholder="Why is this finding acceptable?" className="mt-4" /><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setIgnoreTarget(null)}>Cancel</Button><Button disabled={!ignoreReason.trim()} onClick={() => { setIgnored((current) => new Map(current).set(ignoreTarget, ignoreReason.trim())); void saveFindingStatus(ignoreTarget, "ignored", ignoreReason.trim()); setIgnoreTarget(null); notify("Finding ignored."); }}>Ignore finding</Button></div></div></div>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-xl">{toast}</div>}
  </main>;
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) { return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }
function Coverage({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-medium">{label}</p><p className="mt-3 text-sm text-muted-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{value}</p></div>; }
