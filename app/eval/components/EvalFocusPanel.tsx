"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { EvalNode, EvalWorkspaceGraph } from "../lib/types";
import type {
  EvalSceneCommit,
  EvalSceneContributor,
  EvalSceneGraph,
} from "../lib/scene-graph";

type Selection =
  | { kind: "node"; id: string }
  | { kind: "commit"; id: string }
  | { kind: "contributor"; id: string }
  | null;

export function EvalFocusPanel({
  graph,
  sceneGraph,
  selection,
  searchQuery,
  focusMode,
  onSearchChange,
  onSelectSearchResult,
  onToggleFocusMode,
  onClearSelection,
}: {
  graph: EvalWorkspaceGraph;
  sceneGraph: EvalSceneGraph;
  selection: Selection;
  searchQuery: string;
  focusMode: boolean;
  onSearchChange: (value: string) => void;
  onSelectSearchResult: (entry: EvalSceneGraph["searchIndex"][number]) => void;
  onToggleFocusMode: () => void;
  onClearSelection: () => void;
}) {
  const selectedNode = useMemo(
    () =>
      selection?.kind === "node"
        ? (graph.nodes.find((node) => node.id === selection.id) ?? null)
        : null,
    [graph.nodes, selection],
  );
  const selectedCommit = useMemo(
    () =>
      selection?.kind === "commit"
        ? (sceneGraph.commits.find((commit) => commit.id === selection.id) ??
          null)
        : null,
    [sceneGraph.commits, selection],
  );
  const selectedContributor = useMemo(
    () =>
      selection?.kind === "contributor"
        ? (sceneGraph.contributors.find(
            (contributor) => contributor.id === selection.id,
          ) ?? null)
        : null,
    [sceneGraph.contributors, selection],
  );

  const results = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sceneGraph.searchIndex.slice(0, 10);
    return sceneGraph.searchIndex
      .filter((entry) =>
        `${entry.label} ${entry.subtitle}`.toLowerCase().includes(query),
      )
      .slice(0, 10);
  }, [sceneGraph.searchIndex, searchQuery]);

  const nodeMetric = selectedNode
    ? (sceneGraph.nodeMetrics[selectedNode.id] ?? null)
    : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_88%,transparent)] p-4 backdrop-blur">
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search file path, commit message, or contributor"
          className="mt-3 border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)]"
        />

        <ScrollArea className="mt-3 h-44 rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)]">
          <div className="space-y-2 p-3">
            {results.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectSearchResult(entry)}
                className="flex w-full items-start justify-between rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] px-3 py-2 text-left transition hover:border-[color:var(--eval-accent)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-[color:var(--eval-text)]">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
                    {entry.subtitle}
                  </p>
                </div>
                <span className="ml-3 shrink-0 text-[10px] uppercase tracking-[0.18em] text-[color:var(--eval-accent-strong)]">
                  {entry.kind}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 rounded-3xl border border-[color:var(--eval-border)] bg-[color:color-mix(in_oklab,var(--eval-panel)_88%,transparent)] p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--eval-accent-strong)]">
              Focus Context
            </p>
            <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
              Related files fade in while unrelated sectors dim out.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClearSelection}
            className="text-[color:var(--eval-text-muted)] hover:bg-[color:var(--eval-panel-soft)] hover:text-[color:var(--eval-text)]"
          >
            Clear
          </Button>
        </div>

        <Separator className="my-4 bg-[color:var(--eval-border)]" />

        {selectedNode ? (
          <NodeContext node={selectedNode} metric={nodeMetric} />
        ) : null}
        {selectedCommit ? (
          <CommitContext commit={selectedCommit} graph={graph} />
        ) : null}
        {selectedContributor ? (
          <ContributorContext contributor={selectedContributor} />
        ) : null}
        {!selectedNode && !selectedCommit && !selectedContributor ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-4 text-sm text-[color:var(--eval-text-muted)]">
            Select a node, commit, or contributor to isolate relationships and
            inspect metadata.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NodeContext({
  node,
  metric,
}: {
  node: EvalNode;
  metric: EvalSceneGraph["nodeMetrics"][string] | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-4">
        <p className="text-sm font-semibold text-[color:var(--eval-text)]">
          {node.path}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
          {node.originRepo} · {node.role}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric
          label="Importance"
          value={`${Math.round((metric?.importance ?? node.risk) * 100)}%`}
        />
        <Metric
          label="Change freq"
          value={String(metric?.changeFrequency ?? 0)}
        />
        <Metric label="Connections" value={String(metric?.degree ?? 0)} />
        <Metric label="Signals" value={String(node.signals.length)} />
      </div>
    </div>
  );
}

function CommitContext({
  commit,
  graph,
}: {
  commit: EvalSceneCommit;
  graph: EvalWorkspaceGraph;
}) {
  const files = commit.touchedNodeIds
    .map((id) => graph.nodes.find((node) => node.id === id)?.path)
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-4">
        <p className="text-sm font-semibold text-[color:var(--eval-text)]">
          {commit.message}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
          {commit.authorName} · {commit.branch} ·{" "}
          {new Date(commit.timestamp).toLocaleString()}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric
          label="Touched files"
          value={String(commit.touchedNodeIds.length)}
        />
        <Metric
          label="Importance"
          value={`${Math.round(commit.importance * 100)}%`}
        />
        <Metric label="Event kind" value={commit.kind} />
        <Metric label="Sequence" value={`#${commit.sequence + 1}`} />
      </div>
      <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-accent-strong)]">
          Related files
        </p>
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <p key={file} className="text-sm text-[color:var(--eval-text)]">
              {file}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContributorContext({
  contributor,
}: {
  contributor: EvalSceneContributor;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-4">
        <p className="text-sm font-semibold text-[color:var(--eval-text)]">
          {contributor.name}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--eval-text-muted)]">
          Contributor influence overlay
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric
          label="Influence"
          value={`${Math.round(contributor.influence * 100)}%`}
        />
        <Metric label="Commits" value={String(contributor.commitIds.length)} />
        <Metric
          label="Touched files"
          value={String(contributor.touchedNodeIds.length)}
        />
        <Metric label="Signal" value="active" />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-3">
      <p className="text-[color:var(--eval-text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[color:var(--eval-text)]">
        {value}
      </p>
    </div>
  );
}
