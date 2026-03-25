import Link from "next/link";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="pt-20 pb-16">
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white">
                AI security and debugging
                <span className="block text-zinc-400">
                  without leaving your shell.
                </span>
              </h1>
              <p className="max-w-2xl text-base sm:text-lg text-zinc-400">
                Votrio watches your command output, analyzes stack traces, and
                scans repos for security issues and AI-generated slop.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/demo">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/documentation">Read the docs</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="pt-14 pb-20">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Works inside your repo</CardTitle>
              <CardDescription>
                Votrio runs locally and only uses your API key when you opt in
                to AI analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm text-zinc-400">
              <div className="rounded-lg border border-zinc-800/60 bg-black/30 p-3">
                Upload Repos for Automated and Manual review
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

        <section className="pb-20">
          <Card>
            <CardHeader>
              <CardTitle>Interactive CLI demo</CardTitle>
              <CardDescription>
                A sample run that mirrors the output from the CLI scanner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-zinc-800/70 bg-black/60 p-4 font-mono text-xs text-zinc-300">
                <div>$ votrio scan</div>
                <div className="text-zinc-500">Scanning 1,204 files...</div>
                <div className="mt-2">
                  [high] HARDCODED_SECRET (78) - src/api/auth.ts:42
                </div>
                <div className="text-zinc-500">
                  fix Rotate the leaked token and move to env
                </div>
                <div className="mt-2">
                  [medium] XSS_RISK (55) - src/pages/search.tsx:88
                </div>
                <div className="text-zinc-500">
                  fix Sanitize user input before rendering
                </div>
                <div className="mt-2">Report saved: scan-report.md</div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
