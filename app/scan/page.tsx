import type { Metadata } from "next";
import { ScanWorkspace } from "./scan-workspace";

export const metadata: Metadata = {
  title: "New scan - Votrio",
  description: "Run a focused security scan against a GitHub repository.",
};

export default function ScanPage() {
  return <ScanWorkspace />;
}
