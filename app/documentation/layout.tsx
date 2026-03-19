import Link from "next/link";
import { Terminal, ShieldCheck, Cpu, BookOpen } from "lucide-react";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-black text-zinc-300">
      {/* Fixed Sidebar */}
      <aside className="w-64 border-r border-zinc-800 hidden md:block p-6 sticky top-0 h-screen">
        <div className="space-y-8">
          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-widest uppercase">
              Getting Started
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/documentation"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Introduction
                </Link>
              </li>

              <li>
                <Link
                  href="/documentation/installation"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Installation
                </Link>
              </li>
              <li>
                <Link
                  href="/documentation/quickstart"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Quick Start
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-widest uppercase">
              Features
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
            </ul>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-8 md:p-16 max-w-4xl">{children}</main>
    </div>
  );
}
