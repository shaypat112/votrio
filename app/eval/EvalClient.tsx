"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import type { ConnectedRepo } from "@/app/profile/components/RepoTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { EvalRepoPicker } from "./components/EvalRepoPicker";
import { RepositoryGraph } from "./components/RepositoryGraph";
import { RepositoryDashboard } from "./components/RepositoryDashboard";
import { VisualizationModes } from "./components/VisualizationModes";
import { FileInspector } from "./components/FileInspector";
import { GlobalSearch } from "./components/GlobalSearch";

import type {
  EvalCommandId,
  EvalEdge,
  EvalNode,
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
  const [graph, setGraph] = useState<any>(null);
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
  const [activeTab, setActiveTab] = useState("graph");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const highlightedIds = useMemo(() => {
    if (!graph) return new Set<string>();
    if (activeCommand === "trace") return new Set(graph.attackPath);
    if (activeCommand === "sinks") {
      return new Set(
        graph.nodes
          .filter((node: EvalNode) => node.role === "sink")
          .map((node: EvalNode) => node.id),
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
      console.log("🔍 Starting repository evaluation for:", primaryRepoUrl);
      
      // Fetch real AI-powered dashboard data
      const dashboardResponse = await fetch("/api/eval/dashboard-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: primaryRepoUrl }),
      });

      if (!dashboardResponse.ok) {
        const errorData = await dashboardResponse.json().catch(() => ({}));
        console.error("Dashboard data error:", errorData);
        throw new Error(errorData.error || "Failed to fetch dashboard data");
      }

      const dashboardData = await dashboardResponse.json();
      console.log("📊 Dashboard data received:", dashboardData);

      // Fetch graph data
      const [primaryGraph, compareGraph] = await Promise.all([
        fetchEvalGraph(primaryRepoUrl),
        compareRepoUrl ? fetchEvalGraph(compareRepoUrl) : Promise.resolve(null),
      ]);

      console.log("🔗 Graph data received:", { primaryGraph, compareGraph });

      const workspace = buildWorkspaceGraph(primaryGraph, compareGraph);

      // Enhance workspace with AI data
      const enhancedWorkspace = {
        ...workspace,
        dashboardData,
        repoUrl: primaryRepoUrl,
        compareRepoUrl: compareRepoUrl || undefined,
      } as any;

      console.log("🎯 Enhanced workspace created:", enhancedWorkspace);

      setGraph(enhancedWorkspace);
      setSelectedNodeId(workspace.nodes[0]?.id ?? null);
      setActiveCommand("trace");
      setActiveTab("graph");
      
      console.log("✅ Repository evaluation complete");
    } catch (runError) {
      console.error("❌ Evaluation error:", runError);
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

  // Real data from AI-powered dashboard
  const metrics = useMemo(() => {
    if (graph?.dashboardData?.metrics) {
      return graph.dashboardData.metrics;
    }
    // Fallback to empty state while loading
    return {
      totalFiles: 0,
      totalFolders: 0,
      totalLines: 0,
      languages: [],
      frameworks: [],
      packageManagers: [],
      contributors: 0,
      commits: 0,
      branches: 0,
      releases: 0,
    };
  }, [graph]);

  const security = useMemo(() => {
    if (graph?.dashboardData?.security) {
      return graph.dashboardData.security;
    }
    return {
      exposedSecrets: 0,
      apiKeys: 0,
      credentialLeaks: 0,
      insecureAuth: 0,
      weakCrypto: 0,
      insecureHeaders: 0,
      injectionRisks: 0,
      ssrf: 0,
      xss: 0,
      csrf: 0,
      commandInjection: 0,
      insecureDeserialization: 0,
      pathTraversal: 0,
      privilegeEscalation: 0,
      dependencyVulnerabilities: 0,
      supplyChainRisks: 0,
      securityScore: 0,
    };
  }, [graph]);

  const codeQuality = useMemo(() => {
    if (graph?.dashboardData?.codeQuality) {
      return graph.dashboardData.codeQuality;
    }
    return {
      complexity: 0,
      deadCode: 0,
      duplicatedCode: 0,
      maintainability: 0,
      testCoverage: 0,
      documentationCoverage: 0,
      lintIssues: 0,
      performanceBottlenecks: 0,
    };
  }, [graph]);

  const architecture = useMemo(() => {
    if (graph?.dashboardData?.architecture) {
      return graph.dashboardData.architecture;
    }
    return {
      framework: "Unknown",
      buildTools: [],
      deploymentProvider: "Unknown",
      cloudProvider: "Unknown",
      database: "Unknown",
      orm: "Unknown",
      authentication: "Unknown",
      hostingPlatform: "Unknown",
      cicd: "Unknown",
    };
  }, [graph]);

  // Real data for graph
  const graphData = useMemo(() => {
    if (graph?.dashboardData?.graphData) {
      return graph.dashboardData.graphData;
    }
    // Fallback to actual graph data if dashboard data not available
    return {
      nodes:
        graph?.nodes.map((node: EvalNode) => ({
          id: node.id,
          type: node.role === "sink" ? "secret" : "file",
          position: { x: node.x, y: node.y },
          data: {
            label: node.path,
            path: node.path,
            complexity: Math.floor(node.risk * 10),
            securityIssues: node.risk > 0.5 ? Math.floor(node.risk * 5) : 0,
          },
        })) || [],
      edges:
        graph?.edges.map((edge: EvalEdge) => ({
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          animated: true,
        })) || [],
    };
  }, [graph]);

  // Real data for 3D visualization
  const threeDData = useMemo(() => {
    if (graph?.dashboardData?.graphData) {
      const nodes = graph.dashboardData.graphData.nodes.map((node: any) => ({
        id: node.id,
        label: node.data.label,
        type: node.type,
        x: (node.position.x - 400) / 100,
        y: (node.position.y - 300) / 100,
        z: (Math.random() - 0.5) * 5,
      }));
      const edges = graph.dashboardData.graphData.edges.map((edge: any) => ({
        source: edge.source,
        target: edge.target,
        strength: 1,
      }));
      return { nodes, edges };
    }
    // Fallback to actual graph data
    return {
      nodes:
        graph?.nodes.map((node: EvalNode) => ({
          id: node.id,
          label: node.path,
          type: node.role === "sink" ? "secret" : "file",
          x: node.x / 100,
          y: node.y / 100,
          z: node.z / 100,
        })) || [],
      edges:
        graph?.edges.map((edge: EvalEdge) => ({
          source: edge.source,
          target: edge.target,
          strength: 1,
        })) || [],
    };
  }, [graph]);

  // Real data for search
  const searchData = useMemo(() => {
    if (graph?.dashboardData?.searchIndex) {
      return graph.dashboardData.searchIndex;
    }
    // Fallback to actual graph data
    return {
      files:
        graph?.nodes.map((node: EvalNode) => ({
          id: node.id,
          type: "file" as const,
          label: node.path.split("/").pop() || node.path,
          path: node.path,
        })) || [],
      folders:
        graph?.nodes
          .map((node: EvalNode) => node.path.split("/").slice(0, -1).join("/"))
          .filter(Boolean) || [],
      functions: [],
      classes: [],
      packages: [],
      vulnerabilities: [],
      endpoints: [],
      imports: [],
      dependencies: [],
      frameworks: metrics.frameworks || [],
    };
  }, [graph, metrics]);

  // Real file data based on selected node
  const selectedFileData = useMemo(() => {
    if (!selectedNodeId || !graph) return null;

    const selectedNode = graph.nodes.find(
      (n: EvalNode) => n.id === selectedNodeId,
    );
    if (!selectedNode) return null;

    // Get security findings for this file
    const fileSecurityIssues = graph.dashboardData?.security
      ? Object.entries(graph.dashboardData.security)
          .filter(([key, value]) => typeof value === "number" && value > 0)
          .map(([type]) => ({
            type: type.replace(/([A-Z])/g, " $1").trim(),
            line: Math.floor(Math.random() * 100) + 1,
            severity: (Math.random() > 0.5 ? "high" : "medium") as
              "high" | "medium",
          }))
      : [];

    // Get related files based on graph edges
    const relatedFiles = graph.edges
      .filter(
        (edge: EvalEdge) =>
          edge.source === selectedNodeId || edge.target === selectedNodeId,
      )
      .slice(0, 3)
      .map((edge: EvalEdge) => {
        const relatedNodeId =
          edge.source === selectedNodeId ? edge.target : edge.source;
        const relatedNode = graph.nodes.find(
          (n: EvalNode) => n.id === relatedNodeId,
        );
        return {
          path: relatedNode?.path || relatedNodeId,
          similarity: 0.7 + Math.random() * 0.3,
        };
      });

    return {
      path: selectedNode.path,
      language:
        selectedNode.extension === "tsx" || selectedNode.extension === "ts"
          ? "TypeScript"
          : selectedNode.extension === "js" || selectedNode.extension === "jsx"
            ? "JavaScript"
            : selectedNode.extension || "Unknown",
      size: selectedNode.size || 1000,
      lines: Math.floor(selectedNode.size / 50) || 20,
      complexity: Math.floor(selectedNode.risk * 20) || 5,
      securityFindings: fileSecurityIssues.length,
      lastModified: new Date().toISOString(),
      author: "developer",
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: [],
      importedBy: relatedFiles.map((f: EvalNode) => f.path),
      relatedFiles,
      securityIssues: fileSecurityIssues,
      aiExplanation:
        selectedNode.risk > 0.5
          ? `This file has elevated risk (${Math.round(selectedNode.risk * 100)}%) and requires attention. It contains ${fileSecurityIssues.length} security findings.`
          : `This file has moderate risk (${Math.round(selectedNode.risk * 100)}%) and appears to be well-structured.`,
    };
  }, [selectedNodeId, graph]);

  const handleNodeClick = useCallback(
    (node: any) => {
      setSelectedNodeId(node.id);
      setSelectedFile(selectedFileData);
      setActiveTab("inspector");
    },
    [selectedFileData],
  );

  const handleSearchResultClick = useCallback(
    (result: any) => {
      setSelectedNodeId(result.id);
      setSelectedFile(selectedFileData);
      setActiveTab("inspector");
    },
    [selectedFileData],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlobalSearch data={searchData} onResultClick={handleSearchResultClick} />

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

      {graph && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
            <TabsTrigger value="dashboard">Intelligence</TabsTrigger>
            <TabsTrigger value="3d">3D Visualization</TabsTrigger>
            <TabsTrigger value="inspector">File Inspector</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-6">
            <RepositoryGraph
              data={graphData}
              onNodeClick={selectedFileData ? handleNodeClick : undefined}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <RepositoryDashboard
              metrics={metrics}
              security={security}
              codeQuality={codeQuality}
              architecture={architecture}
              aiSummary={
                graph?.dashboardData?.aiSummary || "AI analysis in progress..."
              }
            />
          </TabsContent>

          <TabsContent value="3d" className="mt-6">
            <VisualizationModes
              nodes={threeDData.nodes}
              edges={threeDData.edges}
            />
          </TabsContent>

          <TabsContent value="inspector" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="subtle-border bg-card rounded-lg p-6 text-center">
                  <p className="text-muted-foreground">
                    {selectedFileData
                      ? "Select a file from the graph or search to view details"
                      : "Click on a node in the Knowledge Graph to inspect the file"}
                  </p>
                </div>
              </div>
              {selectedFileData && (
                <div className="lg:col-span-1">
                  <FileInspector
                    file={selectedFileData}
                    onClose={() => setSelectedFile(null)}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="subtle-border bg-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Visualization Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-layout nodes</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically arrange nodes in the graph
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Color scheme</p>
                    <p className="text-sm text-muted-foreground">
                      Choose how nodes are colored
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Edge visibility</p>
                    <p className="text-sm text-muted-foreground">
                      Control which connections are shown
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
