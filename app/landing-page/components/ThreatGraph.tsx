"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

type Risk = "critical" | "medium" | "low" | null;

type Node = {
  id: string;
  x: number;
  y: number;
  label: string;
  risk: Risk;
  finding?: string;
};

type Edge = [string, string];

const nodes: Node[] = [
  { id: "entry", x: 40, y: 70, label: "index.ts", risk: null },
  { id: "routes", x: 175, y: 40, label: "api/routes.ts", risk: null },
  { id: "session", x: 320, y: 60, label: "auth/session.ts", risk: null },
  { id: "token", x: 430, y: 130, label: "auth/token.ts", risk: "critical", finding: "Privilege escalation via token fallback" },
  { id: "admin", x: 470, y: 230, label: "admin/tools.ts", risk: null },
  { id: "support", x: 400, y: 305, label: "services/support.ts", risk: "medium", finding: "SQL builder reachable from support tools" },
  { id: "webhook", x: 250, y: 320, label: "webhook/retry.ts", risk: "low", finding: "Retry logic leaks internal error detail" },
  { id: "sanitize", x: 130, y: 260, label: "utils/sanitize.ts", risk: null },
  { id: "dbq", x: 40, y: 195, label: "db/queries.ts", risk: null },
  { id: "config", x: 20, y: 320, label: "config/env.ts", risk: null },
];

const edges: Edge[] = [
  ["entry", "routes"],
  ["routes", "session"],
  ["session", "token"],
  ["token", "admin"],
  ["admin", "support"],
  ["routes", "webhook"],
  ["webhook", "config"],
  ["routes", "dbq"],
  ["dbq", "sanitize"],
  ["sanitize", "support"],
  ["dbq", "config"],
];

const riskStroke: Record<Exclude<Risk, null>, string> = {
  critical: "stroke-red-500",
  medium: "stroke-amber-400",
  low: "stroke-amber-400",
};
const riskFill: Record<Exclude<Risk, null>, string> = {
  critical: "fill-red-500",
  medium: "fill-amber-400",
  low: "fill-amber-400",
};
const riskText: Record<Exclude<Risk, null>, string> = {
  critical: "text-red-400",
  medium: "text-amber-400",
  low: "text-amber-400",
};

function nodeById(id: string) {
  return nodes.find((n) => n.id === id)!;
}

type Stage = "draw" | "scan" | "findings" | "resolved";

export function ThreatGraph() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [stage, setStage] = useState<Stage>("draw");

  useEffect(() => {
    if (!inView) return;
    const t1 = window.setTimeout(() => setStage("scan"), 900);
    const t2 = window.setTimeout(() => setStage("findings"), 2600);
    let loop: number;

    const cycle = () => {
      loop = window.setTimeout(() => {
        setStage("resolved");
        loop = window.setTimeout(() => {
          setStage("scan");
          loop = window.setTimeout(() => {
            setStage("findings");
            cycle();
          }, 1700);
        }, 3600);
      }, 3200);
    };
    cycle();

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(loop);
    };
  }, [inView]);

  const riskNodes = nodes.filter((n) => n.risk);
  const showRisk = stage === "findings" || stage === "resolved";
  const resolved = stage === "resolved";

  return (
    <div ref={ref} className="relative">
      <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-foreground/25" />
            <span className="h-2 w-2 rounded-full bg-foreground/40" />
            <span className="h-2 w-2 rounded-full bg-foreground/55" />
            <span className="ml-2">votrio · repository graph</span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] transition-colors ${
              resolved
                ? "bg-emerald-500/10 text-emerald-400"
                : stage === "findings"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-blue-500/10 text-blue-400"
            }`}
          >
            {resolved ? "3 fixes generated" : stage === "findings" ? "3 issues found" : "scanning"}
          </span>
        </div>

        {/** biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
<svg viewBox="0 0 500 360" className="h-auto w-full">
          <g>
            {edges.map(([a, b], i) => {
              const na = nodeById(a);
              const nb = nodeById(b);
              return (
                <motion.line
                  key={`${a}-${b}`}
                  x1={na.x}
                  y1={na.y}
                  x2={nb.x}
                  y2={nb.y}
                  className="stroke-border"
                  strokeWidth={1.5}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.05 * i, ease: "easeOut" }}
                />
              );
            })}

            {stage === "scan" &&
              edges.map(([a, b], i) => {
                const na = nodeById(a);
                const nb = nodeById(b);
                return (
                  <motion.circle
                    key={`pulse-${a}-${b}`}
                    r={3}
                    className="fill-blue-400"
                    initial={{ cx: na.x, cy: na.y, opacity: 0 }}
                    animate={{
                      cx: [na.x, nb.x],
                      cy: [na.y, nb.y],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 1.1, delay: i * 0.08, repeat: Infinity, repeatDelay: 0.6 }}
                  />
                );
              })}

            {nodes.map((n, i) => {
              const active = n.risk && showRisk;
              const isResolved = n.risk && resolved;
              return (
                <g key={n.id}>
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={active ? 9 : 6}
                    strokeWidth={1.5}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
                    className={
                      isResolved
                        ? "fill-emerald-400 stroke-emerald-400"
                        : active && n.risk
                          ? `${riskFill[n.risk]} ${riskStroke[n.risk]}`
                          : "fill-background stroke-border"
                    }
                  />
                  {active && n.risk && !isResolved && (
                    <motion.circle
                      cx={n.x}
                      cy={n.y}
                      r={9}
                      className={`${riskStroke[n.risk]} fill-none`}
                      strokeWidth={1.5}
                      initial={{ opacity: 0.6, r: 9 }}
                      animate={{ opacity: 0, r: 18 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="min-h-[3.5rem] border-t border-border pt-3">
          <AnimatePresence mode="wait">
            {stage === "findings" && (
              <motion.div
                key="findings"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5 font-mono text-[11px] leading-relaxed"
              >
                {riskNodes.map((n) => (
                  <p key={n.id} className={riskText[n.risk!]}>
                    {n.risk === "critical" ? "● HIGH" : "● MED"} — {n.finding}
                  </p>
                ))}
              </motion.div>
            )}
            {stage === "resolved" && (
              <motion.p
                key="resolved"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="font-mono text-[11px] text-emerald-400"
              >
                ✓ Patch guidance generated for all 3 findings — verified in sandbox
              </motion.p>
            )}
            {stage === "scan" && (
              <motion.p
                key="scan"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="font-mono text-[11px] text-muted-foreground"
              >
                Tracing call graph across 214 files…
              </motion.p>
            )}
            {stage === "draw" && (
              <motion.p
                key="draw"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[11px] text-muted-foreground"
              >
                Mapping repository structure…
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
