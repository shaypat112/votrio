"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Terminal,
  Play,
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
    return <span className="text-zinc-800">{line}</span>;
  }
  if (line.startsWith("[CRITICAL]")) {
    const rest = line.slice(10);
    const dash = rest.indexOf(" — ");
    if (dash !== -1) {
      return (
        <span>
          <span className="text-red-400 font-bold">[CRITICAL]</span>
          <span className="text-white font-semibold">
            {rest.slice(0, dash)}
          </span>
          <span className="text-zinc-600"> — </span>
          <span className="text-zinc-500">{rest.slice(dash + 3)}</span>
        </span>
      );
    }
    return (
      <span>
        <span className="text-red-400 font-bold">[CRITICAL]</span>
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
          <span className="text-orange-400 font-bold">[HIGH]</span>
          <span className="text-white font-semibold">
            {rest.slice(0, dash)}
          </span>
          <span className="text-zinc-600"> — </span>
          <span className="text-zinc-500">{rest.slice(dash + 3)}</span>
        </span>
      );
    }
    return (
      <span>
        <span className="text-orange-400 font-bold">[HIGH]</span>
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
          <span className="text-yellow-400 font-bold">[MEDIUM]</span>
          <span className="text-white font-semibold">
            {rest.slice(0, dash)}
          </span>
          <span className="text-zinc-600"> — </span>
          <span className="text-zinc-500">{rest.slice(dash + 3)}</span>
        </span>
      );
    }
    return (
      <span>
        <span className="text-yellow-400 font-bold">[MEDIUM]</span>
        <span className="text-zinc-300">{rest}</span>
      </span>
    );
  }
  if (line.startsWith("[LOW]")) {
    const rest = line.slice(5);
    return (
      <span>
        <span className="text-zinc-500 font-bold">[LOW]</span>
        <span className="text-zinc-400">{rest}</span>
      </span>
    );
  }
  if (line.startsWith("●")) {
    return (
      <span>
        <span className="text-cyan-400">●</span>
        <span className="text-zinc-400">{line.slice(1)}</span>
      </span>
    );
  }
  if (line.startsWith("✓")) {
    return (
      <span>
        <span className="text-cyan-400">✓</span>
        <span className="text-zinc-400">{line.slice(1)}</span>
      </span>
    );
  }
  if (line.startsWith("Run:")) {
    return (
      <span>
        <span className="text-zinc-600">Run: </span>
        <span className="text-cyan-400 font-mono">{line.slice(5)}</span>
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
  const [copied, setCopied] = useState(false);
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
    } catch (err: any) {
      setOutput((prev) => [...prev, "", `error: ${err.message}`, ""]);
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
        background: "#09090b",
        fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
      }}
    >
      {/* Subtle scanline texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-900 px-5 py-3 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-7 h-7 rounded border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center">
              <Shield size={13} className="text-cyan-400" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">
            votrio
          </span>
          <span className="text-zinc-700 text-xs">/</span>
          <span className="text-zinc-600 text-xs">demo</span>
          <Badge
            variant="outline"
            className="text-[10px] border-cyan-500/20 text-cyan-500/70 bg-cyan-500/5 px-1.5 py-0 ml-1"
          >
            LIVE
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={copyInstall}
          className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 h-7 px-3"
        >
          {copiedInstall ? (
            <>
              <Check size={11} className="text-cyan-400" />
              <span className="text-cyan-400">copied</span>
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
        <div className="flex-1 flex flex-col border-r border-zinc-900 min-w-0">
          {/* Sample selector strip */}
          <div className="px-4 py-3 border-b border-zinc-900 flex items-center gap-3 bg-zinc-950/40">
            <span className="text-[10px] text-zinc-700 uppercase tracking-[0.15em] font-bold shrink-0">
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
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300",
                  )}
                >
                  <span>{s.label}</span>
                  <span className="text-zinc-700">·</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      s.severity === "critical"
                        ? "text-red-500"
                        : "text-orange-500",
                    )}
                  >
                    {s.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor chrome */}
          <div className="px-4 py-2 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/20">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              </div>
              <span className="text-[10px] text-zinc-700 font-mono">
                {activeSample
                  ? `${activeSample}.${language === "python" ? "py" : language === "tsx" ? "tsx" : "js"}`
                  : "untitled"}
              </span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-[10px] font-mono bg-transparent border border-zinc-800 text-zinc-600 rounded px-2 py-0.5 focus:outline-none focus:border-zinc-600 hover:border-zinc-700 transition-colors"
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
            <div className="py-4 px-3 select-none border-r border-zinc-900/60 bg-zinc-950/30">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div
                  key={i}
                  className="text-[11px] leading-5 text-zinc-800 text-right"
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
              className="flex-1 bg-transparent text-zinc-300 p-4 resize-none focus:outline-none overflow-auto text-[12.5px] leading-5"
              style={{
                fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
                caretColor: "#22d3ee",
                tabSize: 2,
              }}
            />
          </div>

          {/* Action bar */}
          <div className="px-4 py-3 border-t border-zinc-900 flex gap-2 bg-zinc-950/40">
            <Button
              onClick={runScan}
              disabled={scanning}
              className={cn(
                "flex-1 h-9 text-xs font-mono font-bold gap-2 transition-all",
                scanning
                  ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-400 text-black border-0",
              )}
            >
              {scanning ? (
                <>
                  <span className="w-3 h-3 border border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
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
              className="h-9 w-9 p-0 border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-600 hover:text-zinc-300"
            >
              <RotateCcw size={13} />
            </Button>
          </div>
        </div>

        {/* Right panel — terminal */}
        <div className="flex-1 flex flex-col min-w-0 min-h-[380px] lg:min-h-0">
          {/* Terminal chrome */}
          <div className="px-4 py-2 border-b border-zinc-900 flex items-center gap-3 bg-zinc-950/40">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3a1a1a]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a1a]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#1a2a1a]" />
            </div>
            <span className="text-[10px] text-zinc-700 font-mono mx-auto">
              votrio — zsh — 80×24
            </span>
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                scanning
                  ? "bg-cyan-400 animate-pulse"
                  : ran
                    ? "bg-zinc-600"
                    : "bg-zinc-800",
              )}
            />
          </div>

          {/* Output */}
          <div
            ref={outputRef}
            className="flex-1 p-4 overflow-y-auto bg-[#09090b]"
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
      <footer className="relative z-10 border-t border-zinc-900 px-5 py-4 bg-zinc-950/60 backdrop-blur-sm">
        <div className="max-w-none flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="text-yellow-500/60 shrink-0" />
            <div>
              <p className="text-white text-xs font-semibold">
                Protect your real codebase
              </p>
              <p className="text-zinc-600 text-[11px] mt-0.5 font-mono">
                install globally · scan any project · zero config
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900/60 font-mono text-xs text-zinc-400">
              <span className="text-zinc-700">$</span>
              <span>npm install -g votrio</span>
            </div>
            <Button
              size="sm"
              onClick={copyInstall}
              className="h-8 px-3 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-600 gap-1.5"
              variant="outline"
            >
              {copiedInstall ? (
                <>
                  <Check size={11} className="text-cyan-400" />
                  <span className="text-cyan-400">copied</span>
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
