import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GitHubTreeItem = {
  path: string;
  type: "blob" | "tree";
};

type EvalNode = {
  id: string;
  path: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  risk: number;
  role: "source" | "sink" | "bridge" | "file";
  color: string;
};

type EvalEdge = {
  source: string;
  target: string;
};

function parseGitHubRepo(input: string) {
  try {
    const url = new URL(input.trim());
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function isCodeFile(path: string) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|php|cs|json|yml|yaml)$/i.test(
    path,
  );
}

function getRole(path: string): EvalNode["role"] {
  const lower = path.toLowerCase();
  if (
    lower.includes("/api/") ||
    lower.includes("route.") ||
    lower.includes("webhook") ||
    lower.includes("auth")
  ) {
    return "source";
  }
  if (
    lower.includes("db") ||
    lower.includes("database") ||
    lower.includes("prisma") ||
    lower.includes("supabase") ||
    lower.includes("sql")
  ) {
    return "sink";
  }
  if (
    lower.includes("service") ||
    lower.includes("lib/") ||
    lower.includes("server") ||
    lower.includes("client")
  ) {
    return "bridge";
  }
  return "file";
}

function getRisk(path: string, role: EvalNode["role"]) {
  const lower = path.toLowerCase();
  let risk = role === "sink" ? 0.86 : role === "source" ? 0.78 : 0.38;
  if (lower.includes("admin")) risk += 0.09;
  if (lower.includes("token") || lower.includes("secret")) risk += 0.08;
  if (lower.includes("middleware") || lower.includes("session")) risk += 0.06;
  return Math.min(0.98, Number(risk.toFixed(2)));
}

function getColor(role: EvalNode["role"], risk: number) {
  if (risk > 0.84) return "#ff5b5b";
  if (role === "sink") return "#ff8a3d";
  if (role === "source") return "#ffd166";
  if (role === "bridge") return "#7dd3fc";
  return "#63f3a6";
}

function buildNodes(files: string[]) {
  return files.map((path, index) => {
    const depth = path.split("/").length - 1;
    const role = getRole(path);
    const risk = getRisk(path, role);
    const radius = 130 + depth * 18;
    const angle = index * 0.52;
    const z = (index % 7) - 3;

    return {
      id: path,
      path,
      x: Math.round(Math.cos(angle) * radius + z * 8),
      y: Math.round(Math.sin(angle) * radius * 0.72),
      z,
      depth,
      role,
      risk,
      color: getColor(role, risk),
    } satisfies EvalNode;
  });
}

function buildEdges(nodes: EvalNode[]) {
  const edges: EvalEdge[] = [];
  const byFolder = new Map<string, EvalNode[]>();

  for (const node of nodes) {
    const folder = node.path.includes("/") ? node.path.split("/").slice(0, -1).join("/") : "";
    const current = byFolder.get(folder) ?? [];
    current.push(node);
    byFolder.set(folder, current);
  }

  for (const [, group] of byFolder) {
    for (let i = 1; i < group.length; i += 1) {
      edges.push({ source: group[i - 1].id, target: group[i].id });
    }
  }

  const topRisk = [...nodes]
    .sort((a, b) => b.risk - a.risk)
    .slice(0, Math.min(18, nodes.length));

  for (let i = 1; i < topRisk.length; i += 1) {
    edges.push({ source: topRisk[i - 1].id, target: topRisk[i].id });
  }

  return edges;
}

function buildAttackPath(nodes: EvalNode[]) {
  const sources = nodes.filter((node) => node.role === "source").sort((a, b) => b.risk - a.risk);
  const bridges = nodes.filter((node) => node.role === "bridge").sort((a, b) => b.risk - a.risk);
  const sinks = nodes.filter((node) => node.role === "sink").sort((a, b) => b.risk - a.risk);

  const path = [
    sources[0],
    bridges[0],
    bridges[1],
    sinks[0],
  ].filter(Boolean) as EvalNode[];

  return Array.from(new Set(path.map((node) => node.id)));
}

function buildSummary(nodes: EvalNode[]) {
  const sourceCount = nodes.filter((node) => node.role === "source").length;
  const sinkCount = nodes.filter((node) => node.role === "sink").length;
  const maxDepth = Math.max(...nodes.map((node) => node.depth), 0);

  return {
    files: nodes.length,
    sources: sourceCount,
    sinks: sinkCount,
    maxDepth,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const repoUrl = typeof body?.repoUrl === "string" ? body.repoUrl : "";
    const parsed = parseGitHubRepo(repoUrl);

    if (!parsed) {
      return NextResponse.json(
        { error: "Enter a valid public GitHub repository URL." },
        { status: 400 },
      );
    }

    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "votrio-eval-prototype",
    };

    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers },
    );

    if (!repoRes.ok) {
      return NextResponse.json(
        { error: "Unable to load repository metadata from GitHub." },
        { status: repoRes.status },
      );
    }

    const repoJson = (await repoRes.json()) as { default_branch?: string };
    const defaultBranch = repoJson.default_branch ?? "main";

    const treeRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers },
    );

    if (!treeRes.ok) {
      return NextResponse.json(
        { error: "Unable to load repository tree from GitHub." },
        { status: treeRes.status },
      );
    }

    const treeJson = (await treeRes.json()) as { tree?: GitHubTreeItem[] };
    const files = (treeJson.tree ?? [])
      .filter((item) => item.type === "blob" && isCodeFile(item.path))
      .map((item) => item.path)
      .slice(0, 72);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No supported source files were found in that repository." },
        { status: 404 },
      );
    }

    const nodes = buildNodes(files);
    const edges = buildEdges(nodes);
    const attackPath = buildAttackPath(nodes);

    return NextResponse.json({
      repo: `${parsed.owner}/${parsed.repo}`,
      branch: defaultBranch,
      nodes,
      edges,
      attackPath,
      summary: buildSummary(nodes),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Eval failed." },
      { status: 500 },
    );
  }
}
