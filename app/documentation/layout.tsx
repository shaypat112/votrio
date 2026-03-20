import Link from "next/link";
import { Terminal, ShieldCheck, Cpu, BookOpen } from "lucide-react";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-black text-zinc-200">
      <aside className="w-64 border-r border-zinc-800/80 hidden md:block p-6 sticky top-0 h-screen bg-black">
        <div className="space-y-8">
          <div>
            <h4 className="text-zinc-500 font-semibold mb-4 text-[10px] tracking-[0.35em] uppercase">
              Getting Started
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/documentation"
                  className="hover:text-white transition-colors"
                >
                  Introduction
                </Link>
              </li>

              <li>
                <Link
                  href="/documentation/installation"
                  className="hover:text-white transition-colors"
                >
                  Installation
                </Link>
              </li>
              <li>
                <Link
                  href="/documentation/quickstart"
                  className="hover:text-white transition-colors"
                >
                  Quick Start
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-500 font-semibold mb-4 text-[10px] tracking-[0.35em] uppercase">
              Core Features
            </h4>
            <ul className="space-y-3 text-sm text-zinc-500">
              <li className="flex items-center gap-2">
                <Terminal size={14} /> Stack Traces
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} /> Security
              </li>
              <li className="flex items-center gap-2">
                <Cpu size={14} /> Slop Detection
              </li>
              <li className="flex items-center gap-2">
                <BookOpen size={14} /> Git-aware Context
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-16 max-w-4xl">{children}</main>
    </div>
  );
}
