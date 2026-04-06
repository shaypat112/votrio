"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import type { ConnectedRepo } from "@/app/profile/components/RepoTable";

import { EvalRepoPicker } from "./components/EvalRepoPicker";
import { EvalGraphScene } from "./components/EvalGraphScene";
import { buildEvalLoadedLines } from "./lib/terminal";
import type { EvalCommandId, EvalPayload } from "./lib/types";

export default function EvalClient() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [graph, setGraph] = useState<EvalPayload | null>(null);
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCommand, setActiveCommand] = useState<EvalCommandId | null>(
    null,
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
      return new Set(graph.attackPath.slice(0, 2));
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
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRepos();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadRepos]);

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

  const runEval = async () => {
    const selectedRepo = repos.find((repo) => repo.id === selectedRepoId);
    if (!selectedRepo) {
      setError("Choose a connected repository first.");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveCommand(null);
    setSelectedNodeId(null);

    const res = await fetch("/api/eval/repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl: `https://github.com/${selectedRepo.full_name}`,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "Unable to evaluate repository.");
      setLoading(false);
      return;
    }

    const nextGraph = data as EvalPayload;
    setGraph(nextGraph);
    setSelectedNodeId(nextGraph.nodes[0]?.id ?? null);
    setActiveCommand("trace");
    void buildEvalLoadedLines(nextGraph);
    setLoading(false);
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
        loading={loading}
        onSelectRepo={setSelectedRepoId}
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
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
      />
    </div>
  );
}
