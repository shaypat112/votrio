"use client";

import { Lock, Eye, GitBranch, Server } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";
import { Eyebrow } from "../shared/Eyebrow";



const principles = [
  {
    icon: Eye,
    title: "Read-only, scoped access",
    detail: "Votrio requests only the repository access it needs to analyze — never write access.",
  },
  {
    icon: Lock,
    title: "Encrypted in transit and at rest",
    detail: "Source code and findings are encrypted end to end, and never used to train external models.",
  },
  {
    icon: Server,
    title: "Built for enterprise from day one",
    detail: "Role-based access, audit logs, and a self-hosted deployment option on the roadmap.",
  },
  {
    icon: GitBranch,
    title: "Fits your existing workflow",
    detail: "GitHub and GitLab today, with CI checks and IDE integrations for Cursor and Copilot underway.",
  },
];

export function Trust() {
  return (
    <section id="trust" className="border-t border-border py-24">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <FadeIn>
          <Eyebrow>Security posture</Eyebrow>
          <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
            A security tool that treats your source code like a security tool should.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            We built Votrio for teams who won&apos;t compromise on how their
            code is handled — because we wouldn&apos;t either.
          </p>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2">
          {principles.map((p, i) => (
            <FadeIn key={p.title} delay={0.06 * i}>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background">
                  <p.icon className="h-4.5 w-4.5 text-foreground" />
                </span>
                <h3 className="mt-4 text-sm font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.detail}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
