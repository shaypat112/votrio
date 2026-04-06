import type { Metadata } from "next";
import EvalClient from "./EvalClient";

export const metadata: Metadata = {
  title: "Eval - Votrio",
  description: "Visual repository evaluation prototype for attack-path mapping.",
};

export default function EvalPage() {
  return <EvalClient />;
}
