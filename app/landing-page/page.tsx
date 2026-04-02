"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Moon,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Terminal,
  Workflow,
} from "lucide-react";

import { useTheme } from "@/app/components/theme-provider";

const scanLines = [
  "$ votrio run \"npm run dev\"",
  "Intercepting runtime errors and stack traces...",
  "Scanning for secrets, SQLi, XSS, and OWASP risks...",
  "Flagging hallucinated imports and low-confidence AI code...",
  "Report ready: root cause, severity, and fix direction",
];

const metrics = [
  { label: "Trace capture", value: "< 50ms" },
  { label: "Root cause accuracy", value: "92%" },
  { label: "Cloud data egress", value: "0" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Security scanning before code ships",
    body: "Catch secrets, SQL injection, XSS, weak auth flows, and other risky patterns before they land in CI or production.",
  },
  {
    icon: Workflow,
    title: "Lives directly in the shell",
    body: "Wrap your existing commands, inspect stack traces in real time, and connect failures back to the code path that caused them.",
  },
  {
    icon: Sparkles,
    title: "Built for AI-heavy codebases",
    body: "Detect hallucinated imports, broken assumptions, and slop before reviewers waste time untangling machine-generated mistakes.",
  },
];

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm transition hover:bg-muted"
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      {theme === "dark" ? (
        <SunMedium className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

function TerminalCard() {
  const [visibleCount, setVisibleCount] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;

    const timers = scanLines.map((_, index) =>
      window.setTimeout(() => setVisibleCount(index + 1), 260 * (index + 1)),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [inView]);

  return (
    <div
      ref={ref}
      className="rounded-[2rem] border border-border bg-card p-5 shadow-[0_24px_80px_rgba(0,0,0,0.08)]"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/35" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/50" />
      </div>

      <div className="space-y-2 font-mono text-sm text-muted-foreground">
        {scanLines.map((line, index) =>
          visibleCount > index ? (
            <motion.p
              key={line}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {line}
            </motion.p>
          ) : (
            <div key={line} className="h-[1.3rem]" />
          ),
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={visibleCount === scanLines.length ? { opacity: 1, y: 0 } : {}}
        className="mt-6 rounded-[1.5rem] border border-border bg-background p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Summary
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">
              Root cause, severity, and suggested fix path.
            </p>
          </div>
          <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
            Ready
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {metrics.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.25rem] border border-border bg-card px-4 py-3"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(127,127,127,0.12),transparent_36%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-1/2 top-[-14rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,59,48,0.2),rgba(255,159,10,0.18),rgba(255,214,10,0.16),rgba(52,199,89,0.17),rgba(90,200,250,0.2),rgba(0,122,255,0.18),rgba(175,82,222,0.18),rgba(255,59,48,0.2))] blur-3xl" />
        <div className="absolute left-1/2 top-[-5rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-white/20 opacity-70 blur-[2px]" />
        <div className="absolute left-1/2 top-[3rem] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-background/85 blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-6 sm:px-10 sm:pb-28 sm:pt-8">
        <div className="flex items-center justify-end">
          <ThemeToggle />
        </div>

        <section className="grid min-h-[calc(100vh-6rem)] items-center gap-14 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <FadeIn className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security startup for modern dev teams
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-[clamp(3rem,8vw,6rem)] font-semibold tracking-[-0.06em] text-balance">
                Catch security bugs and broken AI code before they ship.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Votrio is a shell-native security platform that scans repos,
                explains stack traces, flags AI slop, and turns noisy findings
                into clear remediation steps for engineering teams.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Sign up
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-85"
              >
                Start demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/documentation"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <Terminal className="h-4 w-4" />
                Read docs
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {[
                "Live trace analysis in your terminal",
                "OWASP, secrets, and risky pattern detection",
                "Git-aware reports with human-readable fixes",
              ].map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-foreground" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.08} className="relative">
            <div className="pointer-events-none absolute inset-[-8%] -z-10 rounded-[3rem] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,59,48,0.14),rgba(255,159,10,0.12),rgba(255,214,10,0.12),rgba(52,199,89,0.12),rgba(90,200,250,0.14),rgba(0,122,255,0.12),rgba(175,82,222,0.12),rgba(255,59,48,0.14))] opacity-70 blur-3xl" />
            <div className="pointer-events-none absolute inset-[8%] -z-10 rounded-[2.5rem] border border-white/15 opacity-70 blur-sm" />
            <div className="pointer-events-none absolute inset-[18%] -z-10 rounded-[2rem] bg-background/70 blur-2xl" />
            <TerminalCard />
          </FadeIn>
        </section>

        <section className="grid gap-4 border-t border-border pt-10 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, index) => (
            <FadeIn
              key={title}
              delay={0.12 + index * 0.08}
              className="rounded-[1.75rem] border border-border bg-card p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {body}
              </p>
            </FadeIn>
          ))}
        </section>

        <FadeIn
          delay={0.28}
          className="mt-4 rounded-[1.75rem] border border-border bg-card p-6 sm:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Why Votrio
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Security tooling that developers actually use.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Most security tools are reactive and noisy. Votrio sits inside
                the developer workflow, explains what broke, why it matters,
                and what to fix next.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Runs locally so your code stays on your machine",
                "Wraps any process with votrio run for live debugging",
                "Scans repositories with CLI and CI-friendly severity controls",
                "Designed for teams using Cursor, Copilot, and Claude Code",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-border bg-background px-4 py-4 text-sm text-muted-foreground"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                    <span>{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
