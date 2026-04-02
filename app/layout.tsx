import "./globals.css";

import AppShell from "./components/AppShell";
import { ThemeProvider } from "./components/theme-provider";
import { SettingsProvider } from "./settings/profile/context";
import TeamProvider from "./components/TeamProvider";
import { Geist } from "next/font/google";
import { cn } from "./lib/utils";
import type { Metadata } from "next";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Votrio",
  description: "Votrio — automated repository scanning, reviews and insights.",
  icons: {
    icon: "/votrio_logo.jpeg",
    shortcut: "/votrio_logo.jpeg",
    apple: "/votrio_logo.jpeg",
  },
  openGraph: {
    title: "Votrio",
    description: "Automated repo scanning, reviews and developer insights.",
    images: ["/votrio_logo.jpeg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(geist.variable)}>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="dark">
          <TeamProvider>
            <SettingsProvider>
              <AppShell>{children}</AppShell>
            </SettingsProvider>
          </TeamProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
