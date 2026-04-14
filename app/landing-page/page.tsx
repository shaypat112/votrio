"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Moon,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Terminal,
  Workflow,
  Play,
  RefreshCw,
  Code2,
  ScanLine,
} from "lucide-react";

import { useTheme } from "@/app/components/theme-provider";

const scanLines = [
  "$ votrio si-hack start",
  "Mapping attack paths, weak auth, secrets, and unsafe data flows...",
  "Debunking noisy findings and grouping the real issues by exploit chain...",
  "Report ready: issue-by-issue breakdown, suggested fixes, and next steps",
];

const metrics = [
  { label: "Sandbox mode", value: "Contained" },
  { label: "Issue review", value: "Chain by chain" },
  { label: "Fix output", value: "Actionable" },
];

const features = [
  {
    icon: Workflow,
    title: "JIT access without the extra overhead",
    body: "Grant short-lived access only when it is needed, keep the request flow lightweight, and make session control easy to understand.",
  },
  {
    icon: ShieldCheck,
    title: "Cleaner session controls",
    body: "Focus the product on access windows, runtime visibility, and approvals instead of extra setup surfaces that no longer matter.",
  },
  {
    icon: Sparkles,
    title: "SI-Hack as an ethical sandbox",
    body: "Spin up a contained environment, tear it apart safely, walk through each issue in context, then suggest fixes, hardening ideas, and follow-up checks.",
  },
];

const demoSteps = [
  {
    command: "$ votrio si-hack start",
    output: "Preparing isolated sandbox...",
    severity: "info",
  },
  {
    command: "",
    output: "🔴 HIGH: Privilege escalation path through admin token fallback",
    severity: "high",
  },
  {
    command: "",
    output: "🟠 MEDIUM: Unsanitized SQL builder reachable from support tools",
    severity: "medium",
  },
  {
    command: "",
    output: "🟡 LOW: Insecure webhook retry logic leaks internal error detail",
    severity: "low",
  },
  {
    command: "$ votrio si-hack --suggest-fixes",
    output: "Generated patch guidance, validation steps, and owner notes.",
    severity: "info",
  },
  {
    command: "",
    output:
      "✅ Sandbox run complete. Findings ranked, debunked, and ready to review.",
    severity: "success",
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
              Verified findings with fix direction and audit context.
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

function LaptopMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="relative rounded-t-2xl bg-gradient-to-b from-border to-border/20 p-1">
        <div className="flex items-center justify-between rounded-t-lg bg-card px-4 py-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="rounded-md bg-background/50 px-3 py-0.5 font-mono text-xs text-muted-foreground">
            votrio@terminal:~/project
          </div>
          <div className="w-12" />
        </div>
        <div className="rounded-b-lg bg-background p-4">{children}</div>
      </div>
      <div className="mx-auto h-2 w-24 rounded-b-2xl bg-border" />
    </div>
  );
}

function InteractiveScanDemo() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });

  useEffect(() => {
    if (!(inView && !isPlaying && step === 0)) return;
    const timer = window.setTimeout(() => setIsPlaying(true), 0);
    return () => window.clearTimeout(timer);
  }, [inView, isPlaying, step]);

  useEffect(() => {
    if (!isPlaying) return;
    if (step >= demoSteps.length) {
      const timer = window.setTimeout(() => setIsPlaying(false), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = setTimeout(
      () => {
        setStep((s) => s + 1);
      },
      step === 0 ? 800 : 1200,
    );
    return () => clearTimeout(timer);
  }, [step, isPlaying]);

  const resetDemo = () => {
    setStep(0);
    setIsPlaying(true);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-orange-500";
      case "low":
        return "text-yellow-500";
      case "success":
        return "text-green-500";
      default:
        return "text-cyan-500";
    }
  };

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/10 p-1.5">
            <ScanLine className="h-4 w-4 text-primary" />
          </div>
        </div>
        <button
          onClick={resetDemo}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium transition hover:bg-muted"
        >
          <RefreshCw className="h-3 w-3" />
          Replay
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card/50 font-mono text-sm">
        <div className="border-b border-border px-4 py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span>votrio-cli — interactive session</span>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <AnimatePresence mode="popLayout">
            {demoSteps.slice(0, step).map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l-2 border-primary/30 pl-3"
              >
                {item.command && (
                  <p className="text-foreground/80">{item.command}</p>
                )}
                <p className={getSeverityColor(item.severity)}>{item.output}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {step < demoSteps.length && isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs">Scanning in progress...</span>
            </motion.div>
          )}
          {step === demoSteps.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 rounded-lg bg-green-500/10 p-2 text-center text-xs text-green-600 dark:text-green-400"
            >
              ✓ Sandbox complete — 3 verified issues, fix guidance generated
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span>Fix suggestions ready</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span>Session controlled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          <span>Sandbox ready</span>
        </div>
      </div>
    </div>
  );
}

function FloatingElement({
  children,
  delay = 0,
  duration = 6,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      animate={{
        y: [0, -15, 0],
        rotate: [0, 2, -2, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Enhanced gradient backgrounds */}
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

        {/* Hero Section - Enhanced */}
        <section className="grid min-h-[calc(100vh-6rem)] items-center gap-14 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <FadeIn className="space-y-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              AI security workflows
            </motion.div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-[clamp(3rem,8vw,6rem)] font-semibold tracking-[-0.06em] text-balance">
                Secure access and ethical hacking sandboxes
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Votrio gives teams just-in-time access with clean temporary
                controls and runs SI-Hack sandboxes that tear apart a target
                system, debunk noise, and suggest real fixes.
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
                Book Demo
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
          </FadeIn>

          <FadeIn delay={0.08} className="relative">
            <FloatingElement delay={0} duration={8}>
              <div className="pointer-events-none absolute inset-[-8%] -z-10 rounded-[3rem] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,59,48,0.14),rgba(255,159,10,0.12),rgba(255,214,10,0.12),rgba(52,199,89,0.12),rgba(90,200,250,0.14),rgba(0,122,255,0.12),rgba(175,82,222,0.12),rgba(255,59,48,0.14))] opacity-70 blur-3xl" />
              <div className="pointer-events-none absolute inset-[8%] -z-10 rounded-[2.5rem] border border-white/15 opacity-70 blur-sm" />
              <div className="pointer-events-none absolute inset-[18%] -z-10 rounded-[2rem] bg-background/70 blur-2xl" />
            </FloatingElement>
            <TerminalCard />
          </FadeIn>
        </section>

        {/* Original Features Section */}
        <section className="grid gap-4 border-t border-border pt-10 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, index) => (
            <FadeIn
              key={title}
              delay={0.12 + index * 0.08}
              className="rounded-[1.75rem] border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
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

        <FadeIn delay={0.2} className="mt-20">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              <Play className="h-3 w-3" />
              Live demo
            </motion.div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Votrio Sandbox
            </h2>
          </div>

          <div className="mt-12">
            <LaptopMockup>
              <InteractiveScanDemo />
            </LaptopMockup>
          </div>
        </FadeIn>

        {/* Why Votrio Section - Enhanced */}
        <FadeIn delay={0.28} className="mt-20">
          <div className="rounded-[1.75rem] border border-border bg-card p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Product flow
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Built around how access and remediation really happen.
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Instead of sending users through repository submission flows
                  and old setup surfaces, Votrio centers the product on short
                  access windows and structured ethical attack simulation.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "JIT access starts fast without repository submission steps",
                  "Settings copy no longer leans on old infrastructure messaging",
                  "Suggested fixes come with follow-up checks so teams can verify remediation",
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
          </div>
        </FadeIn>

        {/* Integrations Section */}
        <FadeIn delay={0.32} className="mt-16">
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Core surfaces
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-8 opacity-60">
              {[
                "JIT Access",
                "Session Controls",
                "Audit Trail",
                "Fix Guidance",
                "Live Findings",
              ].map((tech) => (
                <div
                  key={tech}
                  className="flex items-center gap-2 font-mono text-sm"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{tech}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
