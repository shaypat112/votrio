"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";

const SAMPLES = [
  {
    id: "node",
    label: "Node.js",
    sublabel: "Express + SQL",
    lang: "javascript",
    badge: "SQLi · XSS",
    severity: "critical",
  },
  {
    id: "python",
    label: "Python",
    sublabel: "Flask API",
    lang: "python",
    badge: "RCE · Injection",
    severity: "critical",
  },
  {
    id: "react",
    label: "React",
    sublabel: "Component",
    lang: "tsx",
    badge: "XSS · Secrets",
    severity: "high",
  },
];

const PLACEHOLDER = `// Paste any code here to scan for vulnerabilities
// or pick a sample above

function getUser(id) {
  return db.query("SELECT * FROM users WHERE id = " + id);
}`;

function colorize(line: string): React.ReactNode {
  if (line.startsWith("─")) {
    return <span className="text-zinc-600">{line}</span>;
  }
  if (line.startsWith("[CRITICAL]")) {
    const rest = line.slice(10);
    const dash = rest.indexOf(" — ");
    if (dash !== -1) {
      return (
        <span>
          <span className="font-bold text-white">[CRITICAL]</span>
          <span className="font-semibold text-zinc-100">
            {rest.slice(0, dash)}
          </span>
          <span className="text-zinc-600"> — </span>
          <span className="text-zinc-500">{rest.slice(dash + 3)}</span>
        </span>
      );
    }
    return (
      <span>
        <span className="font-bold text-white">[CRITICAL]</span>
        <span className="text-zinc-300">{rest}</span>
      </span>
    );
  }
  if (line.startsWith("[HIGH]")) {
    const rest = line.slice(6);
    const dash = rest.indexOf(" — ");
    if (dash !== -1) {
      return (
        <span>
          <span className="font-bold text-zinc-200">[HIGH]</span>
          <span className="font-semibold text-zinc-100">
            {rest.slice(0, dash)}
          </span>
          <span className="text-zinc-600"> — </span>
          <span className="text-zinc-500">{rest.slice(dash + 3)}</span>
        </span>
      );
    }
    return (
      <span>
        <span className="font-bold text-zinc-200">[HIGH]</span>
        <span className="text-zinc-300">{rest}</span>
      </span>
    );
  }
  if (line.startsWith("[MEDIUM]")) {
    const rest = line.slice(8);
    const dash = rest.indexOf(" — ");
    if (dash !== -1) {
      return (
        <span>
          <span className="font-bold text-zinc-300">[MEDIUM]</span>
          <span className="font-semibold text-zinc-100">
            {rest.slice(0, dash)}
          </span>
          <span className="text-zinc-600"> — </span>
          <span className="text-zinc-500">{rest.slice(dash + 3)}</span>
        </span>
      );
    }
    return (
      <span>
        <span className="font-bold text-zinc-300">[MEDIUM]</span>
        <span className="text-zinc-300">{rest}</span>
      </span>
    );
  }
  if (line.startsWith("[LOW]")) {
    const rest = line.slice(5);
    return (
      <span>
        <span className="font-bold text-zinc-400">[LOW]</span>
        <span className="text-zinc-400">{rest}</span>
      </span>
    );
  }
  if (line.startsWith("●")) {
    return (
      <span>
        <span className="text-zinc-300">●</span>
        <span className="text-zinc-400">{line.slice(1)}</span>
      </span>
    );
  }
  if (line.startsWith("✓")) {
    return (
      <span>
        <span className="text-zinc-300">✓</span>
        <span className="text-zinc-400">{line.slice(1)}</span>
      </span>
    );
  }
  if (line.startsWith("Run:")) {
    return (
      <span>
        <span className="text-zinc-600">Run: </span>
        <span className="font-mono text-zinc-100">{line.slice(5)}</span>
      </span>
    );
  }
  if (/^\d+ issue/.test(line)) {
    return <span className="text-white font-semibold">{line}</span>;
  }
  if (line.startsWith("  ") && line.trimStart().startsWith("→")) {
    return <span className="text-zinc-700">{line}</span>;
  }
  if (line.startsWith("  ") && !line.startsWith("   ")) {
    return <span className="text-zinc-500">{line}</span>;
  }
  if (line.startsWith("$")) {
    return (
      <span>
        <span className="text-zinc-700">$ </span>
        <span className="text-cyan-300">{line.slice(2)}</span>
      </span>
    );
  }
  return <span className="text-zinc-400">{line}</span>;
}

function TerminalLine({ text }: { text: string }) {
  if (text === "") return <div className="h-[14px]" />;
  return (
    <div className="font-mono text-[12.5px] leading-[20px] whitespace-pre-wrap break-all">
      {colorize(text)}
    </div>
  );
}

export default function DemoPage() {
  const [code, setCode] = useState(PLACEHOLDER);
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState<string[]>([
    "● votrio v0.1.0",
    "● interactive security demo",
    "",
    "  select a sample or paste code,",
    "  then hit Run Scan.",
    "",
  ]);
  const [scanning, setScanning] = useState(false);
  const [ran, setRan] = useState(false);

  const [copiedInstall, setCopiedInstall] = useState(false);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const loadSample = useCallback(async (id: string, lang: string) => {
    setActiveSample(id);
    setLanguage(lang);
    const res = await fetch(`/api/demo-scan?sample=${id}`);
    const { code: sampleCode } = await res.json();
    setCode(sampleCode);
    setRan(false);
    textareaRef.current?.focus();
  }, []);

  const runScan = useCallback(async () => {
    if (scanning || !code.trim()) return;
    setScanning(true);
    setRan(true);
    setOutput([`$ votrio scan --language ${language}`, ""]);

    try {
      const res = await fetch("/api/demo-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) throw new Error("Scan failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          try {
            const { text } = JSON.parse(event.slice(6));
            if (!text) continue;
            const parts = text.split(/\r?\n/);
            setOutput((prev) => {
              const next = [...prev];
              for (let i = 0; i < parts.length; i++) {
                if (i === 0) {
                  next[next.length - 1] =
                    (next[next.length - 1] ?? "") + parts[0];
                } else {
                  next.push(parts[i]);
                }
              }
              return next;
            });
          } catch {}
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setOutput((prev) => [...prev, "", `error: ${message}`, ""]);
    } finally {
      setScanning(false);
      setOutput((prev) => [...prev, "", "$ _"]);
    }
  }, [code, language, scanning]);

  const reset = () => {
    setCode(PLACEHOLDER);
    setActiveSample(null);
    setRan(false);
    setOutput([
      "● votrio v0.1.0",
      "● interactive security demo",
      "",
      "  select a sample or paste code,",
      "  then hit Run Scan.",
      "",
    ]);
  };

  const copyInstall = async () => {
    await navigator.clipboard.writeText("npm install -g votrio");
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const lineCount = code.split("\n").length;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--background)",
        fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
      }}
    >
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background">
            <Shield size={13} className="text-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">votrio</span>
          <span className="text-xs text-zinc-600">/</span>
          <span className="text-xs text-muted-foreground">demo</span>
          <Badge
            variant="outline"
            className="ml-1 border-border bg-background px-1.5 py-0 text-[10px] text-muted-foreground"
          >
            LIVE
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={copyInstall}
          className="hidden h-7 items-center gap-2 border border-border px-3 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
        >
          {copiedInstall ? (
            <>
              <Check size={11} className="text-foreground" />
              <span className="text-foreground">copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              npm i -g votrio
            </>
          )}
        </Button>
      </header>

      {/* Main grid */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left panel — editor */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-border">
          {/* Sample selector strip */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              samples
            </span>
            <div className="flex gap-2 flex-wrap">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSample(s.id, s.lang)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1 rounded border text-[11px] font-mono transition-all",
                    activeSample === s.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-zinc-500 hover:text-foreground",
                  )}
                >
                  <span>{s.label}</span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-[10px] text-zinc-500">
                    {s.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor chrome */}
          <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {activeSample
                  ? `${activeSample}.${language === "python" ? "py" : language === "tsx" ? "tsx" : "js"}`
                  : "untitled"}
              </span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-zinc-500 focus:border-zinc-500 focus:outline-none"
            >
              <option value="javascript">js</option>
              <option value="typescript">ts</option>
              <option value="python">py</option>
              <option value="tsx">tsx</option>
              <option value="go">go</option>
              <option value="rust">rs</option>
            </select>
          </div>

          {/* Code area */}
          <div
            className="flex flex-1 overflow-hidden"
            style={{ minHeight: "340px" }}
          >
            <div className="select-none border-r border-border bg-card/60 px-3 py-4">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div
                  key={i}
                  className="text-right text-[11px] leading-5 text-zinc-500"
                  style={{
                    width: "28px",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setRan(false);
              }}
              spellCheck={false}
              className="flex-1 resize-none overflow-auto bg-background p-4 text-[12.5px] leading-5 text-foreground focus:outline-none"
              style={{
                fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
                caretColor: "currentColor",
                tabSize: 2,
              }}
            />
          </div>

          {/* Action bar */}
          <div className="flex gap-2 border-t border-border bg-card px-4 py-3">
            <Button
              onClick={runScan}
              disabled={scanning}
              className={cn(
                "flex-1 h-9 text-xs font-mono font-bold gap-2 transition-all",
                scanning
                  ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
                  : "border-0 bg-foreground text-background hover:opacity-90",
              )}
            >
              {scanning ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
                  scanning...
                </>
              ) : (
                <>
                  <Zap size={13} />
                  run scan
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="h-9 w-9 border-border bg-background p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw size={13} />
            </Button>
          </div>
        </div>

        {/* Right panel — terminal */}
        <div className="flex min-h-[380px] min-w-0 flex-1 flex-col lg:min-h-0">
          {/* Terminal chrome */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
            </div>
            <span className="mx-auto font-mono text-[10px] text-muted-foreground">
              votrio — zsh — 80×24
            </span>
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                scanning
                  ? "bg-foreground animate-pulse"
                  : ran
                    ? "bg-zinc-500"
                    : "bg-zinc-300 dark:bg-zinc-700",
              )}
            />
          </div>

          {/* Output */}
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto bg-background p-4"
            style={{ minHeight: "340px" }}
          >
            {output.map((line, i) => (
              <TerminalLine key={i} text={line} />
            ))}
            {scanning && (
              <div
                className="text-[12.5px] leading-5 text-zinc-700 animate-pulse"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                ▊
              </div>
            )}
            {!scanning && ran && (
              <div
                className="text-[12.5px] leading-5 flex items-center gap-0.5"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <span className="text-zinc-700">$ </span>
                <span
                  className="text-zinc-600"
                  style={{ animation: "blink 1s step-end infinite" }}
                >
                  █
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <footer className="relative z-10 border-t border-border bg-card px-5 py-4">
        <div className="max-w-none flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="shrink-0 text-zinc-500" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                Protect your real codebase
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                install globally · scan any project · zero config
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground">
              <span className="text-zinc-700">$</span>
              <span>npm install -g votrio</span>
            </div>
            <Button
              size="sm"
              onClick={copyInstall}
              className="h-8 gap-1.5 border border-border bg-background px-3 font-mono text-xs text-foreground hover:bg-muted"
              variant="outline"
            >
              {copiedInstall ? (
                <>
                  <Check size={11} className="text-foreground" />
                  <span className="text-foreground">copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  copy
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap");
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
