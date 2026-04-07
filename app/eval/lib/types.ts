export type EvalNode = {
  id: string;
  path: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  risk: number;
  role: "source" | "sink" | "bridge" | "file";
  color: string;
  directory: string;
  extension: string;
  size: number;
  signals: string[];
  originRepo?: string;
  layer?: "primary" | "compare";
};

export type EvalEdge = {
  source: string;
  target: string;
};

export type EvalPayload = {
  repo: string;
  branch: string;
  nodes: EvalNode[];
  edges: EvalEdge[];
  attackPath: string[];
  repoMeta: {
    description: string | null;
    visibility: string;
    language: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    updatedAt: string | null;
  };
  summary: {
    files: number;
    sources: number;
    sinks: number;
    bridges: number;
    directories: number;
    highRisk: number;
    avgRisk: number;
    maxDepth: number;
  };
};

export type EvalWorkspaceGraph = EvalPayload & {
  compareTarget: {
    repo: string;
    branch: string;
    repoMeta: EvalPayload["repoMeta"];
    summary: EvalPayload["summary"];
  } | null;
};

export type EvalToolkit = {
  id: string;
  label: string;
  description: string;
  category: "source" | "context" | "response";
  status: "ready" | "stub";
};

export const commandCatalog = [
  {
    id: "trace",
    label: "trace unauth path",
    description:
      "Identify the shortest path from an unauthenticated endpoint to the data layer.",
  },
  {
    id: "sinks",
    label: "show sinks",
    description:
      "Highlight the storage, Supabase, SQL, and database-heavy nodes.",
  },
  {
    id: "fix",
    label: "fix --path",
    description: "Simulate a patch pass and reduce the exposed attack path.",
  },
] as const;

export type EvalCommandId = (typeof commandCatalog)[number]["id"];

export const toolkitLoadout: EvalToolkit[] = [
  {
    id: "github",
    label: "GitHub Graph",
    description: "Repo ingestion, branches, pull requests, code owners, and file history.",
    category: "source",
    status: "ready",
  },
  {
    id: "sentry",
    label: "Sentry",
    description: "Error traces and stack hotspots layered over risky files.",
    category: "context",
    status: "stub",
  },
  {
    id: "slack",
    label: "Slack",
    description: "Route critical findings into team triage channels.",
    category: "response",
    status: "stub",
  },
  {
    id: "jira",
    label: "Jira",
    description: "Open tickets directly from node worlds and attack-path views.",
    category: "response",
    status: "stub",
  },
  {
    id: "vercel",
    label: "Vercel",
    description: "Map deployed environments and runtime ownership to the graph.",
    category: "context",
    status: "stub",
  },
  {
    id: "datadog",
    label: "Datadog",
    description: "Overlay alerts, services, and incident timelines onto graph sectors.",
    category: "context",
    status: "stub",
  },
];
