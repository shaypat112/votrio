"use client";

import Link from "next/link";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Code2,
  Check,
  GraduationCap,
  Globe2,
  Landmark,
  Network,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpotlightCard } from "@/components/ui/spotlight-card";

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



const proofPoints = [
  { value: "24/7", label: "security signal coverage" },
  { value: "10×", label: "faster feedback loops" },
  { value: "100%", label: "read-only by default" },
];

const steps = [
  { number: "01", title: "Define the mission", description: "Align on your developers, repositories, and the outcomes that matter most." },
  { number: "02", title: "Build the workflow", description: "Connect Votrio to the way your team already reviews, learns, and ships." },
  { number: "03", title: "Measure the lift", description: "Turn security signals into visible progress your ecosystem can feel." },
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
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(139,92,246,0.045),transparent_28rem)]" />

      <main className="relative mx-auto max-w-7xl">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={reveal}
          transition={{ duration }}
          className="mx-auto max-w-4xl text-center"
        >

          <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-foreground sm:text-7xl">
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
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-card/50 px-3 py-5 shadow-2xl shadow-violet-950/10 backdrop-blur-xl sm:px-6">
            {proofPoints.map((point) => (
              <div key={point.value} className="px-2 text-center sm:px-5">
                <p className="text-xl font-semibold tracking-tight sm:text-2xl">{point.value}</p>
                <p className="mt-1 text-[10px] uppercase leading-4 tracking-[0.14em] text-muted-foreground sm:text-xs">{point.label}</p>
              </div>
            ))}
          </div>
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
                <motion.div
                  key={partner.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={reveal}
                  transition={{ duration, delay: reducedMotion ? 0 : index * 0.1 }}
                  whileHover={reducedMotion ? undefined : { y: -8 }}
                  className="h-full"
                >
                  <SpotlightCard className="h-full p-7">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-background/70 shadow-xl backdrop-blur ${partner.accent}`}><Icon className="h-6 w-6" /></span>
                      <span className="flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground"><BadgeCheck className="h-3 w-3 text-emerald-300" />{partner.badge}</span>
                    </div>
                    <p className={`mt-9 text-xs font-semibold uppercase tracking-[0.2em] ${partner.accent}`}>{partner.category}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">{partner.name}</h3>
                    <p className="mt-4 min-h-24 text-sm leading-7 text-muted-foreground">{partner.description}</p>
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground/80"><span className="h-px w-8 bg-current transition-all duration-300 group-hover:w-12" />Building with Votrio</div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={reveal}
          transition={{ duration, delay: 0.05 }}
          className="mt-28 grid gap-8 rounded-[2rem] border border-border/70 bg-card/40 p-7 backdrop-blur-xl sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"
        >
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300"><Sparkles className="h-5 w-5" /></div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">A partnership, not a logo wall</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Make secure development part of your advantage.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">The best partnerships create momentum on both sides. We bring the intelligence layer; you bring the community, workflow, or domain where it can make a difference.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="group rounded-2xl border border-border/70 bg-background/55 p-5 transition-colors hover:border-violet-400/35 hover:bg-background/80">
                <span className="text-xs font-semibold tracking-[0.2em] text-violet-300">{step.number}</span>
                <h3 className="mt-8 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={reveal}
          transition={{ duration }}
          className="mt-8 grid gap-4 sm:grid-cols-3"
        >
          {[
            { icon: Globe2, title: "For platforms", text: "Give every team in your ecosystem a security-aware development layer." },
            { icon: GraduationCap, title: "For educators", text: "Teach secure engineering with feedback students can understand and act on." },
            { icon: Building2, title: "For operators", text: "Create a shared source of truth across repositories, teams, and releases." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border/70 bg-card/35 p-5 transition-transform hover:-translate-y-1">
              <Icon className="h-5 w-5 text-sky-300" />
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-foreground/70"><Check className="h-3.5 w-3.5 text-emerald-300" />Clear outcomes, shared openly</div>
            </div>
          ))}
        </motion.section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={reveal} transition={{ duration }} className="relative mt-28 overflow-hidden rounded-[2.25rem] border border-violet-400/20 bg-card/80 p-8 sm:p-12">
          <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-white/10 sm:block"><div className="absolute inset-4 rounded-full border border-white/10"><div className="absolute inset-4 rounded-full bg-violet-400/20 blur-sm" /></div></div>
          <div className="relative max-w-2xl"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Partner with purpose</p><h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Bring safer AI development to your ecosystem.</h2><p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">Whether you serve developers, teach the next generation, or operate critical software, let’s build a partnership around measurable engineering outcomes.</p><Button asChild size="lg" className="group mt-8 rounded-full px-6"><Link href="/settings?section=feedback">Start the conversation <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button><Link href="/documentation" className="ml-5 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">See how it works <ArrowUpRight className="h-4 w-4" /></Link></div>
        </motion.section>

        <PartnerAccessForm reducedMotion={Boolean(reducedMotion)} />
      </main>
    </div>
  );
}

function PartnerAccessForm({ reducedMotion }: { reducedMotion: boolean }) {
  const [form, setForm] = React.useState({ name: "", business: "", email: "", teamSize: "", message: "" });
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = React.useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to submit your request.");
      setStatus("success");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit your request.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative mt-10 overflow-hidden rounded-[2rem] border border-emerald-400/25 bg-card/80 p-10 text-center shadow-lg sm:p-16"><motion.div animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], rotate: [0, 5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-300/40 bg-emerald-300/10 text-emerald-300"><BadgeCheck className="h-7 w-7" /></motion.div><h2 className="mt-6 text-3xl font-semibold tracking-tight">You’re on our radar.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">Thanks for reaching out. We’ll follow up with next steps for your team shortly.</p></motion.section>;
  }

  const fieldClass = "h-11 rounded-xl border-border/80 bg-background/60 px-3.5 focus-visible:border-violet-300/60 focus-visible:ring-violet-300/15";
  return <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="relative mt-10 overflow-hidden rounded-[2rem] border border-border/80 bg-card/70 p-7 shadow-lg shadow-black/5 sm:p-10"><div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-violet-300/10" /><div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Team access</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Build with Votrio from day one.</h2><p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">Tell us a little about your business and we’ll help shape the right partnership or early-access path.</p><div className="mt-7 space-y-3 text-sm text-muted-foreground"><p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" />Early access for engineering teams</p><p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" />A guided setup conversation</p><p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" />No obligation, just a useful first step</p></div></div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Input required aria-label="Your name" placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} /><Input required aria-label="Business name" placeholder="Business name" value={form.business} onChange={(event) => setForm({ ...form, business: event.target.value })} className={fieldClass} /><Input required type="email" aria-label="Work email" placeholder="Work email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} /><select aria-label="Team size" value={form.teamSize} onChange={(event) => setForm({ ...form, teamSize: event.target.value })} className={fieldClass}><option value="">Team size</option><option>1–10</option><option>11–50</option><option>51–250</option><option>251+</option></select><textarea aria-label="What are you building?" placeholder="What are you building? (optional)" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="min-h-28 rounded-xl border border-border/80 bg-background/60 px-3.5 py-3 text-sm outline-none transition focus:border-violet-300/60 focus:ring-3 focus:ring-violet-300/15 sm:col-span-2" /><div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">We’ll only use this to respond to your request.</p><Button type="submit" disabled={status === "loading"} className="group rounded-full px-6">{status === "loading" ? "Sending…" : "Request team access"}<ArrowRight className="transition-transform group-hover:translate-x-1" /></Button></div>{status === "error" && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}</form></div></motion.section>;
}
