import ButtonAuth from "./components/Button";
import ViewSourceButton from "./components/ViewSource";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <main className="max-w-5xl w-full px-6 py-24">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center space-y-8 mb-20">
          <div className="px-3 py-1 text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded-full">
            Now detecting AI-generated slop
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Security for the <br />
            <span className="text-zinc-500">modern terminal.</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl leading-relaxed">
            Votrio intercepts stack traces, audits GitHub repos for injections,
            and identifies unoptimized AI-generated code—all from your CLI.
          </p>

          <div className="flex gap-4">
            <ButtonAuth />
            <ViewSourceButton />
          </div>
        </section>

        {/* Terminal Demo Section */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              <span className="ml-2 text-xs text-zinc-500 font-mono italic">
                votrio — zsh
              </span>
            </div>
            <div className="p-6 font-mono text-sm sm:text-base leading-relaxed">
              <div className="flex gap-3">
                <span className="text-emerald-500">➜</span>
                <span className="text-zinc-300">
                  npm install -g vigilance-cli
                </span>
              </div>
              <div className="flex gap-3 mt-2">
                <span className="text-emerald-500">➜</span>
                <span className="text-zinc-300">
                  votrio audit --repo "shaypat112/app"
                </span>
              </div>
              <div className="mt-4 text-zinc-500 animate-pulse">
                [info] Scanning for SQL Injections...
              </div>
              <div className="mt-1 text-red-400">
                [vulnerability] Potential injection found in /api/db.ts:L24
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
