import type { Metadata } from "next";
import { ReportsIndexClient } from "./components/ReportsIndexClient";

export const metadata: Metadata = {
  title: "Reports - Votrio",
  description: "Repository scan reports and scan history.",
};

export default function ReportsPage() {
  return <ReportsIndexClient />;
}
