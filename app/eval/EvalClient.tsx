"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import type { ConnectedRepo } from "@/app/profile/components/RepoTable";

import { EvalGraphScene } from "./components/EvalGraphScene";
import { EvalRepoPicker } from "./components/EvalRepoPicker";

import type {
  EvalCommandId,
  EvalPayload,
  EvalWorkspaceGraph,
} from "./lib/types";
import { buildWorkspaceGraph } from "./lib/workspace";

async function fetchEvalGraph(repoUrl: string) {
  const res = await fetch("/api/eval/repo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error ?? "Unable to evaluate repository.");
  }

  return data as EvalPayload;
}

export default function EvalClient() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [graph, setGraph] = useState<EvalWorkspaceGraph | null>(null);
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [selectedCompareRepoId, setSelectedCompareRepoId] = useState("");
  const [manualRepoUrl, setManualRepoUrl] = useState("");
  const [manualCompareRepoUrl, setManualCompareRepoUrl] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCommand, setActiveCommand] = useState<EvalCommandId | null>(
    "trace",
  );

  const highlightedIds = useMemo(() => {
    if (!graph) return new Set<string>();
    if (activeCommand === "trace") return new Set(graph.attackPath);
    if (activeCommand === "sinks") {
      return new Set(
        graph.nodes
          .filter((node) => node.role === "sink")
          .map((node) => node.id),
      );
    }
    if (activeCommand === "fix") {
      return new Set(graph.attackPath.slice(0, 4));
    }
    return new Set<string>();
  }, [activeCommand, graph]);

  const loadRepos = useCallback(async () => {
    const { data } = await supabase
      .from("connected_repos")
      .select("id, full_name, private, last_scanned_at")
      .order("full_name", { ascending: true });

    const nextRepos = (data as ConnectedRepo[]) ?? [];
    setRepos(nextRepos);
    setSelectedRepoId((current) => {
      if (current && nextRepos.some((repo) => repo.id === current)) {
        return current;
      }
      return nextRepos[0]?.id ?? "";
    });
    setSelectedCompareRepoId((current) => {
      if (
        current &&
        nextRepos.some(
          (repo) => repo.id === current && repo.id !== nextRepos[0]?.id,
        )
      ) {
        return current;
      }
      return "";
    });
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRepos();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadRepos]);

  useEffect(() => {
    if (selectedCompareRepoId && selectedCompareRepoId === selectedRepoId) {
      setSelectedCompareRepoId("");
    }
  }, [selectedCompareRepoId, selectedRepoId]);

  const connectGitHub = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const providerToken = sessionData.session?.provider_token;

    if (!accessToken || !providerToken) {
      setError("GitHub is not connected. Sign in with GitHub first.");
      return;
    }

    const res = await fetch("/api/github/repos", {
      method: "POST",
      headers: buildTeamAuthHeaders(accessToken, selectedTeamId, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ providerToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "Failed to sync repositories.");
      return;
    }

    const nextRepos = (data?.repos ?? []) as ConnectedRepo[];
    setRepos(nextRepos);
    setSelectedRepoId(nextRepos[0]?.id ?? "");
  };

  const resolveRepoUrl = (
    selectedId: string,
    manualUrl: string,
    fallbackRepos: ConnectedRepo[],
  ) => {
    if (manualUrl.trim()) return manualUrl.trim();
    const repo = fallbackRepos.find((item) => item.id === selectedId);
    return repo ? `https://github.com/${repo.full_name}` : "";
  };

  const runEval = async () => {
    const primaryRepoUrl = resolveRepoUrl(selectedRepoId, manualRepoUrl, repos);
    const compareRepoUrl = resolveRepoUrl(
      selectedCompareRepoId,
      manualCompareRepoUrl,
      repos,
    );

    if (!primaryRepoUrl) {
      setError("Choose a primary repository first.");
      return;
    }

    if (
      compareRepoUrl &&
      compareRepoUrl.replace(/\/$/, "") === primaryRepoUrl.replace(/\/$/, "")
    ) {
      setError("Choose a different compare repository.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedNodeId(null);

    try {
      const [primaryGraph, compareGraph] = await Promise.all([
        fetchEvalGraph(primaryRepoUrl),
        compareRepoUrl ? fetchEvalGraph(compareRepoUrl) : Promise.resolve(null),
      ]);

      const workspace = buildWorkspaceGraph(primaryGraph, compareGraph);
      setGraph(workspace);
      setSelectedNodeId(workspace.nodes[0]?.id ?? null);
      setActiveCommand("trace");
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "Unable to evaluate repository.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!fullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <EvalRepoPicker
        repos={repos}
        selectedRepoId={selectedRepoId}
        selectedCompareRepoId={selectedCompareRepoId}
        manualRepoUrl={manualRepoUrl}
        manualCompareRepoUrl={manualCompareRepoUrl}
        loading={loading}
        onSelectRepo={setSelectedRepoId}
        onSelectCompareRepo={setSelectedCompareRepoId}
        onManualRepoUrlChange={setManualRepoUrl}
        onManualCompareRepoUrlChange={setManualCompareRepoUrl}
        onConnectGitHub={connectGitHub}
        onRun={() => void runEval()}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <EvalGraphScene
        graph={graph}
        activeCommand={activeCommand}
        highlightedIds={highlightedIds}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onCommandChange={setActiveCommand}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
      />
    </div>
  );
}
