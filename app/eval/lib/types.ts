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
  summary: {
    files: number;
    sources: number;
    sinks: number;
    maxDepth: number;
  };
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
