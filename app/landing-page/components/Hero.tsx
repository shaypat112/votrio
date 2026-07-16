"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, ShieldHalf } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";
import { ThreatGraph } from "./ThreatGraph";

export function Hero() {
  return (
    <section className="relative grid items-center gap-16 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
      <div className="pointer-events-none absolute inset-x-0 top-[-6rem] -z-10 h-[30rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(240,166,58,0.10),transparent_70%)]" />

      <FadeIn className="space-y-8">


        <div className="space-y-6">
          <h1 className="max-w-2xl text-[clamp(2.75rem,6.4vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-balance">
            Ship AI-generated code without shipping its vulnerabilities.
          </h1>
          <p className="max-w-lg text-lg leading-7 text-muted-foreground">
            Votrio reads your repository like a security engineer would —
            mapping architecture, tracing attack paths, and shipping
            production-ready fixes before a vulnerability ever reaches main.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-85"
          >
            Join waitlist
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <Play className="h-3.5 w-3.5" />
            View demo
          </Link>
        </div>

        <div className="flex items-center gap-6 pt-2 font-mono text-xs text-muted-foreground">
          <span>Scans in minutes, not sprints</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <span className="hidden sm:block">No code leaves your environment</span>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <ThreatGraph />
      </FadeIn>
    </section>
  );
}
