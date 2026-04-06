"use client";

import { AlertTriangle, Database, GitBranch, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EvalNode, EvalPayload } from "../lib/types";

function formatRole(role: EvalNode["role"]) {
  if (role === "source") return "Source";
  if (role === "sink") return "Sink";
  if (role === "bridge") return "Bridge";
  return "File";
}

export function EvalFindingsPanel({
  graph,
}: {
  graph: EvalPayload | null;
}) {
  const topFindings = graph
    ? [...graph.nodes].sort((a, b) => b.risk - a.risk).slice(0, 5)
    : [];

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Live Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {graph ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Repository
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {graph.repo}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Branch {graph.branch}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    File Depth
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Max depth {graph.summary.maxDepth}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Z-axis is derived from folder depth.
                  </p>
                </div>
              </div>

              {topFindings.map((node, index) => (
                <div
                  key={node.id}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {node.path}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {formatRole(node.role)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {index === 0 ? (
                        <ShieldAlert className="h-4 w-4 text-[#ff5b5b]" />
                      ) : index < 3 ? (
                        <AlertTriangle className="h-4 w-4 text-[#ff8a3d]" />
                      ) : (
                        <Database className="h-4 w-4 text-[#7dd3fc]" />
                      )}
                      {Math.round(node.risk * 100)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run Eval to populate the 3D graph, terminal, and attack-path findings.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5" />
            Product Narrative
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Eval now uses a real navigable 3D scene instead of a flat SVG mock,
            so the graph feels like a system you can move through.
          </p>
          <p>
            The next lift is deeper code intelligence: stronger call edges,
            Semgrep or agent-derived findings, and patch generation that
            rewires the map after a fix.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
