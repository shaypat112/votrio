import type { EvalNode, EvalWorkspaceGraph } from "./types";

export type EvalSceneNodeMetrics = {
  id: string;
  degree: number;
  importance: number;
  changeFrequency: number;
  firstCommitIndex: number;
  lastCommitIndex: number;
  clusterId: string;
  contributorIds: string[];
};

export type EvalSceneCluster = {
  id: string;
  label: string;
  layer: "primary" | "compare";
  nodeIds: string[];
  centroid: [number, number, number];
  avgRisk: number;
  density: number;
};

export type EvalSceneContributor = {
  id: string;
  name: string;
  color: string;
  commitIds: string[];
  touchedNodeIds: string[];
  influence: number;
};

export type EvalSceneCommit = {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  branch: string;
  kind: "commit" | "merge" | "milestone";
  timestamp: string;
  touchedNodeIds: string[];
  importance: number;
  position: [number, number, number];
  clusterId: string;
  sequence: number;
};

export type EvalSceneSearchEntry = {
  id: string;
  label: string;
  subtitle: string;
  kind: "file" | "commit" | "contributor";
  targetId: string;
};

export type EvalSceneGraph = {
  commits: EvalSceneCommit[];
  contributors: EvalSceneContributor[];
  clusters: EvalSceneCluster[];
  nodeMetrics: Record<string, EvalSceneNodeMetrics>;
  focusMap: Record<string, string[]>;
  searchIndex: EvalSceneSearchEntry[];
  timeline: {
    start: number;
    end: number;
    durationMs: number;
  };
  branchPaths: Array<{
    branch: string;
    points: [number, number, number][];
  }>;
  hotspotIds: string[];
};

const CONTRIBUTOR_POOL = [
  { id: "maya", name: "Maya Chen", color: "#7dd3fc" },
  { id: "isaac", name: "Isaac Moreno", color: "#f59e0b" },
  { id: "lina", name: "Lina Patel", color: "#36d399" },
  { id: "noah", name: "Noah Carter", color: "#f472b6" },
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function averagePoint(nodes: EvalNode[]): [number, number, number] {
  if (nodes.length === 0) return [0, 0, 0];
  const totals = nodes.reduce(
    (accumulator, node) => {
      accumulator.x += node.x;
      accumulator.y += node.y;
      accumulator.z += node.z * 18;
      return accumulator;
    },
    { x: 0, y: 0, z: 0 },
  );

  return [
    totals.x / nodes.length,
    totals.y / nodes.length,
    totals.z / nodes.length,
  ];
}

function createCommitMessage(
  cluster: EvalSceneCluster,
  touchedNodes: EvalNode[],
  sequence: number,
  kind: "commit" | "merge" | "milestone",
) {
  const files = touchedNodes
    .slice(0, 2)
    .map((node) => node.path.split("/").pop() ?? node.path)
    .join(", ");

  if (kind === "merge") {
    return `Merge ${cluster.label || "workspace"} flow back into mainline`;
  }

  if (kind === "milestone") {
    return `Stabilize ${cluster.label || "core"} after high-signal changes`;
  }

  return `Refine ${cluster.label || "module"} paths around ${files || `change-set ${sequence + 1}`}`;
}

export function buildEvalSceneGraph(graph: EvalWorkspaceGraph): EvalSceneGraph {
  const edgeDegree = new Map<string, number>();
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const edge of graph.edges) {
    edgeDegree.set(edge.source, (edgeDegree.get(edge.source) ?? 0) + 1);
    edgeDegree.set(edge.target, (edgeDegree.get(edge.target) ?? 0) + 1);
  }

  const clusterMap = new Map<string, EvalNode[]>();
  for (const node of graph.nodes) {
    const directory = node.directory || "root";
    const clusterId = `${node.layer ?? "primary"}:${directory}`;
    const existing = clusterMap.get(clusterId) ?? [];
    existing.push(node);
    clusterMap.set(clusterId, existing);
  }

  const clusters = [...clusterMap.entries()]
    .map(([id, nodes]) => {
      const first = nodes[0];
      const avgRisk =
        nodes.reduce((sum, node) => sum + node.risk, 0) / Math.max(nodes.length, 1);
      return {
        id,
        label: first?.directory || "root",
        layer: (first?.layer ?? "primary") as "primary" | "compare",
        nodeIds: nodes.map((node) => node.id),
        centroid: averagePoint(nodes),
        avgRisk,
        density: nodes.length,
      } satisfies EvalSceneCluster;
    })
    .sort((left, right) => right.avgRisk - left.avgRisk || right.density - left.density);

  const commitCount = clamp(Math.max(12, Math.ceil(graph.nodes.length / 6)), 12, 28);
  const hotspotNodes = [...graph.nodes]
    .sort(
      (left, right) =>
        right.risk - left.risk ||
        (edgeDegree.get(right.id) ?? 0) - (edgeDegree.get(left.id) ?? 0),
    )
    .slice(0, 18);

  const hotspotIds = hotspotNodes.map((node) => node.id);
  const start = Date.now() - commitCount * 1000 * 60 * 60 * 18;
  const end = Date.now();

  const commits: EvalSceneCommit[] = [];
  const contributorMap = new Map<
    string,
    Omit<EvalSceneContributor, "influence"> & { touchedNodeIdSet: Set<string> }
  >();
  const nodeMetrics = new Map<string, EvalSceneNodeMetrics>();

  for (const node of graph.nodes) {
    const clusterId = `${node.layer ?? "primary"}:${node.directory || "root"}`;
    const degree = edgeDegree.get(node.id) ?? 0;
    nodeMetrics.set(node.id, {
      id: node.id,
      degree,
      importance: Number(clamp(node.risk * 0.65 + degree / 8 + node.size / 600, 0.08, 1).toFixed(2)),
      changeFrequency: 0,
      firstCommitIndex: 0,
      lastCommitIndex: 0,
      clusterId,
      contributorIds: [],
    });
  }

  const branchNames = ["main", "feature/runtime-flow", "feature/risk-overlay"];

  for (let index = 0; index < commitCount; index += 1) {
    const cluster = clusters[index % Math.max(clusters.length, 1)];
    const clusterNodes =
      cluster?.nodeIds
        .map((id) => nodeById.get(id))
        .filter((node): node is EvalNode => Boolean(node)) ?? [];
    const contributor = CONTRIBUTOR_POOL[index % CONTRIBUTOR_POOL.length];
    const author = contributor;
    const touchSeed = hashString(`${graph.repo}:${cluster?.id ?? "cluster"}:${index}`);
    const touchedNodes = clusterNodes
      .slice()
      .sort((left, right) => hashString(`${left.id}:${touchSeed}`) - hashString(`${right.id}:${touchSeed}`))
      .slice(0, clamp(2 + (index % 4), 2, 6));

    const kind =
      index > 0 && index % 7 === 0
        ? "merge"
        : index % 5 === 4
          ? "milestone"
          : "commit";
    const branch =
      kind === "merge" ? "main" : branchNames[(index + (cluster?.layer === "compare" ? 1 : 0)) % branchNames.length];
    const progress = commitCount === 1 ? 1 : index / (commitCount - 1);
    const timestamp = new Date(start + (end - start) * progress).toISOString();
    const baseX = cluster?.centroid[0] ?? 0;
    const baseY = cluster?.centroid[1] ?? 0;
    const branchOffset =
      branch === "main" ? 0 : branch === "feature/runtime-flow" ? -54 : 54;
    const position: [number, number, number] = [
      baseX + branchOffset * 0.35,
      baseY + Math.sin(progress * Math.PI * 3 + index) * 18 + (kind === "merge" ? 18 : 0),
      -168 + progress * 336,
    ];

    const commit: EvalSceneCommit = {
      id: `commit:${index}`,
      authorId: author.id,
      authorName: author.name,
      message: createCommitMessage(cluster, touchedNodes, index, kind),
      branch,
      kind,
      timestamp,
      touchedNodeIds: touchedNodes.map((node) => node.id),
      importance: Number(
        clamp(
          touchedNodes.reduce((sum, node) => sum + node.risk, 0) /
            Math.max(touchedNodes.length, 1) +
            (kind === "merge" ? 0.25 : kind === "milestone" ? 0.18 : 0),
          0.12,
          1,
        ).toFixed(2),
      ),
      position,
      clusterId: cluster?.id ?? "primary:root",
      sequence: index,
    };
    commits.push(commit);

    const contributorEntry =
      contributorMap.get(author.id) ?? {
        id: author.id,
        name: author.name,
        color: author.color,
        commitIds: [],
        touchedNodeIds: [],
        touchedNodeIdSet: new Set<string>(),
      };
    contributorEntry.commitIds.push(commit.id);
    for (const nodeId of commit.touchedNodeIds) {
      contributorEntry.touchedNodeIdSet.add(nodeId);
    }
    contributorMap.set(author.id, contributorEntry);

    for (const nodeId of commit.touchedNodeIds) {
      const metric = nodeMetrics.get(nodeId);
      if (!metric) continue;
      metric.changeFrequency += 1;
      metric.lastCommitIndex = index;
      if (metric.changeFrequency === 1) {
        metric.firstCommitIndex = index;
      }
      if (!metric.contributorIds.includes(author.id)) {
        metric.contributorIds.push(author.id);
      }
    }
  }

  const contributors = [...contributorMap.values()].map((entry) => ({
    id: entry.id,
    name: entry.name,
    color: entry.color,
    commitIds: entry.commitIds,
    touchedNodeIds: [...entry.touchedNodeIdSet],
    influence: Number(
      clamp(
        entry.commitIds.length / Math.max(commits.length, 1) +
          entry.touchedNodeIdSet.size / Math.max(graph.nodes.length, 1),
        0.08,
        1,
      ).toFixed(2),
    ),
  }));

  const focusMap: Record<string, string[]> = {};
  for (const node of graph.nodes) {
    const related = new Set<string>([node.id]);
    for (const edge of graph.edges) {
      if (edge.source === node.id) related.add(edge.target);
      if (edge.target === node.id) related.add(edge.source);
    }
    const metric = nodeMetrics.get(node.id);
    if (metric) {
      related.add(metric.clusterId);
    }
    focusMap[node.id] = [...related];
  }

  for (const commit of commits) {
    focusMap[commit.id] = [...new Set(commit.touchedNodeIds)];
  }

  for (const contributor of contributors) {
    focusMap[contributor.id] = contributor.touchedNodeIds;
  }

  const searchIndex: EvalSceneSearchEntry[] = [
    ...graph.nodes.map((node) => ({
      id: `file:${node.id}`,
      label: node.path,
      subtitle: `${node.originRepo ?? graph.repo} · ${node.role}`,
      kind: "file" as const,
      targetId: node.id,
    })),
    ...commits.map((commit) => ({
      id: `commit-search:${commit.id}`,
      label: commit.message,
      subtitle: `${commit.authorName} · ${new Date(commit.timestamp).toLocaleDateString()}`,
      kind: "commit" as const,
      targetId: commit.id,
    })),
    ...contributors.map((contributor) => ({
      id: `contributor:${contributor.id}`,
      label: contributor.name,
      subtitle: `${contributor.commitIds.length} commits · ${contributor.touchedNodeIds.length} touched files`,
      kind: "contributor" as const,
      targetId: contributor.id,
    })),
  ];

  const branchMap = new Map<string, [number, number, number][]>();
  for (const commit of commits) {
    const existing = branchMap.get(commit.branch) ?? [];
    existing.push(commit.position);
    branchMap.set(commit.branch, existing);
  }

  return {
    commits,
    contributors,
    clusters,
    nodeMetrics: Object.fromEntries(nodeMetrics.entries()),
    focusMap,
    searchIndex,
    timeline: {
      start,
      end,
      durationMs: end - start,
    },
    branchPaths: [...branchMap.entries()].map(([branch, points]) => ({
      branch,
      points,
    })),
    hotspotIds,
  };
}
