import Link from "next/link";
import {
  ArrowRight,
  Terminal,
  ShieldAlert,
  GitBranch,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Terminal,
    title: "Live Trace Analysis",
    description:
      "Intercepts stack traces as they happen and explains the root cause in-line.",
  },
  {
    icon: ShieldAlert,
    title: "Security Scanning",
    description:
      "Deep-scans for SQLi, XSS, secrets, and OWASP Top 10 risks before you push.",
  },
  {
    icon: Cpu,
    title: "Slop Detection",
    description:
      "Flags hallucinated imports, non-existent APIs, and low-confidence AI code.",
  },
  {
    icon: GitBranch,
    title: "Git-Aware Diffs",
    description:
      "Connects errors to the commit that introduced them and suggests fixes.",
  },
];

const stats = [
  { value: "< 50ms", label: "trace capture latency" },
  { value: "92%", label: "root cause accuracy" },
  { value: "0", label: "cloud data egress" },
];

export default function MainDocsPage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <Badge variant="outline">v0.1.0-beta now available</Badge>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
            The AI debugger that
            <span className="block text-zinc-400">lives in your shell.</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            Votrio wraps your terminal process, intercepts errors in real time,
            and explains stack traces while scanning for security risks.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/documentation/installation">
              Get Started <ArrowRight size={14} />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/documentation/quickstart">Quick Start</Link>
          </Button>
        </div>
      </section>

      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/70 px-4 py-3 font-mono text-sm text-zinc-300">
        <span className="text-zinc-600 select-none">$</span> npm install -g
        votrio
        <span className="ml-auto text-zinc-600 text-xs hidden sm:inline">
          node larger than 18 required
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white">
                {s.value}
              </CardTitle>
              <CardDescription className="text-xs">{s.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">What Votrio does</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Icon size={18} />
                    <CardTitle>{f.title}</CardTitle>
                  </div>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">Why Votrio?</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Most security tools are reactive. Votrio is proactive by sitting
          directly in your shell and catching issues before they ship.
        </p>
        <ul className="space-y-2 pt-1">
          {[
            "Runs locally - your code never leaves your machine",
            "Wraps any process: Node, Python, Go, Rust, and more",
            "Zero-config to start, deeply configurable when needed",
            "Designed for AI-heavy codebases (Cursor, Copilot, Claude Code)",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-zinc-400"
            >
              <CheckCircle2 size={14} className="text-zinc-200 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800/70 bg-zinc-950/60">
        <div>
          <p className="text-white font-semibold text-sm">Ready to install?</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Takes less than 30 seconds.
          </p>
        </div>
        <Button asChild>
          <Link href="/documentation/installation">
            Installation <ArrowRight size={14} />
          </Link>
        </Button>
      </section>
    </div>
  );
}
