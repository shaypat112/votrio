import Link from "next/link";
import { Terminal, ShieldCheck, Cpu, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Terminal,
    title: "Live Trace Analysis",
    description:
      "Wrap any command and get root-cause summaries as errors stream in.",
    command: 'votrio run "npm start"',
  },
  {
    icon: ShieldCheck,
    title: "Security Scanning",
    description:
      "Scan your repo for secrets, injection risks, and unsafe patterns.",
    command: "votrio scan",
  },
  {
    icon: Cpu,
    title: "Slop Detection",
    description:
      "Flag hallucinated imports and low-confidence AI-generated code blocks.",
    command: "votrio scan --fix",
  },
  {
    icon: GitBranch,
    title: "Git-Aware Context",
    description:
      "Pinpoint the commit that introduced a failure and outline a fix.",
    command: "votrio run --verbose",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="pt-20 pb-16">
          <div className="flex flex-col gap-6">
            <Badge variant="subtle">Built for terminal-native teams</Badge>
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white">
                AI security and debugging
                <span className="block text-zinc-400">without leaving your shell.</span>
              </h1>
              <p className="max-w-2xl text-base sm:text-lg text-zinc-400">
                Votrio watches your command output, analyzes stack traces, and
                scans repos for security issues and AI-generated slop.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/documentation/installation">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/documentation">Read the docs</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-3 text-zinc-200">
                    <Icon size={18} />
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-zinc-800/70 bg-black/40 px-3 py-2 text-xs text-zinc-300 font-mono">
                    $ {feature.command}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="pt-14 pb-20">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Works with your existing flow</CardTitle>
              <CardDescription>
                No web dashboards. No repo uploads. Votrio runs locally and only
                uses your API key when you opt in to AI analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm text-zinc-400">
              <div className="rounded-lg border border-zinc-800/60 bg-black/30 p-3">
                Wrap any process: Node, Python, Go, Rust
              </div>
              <div className="rounded-lg border border-zinc-800/60 bg-black/30 p-3">
                Security scanning for CI or pre-commit
              </div>
              <div className="rounded-lg border border-zinc-800/60 bg-black/30 p-3">
                Simple config via `votrio init`
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
