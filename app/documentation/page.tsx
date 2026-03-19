import { ArrowRight, Terminal, ShieldAlert, Zap } from "lucide-react";
import Link from "next/link";

export default function MainDocsPage() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Hero section for Docs */}
      <section className="space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          Documentation
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Vigilance is an advanced CLI tool that bridges the gap between your
          local terminal and AI-powered security analysis.
        </p>
      </section>

      {/* Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors">
          <Terminal className="text-emerald-500 mb-3" size={24} />
          <h3 className="text-white font-bold mb-2">Live Debugging</h3>
          <p className="text-sm text-zinc-500">
            Catch and explain stack traces as they happen in your terminal.
          </p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors">
          <ShieldAlert className="text-cyan-500 mb-3" size={24} />
          <h3 className="text-white font-bold mb-2">Security Audits</h3>
          <p className="text-sm text-zinc-500">
            Scan your GitHub repositories for SQLi, XSS, and leaked secrets.
          </p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors">
          <Zap className="text-yellow-500 mb-3" size={24} />
          <h3 className="text-white font-bold mb-2">Slop Filter</h3>
          <p className="text-sm text-zinc-500">
            Identify and flag hallucinated or low-quality AI-generated code.
          </p>
        </div>
      </div>

      {/* Navigation Call to Action */}
      <section className="pt-6">
        <Link
          href="/documentation/installation"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-all"
        >
          Start Installation <ArrowRight size={18} />
        </Link>
      </section>

      {/* Why Vigilance Section */}
      <section className="space-y-4 pt-10">
        <h2 className="text-2xl font-bold text-white">Why Vigilance?</h2>
        <p className="text-zinc-400 leading-relaxed">
          Most security tools are reactive—they tell you what went wrong after
          you've pushed to production. Vigilance is <strong>proactive</strong>.
          By sitting directly in your shell, it acts as a first line of defense,
          catching developer errors before they ever leave your machine.
        </p>
      </section>
    </div>
  );
}
