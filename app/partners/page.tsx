"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Code2,
  GraduationCap,
  Landmark,
  Network,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const partners = [
  {
    name: "BP Gas Station",
    category: "Retail infrastructure",
    description: "Continuously reviewing AI-assisted code and hardening customer-facing production systems before release.",
    badge: "Enterprise partner",
    icon: Building2,
    color: "from-emerald-400/25 via-emerald-400/5 to-transparent",
    accent: "text-emerald-300",
  },
  {
    name: "Charlotte Student Hub",
    category: "Developer education",
    description: "Helping student developers understand repository architecture, code quality, and secure engineering practices.",
    badge: "Education partner",
    icon: GraduationCap,
    color: "from-sky-400/25 via-sky-400/5 to-transparent",
    accent: "text-sky-300",
  },
  {
    name: "Finero",
    category: "Financial technology",
    description: "Finding vulnerabilities earlier and turning repository intelligence into focused, reviewable remediation work.",
    badge: "Technology partner",
    icon: Landmark,
    color: "from-violet-400/25 via-violet-400/5 to-transparent",
    accent: "text-violet-300",
  },
];

const capabilities = [
  { icon: Network, label: "Repository intelligence" },
  { icon: ShieldCheck, label: "Security review" },
  { icon: Code2, label: "Actionable fixes" },
  { icon: Zap, label: "Faster delivery" },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function PartnersPage() {
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.65;

  return (
    <div className="relative -mx-6 -my-10 min-h-screen overflow-hidden bg-background px-6 py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]"
          animate={reducedMotion ? undefined : { x: [0, 70, 0], y: [0, 35, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[4%] top-48 h-96 w-96 rounded-full bg-sky-500/12 blur-[120px]"
          animate={reducedMotion ? undefined : { x: [0, -55, 0], y: [0, 60, 0], scale: [1.1, 0.9, 1.1] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.12] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      </div>

      <main className="relative mx-auto max-w-7xl">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={reveal}
          transition={{ duration }}
          className="mx-auto max-w-4xl text-center"
        >

          <h1 className="mt-7 bg-gradient-to-b from-foreground via-foreground to-foreground/45 bg-clip-text text-5xl font-semibold tracking-[-0.05em] text-transparent sm:text-7xl">
            Better software is a team sport.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            We work with ambitious teams, educators, and technology leaders to make AI-assisted development safer, clearer, and ready for production.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group rounded-full px-6 shadow-[0_0_36px_rgba(139,92,246,.22)]">
              <Link href="/settings?section=feedback">Become a partner <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-border/80 bg-background/50 px-6 backdrop-blur">
              <Link href="/documentation">Explore the platform</Link>
            </Button>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={reveal}
          transition={{ duration, delay: 0.1 }}
          className="mt-16 grid overflow-hidden rounded-3xl border border-border/70 bg-card/45 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4"
        >
          {capabilities.map(({ icon: Icon, label }, index) => (
            <div key={label} className={`flex items-center gap-3 p-5 ${index ? "border-t border-border/70 sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-t lg:border-t-0" : ""}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><Icon className="h-4 w-4" /></span>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </motion.section>

        <section className="mt-28">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={reveal} transition={{ duration }} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Built together</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Partners shaping secure development</h2></div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">Real organizations applying repository intelligence to real engineering workflows.</p>
          </motion.div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {partners.map((partner, index) => {
              const Icon = partner.icon;
              return (
                <motion.article
                  key={partner.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={reveal}
                  transition={{ duration, delay: reducedMotion ? 0 : index * 0.1 }}
                  whileHover={reducedMotion ? undefined : { y: -8 }}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/60 p-7 shadow-2xl shadow-black/5 backdrop-blur-xl transition-colors hover:border-violet-400/30"
                >
                  <div className={`absolute inset-x-0 top-0 h-44 bg-gradient-to-b ${partner.color} opacity-70 transition-opacity group-hover:opacity-100`} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-background/70 shadow-xl backdrop-blur ${partner.accent}`}><Icon className="h-6 w-6" /></span>
                      <Badge variant="outline" className="bg-background/50"><BadgeCheck className="mr-1 h-3 w-3" />{partner.badge}</Badge>
                    </div>
                    <p className={`mt-9 text-xs font-semibold uppercase tracking-[0.2em] ${partner.accent}`}>{partner.category}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">{partner.name}</h3>
                    <p className="mt-4 min-h-24 text-sm leading-7 text-muted-foreground">{partner.description}</p>
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground/80"><span className="h-px w-8 bg-current transition-all duration-300 group-hover:w-12" />Building with Votrio</div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={reveal} transition={{ duration }} className="relative mt-28 overflow-hidden rounded-[2.25rem] border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.25),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.18),transparent_34%),var(--card)] p-8 sm:p-12">
          <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-white/10 sm:block"><div className="absolute inset-4 rounded-full border border-white/10"><div className="absolute inset-4 rounded-full bg-violet-400/20 blur-sm" /></div></div>
          <div className="relative max-w-2xl"><Badge variant="outline" className="bg-background/40">Partner with purpose</Badge><h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Bring safer AI development to your ecosystem.</h2><p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">Whether you serve developers, teach the next generation, or operate critical software, let’s build a partnership around measurable engineering outcomes.</p><Button asChild size="lg" className="group mt-8 rounded-full px-6"><Link href="/settings?section=feedback">Start the conversation <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button></div>
        </motion.section>
      </main>
    </div>
  );
}
