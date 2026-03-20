"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300">
      <header className="border-b border-zinc-800/60">
        <div className="flex h-14 items-center justify-between px-6">
          <Link href="/" className="font-semibold text-white tracking-tight">
            votrio
          </Link>

          <NavigationMenu>
            <NavigationMenuList className="flex items-center gap-4">
              <NavigationMenuItem>
                <Link
                  href="/"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  href="/documentation"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Docs
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Button
                  asChild
                  size="sm"
                  className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <Link href="/auth">Sign in</Link>
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>

      <Separator className="bg-zinc-800/60" />

      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
