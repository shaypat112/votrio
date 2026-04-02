import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Scan the repo before reviewers do",
    description:
      "Catch secrets, risky patterns, and brittle code paths before they reach CI or production.",
    icon: ShieldCheck,
  },
  {
    title: "Turn Mistral output into signal",
    description:
      "Summaries, likely impact, and fix directions show up in a cleaner interface instead of a noisy wall of text.",
    icon: Sparkles,
  },
  {
    title: "Stay in one workflow",
    description:
      "Move from terminal output to scan report to remediation without bouncing between disconnected tools.",
    icon: TerminalSquare,
  },
];

const proofPoints = [
  "Repo scans with AI-written summaries",
  "Stack trace triage for local debugging",
  "Reports that are readable by humans, not just linters",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="pb-16 pt-16 sm:pb-20 sm:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-xs"
              >
                Security scanning, AI triage, and cleaner debugging
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
                  Votrio | AI for faster triage and debugging of security
                  findings
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Votrio watches your command output, pulls signal out of noisy
                  scans, and gives your team a faster path from finding to fix.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full px-5">
                  <Link href="/demo">
                    Start a demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-5"
                >
                  <Link href="/documentation">Read the docs</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {proofPoints.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-card px-3 py-1.5"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <Card className="border-border bg-card shadow-lg">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center justify-between">
                  <span>Live scanner snapshot</span>
                  <Badge variant="outline" className="rounded-full">
                    CLI + AI
                  </Badge>
                </CardTitle>
                <CardDescription>
                  A cleaner handoff from terminal scan to AI summary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="rounded-2xl border border-border bg-muted/30 p-4 font-mono text-xs text-muted-foreground">
                  <div className="text-foreground">
                    $ votrio scan --repo acme/payments
                  </div>
                  <div>Analyzing 1,204 files and recent traces...</div>
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                    [high] HARDCODED_SECRET · src/api/auth.ts:42
                  </div>
                  <div className="mt-2 rounded-xl border border-border bg-background p-3 text-foreground">
                    AI summary: rotate the leaked token, move secrets to env,
                    and add a commit-time secret scan.
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Risk
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      High
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Findings
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      17
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Confidence
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      92%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="pb-14">
          <div className="grid gap-4 md:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="border-border bg-card shadow-sm">
                <CardHeader>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted/60">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="pt-2">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="pb-20">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Why the flow feels better</CardTitle>
              <CardDescription>
                The landing page now sells the product with more structure,
                contrast, and proof without the loud background treatment.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                Intentional hierarchy for the first impression
              </div>
              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                More visual contrast between proof, product, and action
              </div>
              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                Better AI presentation inside detail pages and settings
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
