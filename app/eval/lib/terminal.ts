import type { EvalCommandId, EvalPayload } from "./types";

function logLine(prefix: string, text: string) {
  return `${prefix} ${text}`;
}

export function buildInitialTerminalLines() {
  return [
    logLine(">", "Choose a connected GitHub repository and run Eval."),
    logLine(">", "Then drive the 3D map with trace unauth path, show sinks, or fix --path."),
  ];
}

export function buildEvalLoadedLines(graph: EvalPayload) {
  return [
    logLine("$", `eval ingest ${graph.repo}`),
    logLine(">", `Mapped ${graph.summary.files} files into a navigable 3D graph.`),
    logLine(
      ">",
      `Detected ${graph.summary.sources} ingress nodes and ${graph.summary.sinks} data sinks.`,
    ),
    logLine(">", "Agent ready. Run trace unauth path, show sinks, or fix --path."),
  ];
}

export function buildCommandLines(
  commandId: EvalCommandId,
  graph: EvalPayload,
  resolvePath: (id: string) => string | undefined,
) {
  if (commandId === "trace") {
    const chain = graph.attackPath
      .map((id) => resolvePath(id))
      .filter(Boolean)
      .join(" -> ");

    return [
      logLine("$", "trace unauth path"),
      logLine("!", "Critical path identified across endpoint, service, and data sink."),
      logLine(">", chain || "No attack path returned."),
    ];
  }

  if (commandId === "sinks") {
    const sinks = graph.nodes
      .filter((node) => node.role === "sink")
      .slice(0, 4)
      .map((node) => node.path)
      .join(", ");

    return [
      logLine("$", "show sinks"),
      logLine(">", `Highlighted persistence-heavy nodes: ${sinks || "none found"}.`),
    ];
  }

  return [
    logLine("$", "fix --path"),
    logLine(">", "Patch simulation applied. The exposed chain contracts and risk drops."),
    logLine(">", "Next action: ship auth hardening around the highlighted ingress nodes."),
  ];
}
