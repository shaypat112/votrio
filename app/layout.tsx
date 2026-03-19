import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Votrio",
  description: "Stop stack traces and security leaks in their tracks.",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={` bg-black text-white antialiased`}>
        <header className="border-b border-zinc-800 py-4 px-8 flex justify-between items-center">
          <div className="font-bold tracking-tighter text-xl">VOTRIO_</div>
          <nav className="flex gap-6 text-sm text-zinc-400">
            <Link href="/"> Home </Link>
            <Link href="/documentation">Docs</Link>
            <a
              href="https://github.com/shaypat112"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
