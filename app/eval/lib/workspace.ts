import type {
  EvalEdge,
  EvalNode,
  EvalPayload,
  EvalWorkspaceGraph,
} from "./types";

function prefixNodes(
  nodes: EvalNode[],
  prefix: "primary" | "compare",
  offsetX: number,
  originRepo: string,
) {
  return nodes.map((node) => ({
    ...node,
    id: `${prefix}:${node.id}`,
    x: node.x + offsetX,
    originRepo,
    layer: prefix,
  }));
}

function prefixEdges(edges: EvalEdge[], prefix: "primary" | "compare") {
  return edges.map((edge) => ({
    source: `${prefix}:${edge.source}`,
    target: `${prefix}:${edge.target}`,
  }));
}

function buildCrossRepoEdges(primary: EvalNode[], compare: EvalNode[]) {
  const compareByName = new Map<string, EvalNode[]>();

  for (const node of compare) {
    const filename = node.path.split("/").pop() ?? node.path;
    const existing = compareByName.get(filename) ?? [];
    existing.push(node);
    compareByName.set(filename, existing);
  }

  const edges: EvalEdge[] = [];
  for (const node of primary) {
    const filename = node.path.split("/").pop() ?? node.path;
    const matches = compareByName.get(filename) ?? [];
    const bestMatch = matches.find(
      (candidate) => candidate.extension === node.extension,
    );
    if (bestMatch) {
      edges.push({ source: node.id, target: bestMatch.id });
    }
    if (edges.length >= 18) break;
  }

  return edges;
}

export function buildWorkspaceGraph(
  primary: EvalPayload,
  compare?: EvalPayload | null,
): EvalWorkspaceGraph {
  if (!compare) {
    return {
      ...primary,
      nodes: primary.nodes.map((node) => ({
        ...node,
        id: `primary:${node.id}`,
        originRepo: primary.repo,
        layer: "primary",
      })),
      edges: prefixEdges(primary.edges, "primary"),
      attackPath: primary.attackPath.map((id) => `primary:${id}`),
      compareTarget: null,
    };
  }

  const primaryNodes = prefixNodes(primary.nodes, "primary", -125, primary.repo);
  const compareNodes = prefixNodes(compare.nodes, "compare", 125, compare.repo);

  return {
    ...primary,
    repo: `${primary.repo} <> ${compare.repo}`,
    branch: `${primary.branch} | ${compare.branch}`,
    nodes: [...primaryNodes, ...compareNodes],
    edges: [
      ...prefixEdges(primary.edges, "primary"),
      ...prefixEdges(compare.edges, "compare"),
      ...buildCrossRepoEdges(primaryNodes, compareNodes),
    ],
    attackPath: [
      ...primary.attackPath.map((id) => `primary:${id}`),
      ...compare.attackPath.slice(0, 2).map((id) => `compare:${id}`),
    ],
    repoMeta: primary.repoMeta,
    summary: {
      files: primary.summary.files + compare.summary.files,
      sources: primary.summary.sources + compare.summary.sources,
      sinks: primary.summary.sinks + compare.summary.sinks,
      bridges: primary.summary.bridges + compare.summary.bridges,
      directories: primary.summary.directories + compare.summary.directories,
      highRisk: primary.summary.highRisk + compare.summary.highRisk,
      avgRisk: Number(
        ((primary.summary.avgRisk + compare.summary.avgRisk) / 2).toFixed(2),
      ),
      maxDepth: Math.max(primary.summary.maxDepth, compare.summary.maxDepth),
    },
    compareTarget: {
      repo: compare.repo,
      branch: compare.branch,
      repoMeta: compare.repoMeta,
      summary: compare.summary,
    },
  };
}

export function buildNodeWorld(
  graph: EvalWorkspaceGraph,
  centerNodeId: string,
) {
  const centerNode = graph.nodes.find((node) => node.id === centerNodeId) ?? null;
  if (!centerNode) {
    return null;
  }

  const linkedIds = new Set<string>([centerNode.id]);
  for (const edge of graph.edges) {
    if (edge.source === centerNode.id) linkedIds.add(edge.target);
    if (edge.target === centerNode.id) linkedIds.add(edge.source);
  }

  const neighbors = graph.nodes
    .filter((node) => linkedIds.has(node.id) && node.id !== centerNode.id)
    .slice(0, 8);

  return {
    centerNode,
    nodes: [centerNode, ...neighbors],
    edges: graph.edges.filter(
      (edge) => linkedIds.has(edge.source) && linkedIds.has(edge.target),
    ),
  };
}
