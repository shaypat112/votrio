import {
  ArrowRight,
  Terminal,
  ShieldAlert,
  Zap,
  GitBranch,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Terminal,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    title: "Live Trace Analysis",
    description:
      "Intercepts stack traces as they happen. No copy-pasting into ChatGPT. Instant root-cause explanations, inline in your terminal.",
  },
  {
    icon: ShieldAlert,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    title: "Security Scanning",
    description:
      "Deep-scans your codebase and GitHub repos for SQLi, XSS, hardcoded secrets, and OWASP Top 10 vulnerabilities before you push.",
  },
  {
    icon: Cpu,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    title: "Slop Detection",
    description:
      "Flags hallucinated imports, non-existent APIs, and low-confidence AI-generated code blocks before they break production.",
  },
  {
    icon: GitBranch,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "Git-Aware Diffs",
    description:
      "Understands your git history. Surfaces which recent commit introduced the error and generates a targeted fix patch.",
  },
];

const stats = [
  { value: "< 50ms", label: "trace capture latency" },
  { value: "92%", label: "root cause accuracy" },
  { value: "0", label: "cloud data egress" },
];

export default function MainDocsPage() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-mono font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          v0.1.0-beta — now available
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          The AI debugger that
          <br />
          <span className="text-emerald-400">lives in your shell.</span>
        </h1>

        <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Votrio wraps your terminal process, intercepts errors in real time,
          and uses AI to explain stack traces, detect security vulnerabilities,
          and flag AI-generated code issues — all without leaving your workflow.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/documentation/installation"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black rounded-lg font-bold text-sm hover:bg-emerald-400 transition-colors"
          >
            Get Started <ArrowRight size={15} />
          </Link>
          <Link
            href="/documentation/quickstart"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 text-white rounded-lg font-medium text-sm hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            Quick Start
          </Link>
        </div>
      </section>

      {/* Install strip */}
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 font-mono text-sm">
        <span className="text-zinc-600 select-none">$</span>
        <span className="text-emerald-400">npm install -g votrio</span>
        <span className="ml-auto text-zinc-600 text-xs hidden sm:block">
          node ≥ 18 required
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="text-center py-4 rounded-xl border border-zinc-800 bg-zinc-900/30"
          >
            <p className="text-2xl font-extrabold text-white font-mono">
              {s.value}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">What Votrio does</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`p-5 rounded-xl border ${f.bg} transition-colors hover:brightness-110`}
              >
                <Icon className={`${f.color} mb-3`} size={20} />
                <h3 className="text-white font-semibold text-sm mb-1.5">
                  {f.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Votrio */}
      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-6">
        <h2 className="text-xl font-bold text-white">Why Votrio?</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Most security tools are reactive — they tell you what went wrong after
          you've already pushed to production. Votrio is{" "}
          <span className="text-white font-semibold">proactive</span>. By
          sitting directly in your shell, it acts as a first line of defense,
          catching developer errors and security issues before they ever leave
          your machine.
        </p>
        <ul className="space-y-2 pt-1">
          {[
            "Runs locally — your code never leaves your machine",
            "Wraps any process: Node, Python, Go, Rust, and more",
            "Zero-config to start, deeply configurable when needed",
            "Designed for AI-heavy codebases (Cursor, Copilot, Claude Code)",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-zinc-400"
            >
              <CheckCircle2
                size={15}
                className="text-emerald-500 mt-0.5 flex-shrink-0"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Next step CTA */}
      <section className="flex items-center justify-between p-5 rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div>
          <p className="text-white font-semibold text-sm">Ready to install?</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Takes less than 30 seconds.
          </p>
        </div>
        <Link
          href="/documentation/installation"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors"
        >
          Installation <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
