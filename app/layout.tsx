import "./globals.css";

import AppShell from "./components/AppShell";
import { ThemeProvider } from "./components/theme-provider";
import { Geist } from "next/font/google";
import { cn } from "./lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark font-sans", geist.variable)}
    >
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="dark">
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
