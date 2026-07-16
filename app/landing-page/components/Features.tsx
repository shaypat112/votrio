"use client";

import {
  Brain,
  Network,
  Route,
  Gauge,
  ShieldAlert,
  Wrench,
  Building2,
  History,
} from "lucide-react";
import { FadeIn } from "../shared/FadeIn";
import { Eyebrow } from "../shared/Eyebrow";

const features = [
  {
    icon: Brain,
    title: "AI codebase intelligence",
    detail: "Understands intent, not just syntax — reads code the way the engineer who wrote it would explain it.",
  },
  {
    icon: Network,
    title: "Repository knowledge graph",
    detail: "Maps every service, dependency, and trust boundary into a single navigable model of your system.",
  },
  {
    icon: Route,
    title: "Attack path simulation",
    detail: "Chains individual findings together to show how they combine into a real, exploitable breach.",
  },
  {
    icon: Gauge,
    title: "Security risk scoring",
    detail: "Weighs exploitability and blast radius, not just count, so your team fixes what matters first.",
  },
  {
    icon: ShieldAlert,
    title: "AI vulnerability detection",
    detail: "Catches architectural and logic-level flaws that pattern-matching scanners are built to miss.",
  },
  {
    icon: Wrench,
    title: "Automated remediation plans",
    detail: "Ships a patch scoped to your code, plus the validation steps to confirm it actually closes the gap.",
  },
  {
    icon: Building2,
    title: "Architecture analysis",
    detail: "Flags risky design patterns — overbroad permissions, unclear ownership, missing isolation — early.",
  },
  {
    icon: History,
    title: "Security history tracking",
    detail: "Every scan, finding, and fix is logged, so audits take minutes instead of a week of Slack archaeology.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border py-24">
      <FadeIn className="max-w-xl">
        <Eyebrow>Capabilities</Eyebrow>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a security engineer would check — automated.
        </h2>
      </FadeIn>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <FadeIn key={f.title} delay={0.04 * i}>
            <div className="h-full rounded-2xl border border-border bg-card p-6 transition hover:border-foreground/20">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background">
                <f.icon className="h-4.5 w-4.5 text-foreground" />
              </span>
              <h3 className="mt-4 text-sm font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.detail}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
