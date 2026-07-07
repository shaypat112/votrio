"use client";

import {
  GitCompareArrows,
  Github,
  Play,
  Clock,
  RefreshCw,
  Database,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ConnectedRepo } from "@/app/profile/components/RepoTable";
import { useState } from "react";

export function EvalRepoPicker({
  repos,
  selectedRepoId,
  selectedCompareRepoId,
  manualRepoUrl,
  manualCompareRepoUrl,
  loading,
  onSelectRepo,
  onSelectCompareRepo,
  onManualRepoUrlChange,
  onManualCompareRepoUrlChange,
  onConnectGitHub,
  onRun,
}: {
  repos: ConnectedRepo[];
  selectedRepoId: string;
  selectedCompareRepoId: string;
  manualRepoUrl: string;
  manualCompareRepoUrl: string;
  loading: boolean;
  onSelectRepo: (repoId: string) => void;
  onSelectCompareRepo: (repoId: string) => void;
  onManualRepoUrlChange: (value: string) => void;
  onManualCompareRepoUrlChange: (value: string) => void;
  onConnectGitHub: () => void;
  onRun: () => void;
}) {
  const [inputMode, setInputMode] = useState<"select" | "manual">("select");
  const [compareInputMode, setCompareInputMode] = useState<"select" | "manual">(
    "select",
  );

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);
  const selectedCompareRepo = repos.find((r) => r.id === selectedCompareRepoId);

  const isValidUrl = (url: string) => {
    const githubUrlPattern =
      /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    const ownerRepoPattern = /^[\w-]+\/[\w.-]+$/;
    return githubUrlPattern.test(url) || ownerRepoPattern.test(url);
  };

  const canRun =
    (selectedRepoId && selectedRepoId !== "") || isValidUrl(manualRepoUrl);

  return (
    <Card className="overflow-hidden subtle-border bg-card text-foreground elevated">
      <CardHeader className="border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                Repository Analysis
                <Badge variant="outline" className="text-xs">
                  Analysis
                </Badge>
              </div>
              <p className="mt-1 text-sm font-normal text-muted-foreground">
                Analyze code architecture, security posture, and dependencies
              </p>
            </div>
          </CardTitle>
          {repos.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              {repos.length} connected
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Primary Repository */}
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Primary Repository</p>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    Required
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The main repository to analyze and visualize
                </p>
              </div>
              <Shield className="h-5 w-5 text-primary" />
            </div>

            <div className="flex gap-2">
              <Button
                variant={inputMode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("select")}
                className="flex-1"
              >
                <Github className="h-4 w-4 mr-2" />
                Connected
              </Button>
              <Button
                variant={inputMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("manual")}
                className="flex-1"
              >
                Manual URL
              </Button>
            </div>

            {inputMode === "select" ? (
              <Select value={selectedRepoId} onValueChange={onSelectRepo}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a connected repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No repositories connected
                    </div>
                  ) : (
                    repos.map((repo) => (
                      <SelectItem key={repo.id} value={repo.id}>
                        <div className="flex items-center gap-2">
                          <Github className="h-4 w-4" />
                          {repo.full_name}
                          {repo.private && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Private
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input
                  value={manualRepoUrl}
                  onChange={(event) =>
                    onManualRepoUrlChange(event.target.value)
                  }
                  placeholder="owner/repo or https://github.com/owner/repo"
                  className="h-11"
                />
                {manualRepoUrl && !isValidUrl(manualRepoUrl) && (
                  <p className="text-xs text-destructive">
                    Please enter a valid GitHub repository URL or owner/repo
                    format
                  </p>
                )}
              </div>
            )}

            {selectedRepo && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
                <Github className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedRepo.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRepo.private ? "Private" : "Public"} • Last scanned{" "}
                    {selectedRepo.last_scanned_at
                      ? new Date(
                          selectedRepo.last_scanned_at,
                        ).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Compare Repository */}
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Compare Repository</p>
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Compare architecture or connect flows between repositories
                </p>
              </div>
              <GitCompareArrows className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex gap-2">
              <Button
                variant={compareInputMode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setCompareInputMode("select")}
                className="flex-1"
              >
                <Github className="h-4 w-4 mr-2" />
                Connected
              </Button>
              <Button
                variant={compareInputMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setCompareInputMode("manual")}
                className="flex-1"
              >
                Manual URL
              </Button>
            </div>

            {compareInputMode === "select" ? (
              <Select
                value={selectedCompareRepoId}
                onValueChange={onSelectCompareRepo}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Optional compare repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos
                    .filter((repo) => repo.id !== selectedRepoId)
                    .map((repo) => (
                      <SelectItem key={repo.id} value={repo.id}>
                        <div className="flex items-center gap-2">
                          <Github className="h-4 w-4" />
                          {repo.full_name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input
                  value={manualCompareRepoUrl}
                  onChange={(event) =>
                    onManualCompareRepoUrlChange(event.target.value)
                  }
                  placeholder="owner/repo or https://github.com/owner/repo"
                  className="h-11"
                />
                {manualCompareRepoUrl && !isValidUrl(manualCompareRepoUrl) && (
                  <p className="text-xs text-destructive">
                    Please enter a valid GitHub repository URL or owner/repo
                    format
                  </p>
                )}
              </div>
            )}

            {selectedCompareRepo && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
                <Github className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedCompareRepo.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCompareRepo.private ? "Private" : "Public"} •
                    Compare target
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {repos.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
            <Github className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No repositories connected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect your GitHub account to analyze your repositories
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onConnectGitHub}
              className="mt-4"
            >
              <Github className="h-4 w-4 mr-2" />
              Connect GitHub
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
          <Button
            onClick={onRun}
            disabled={loading || !canRun}
            className="h-11 px-8"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Repository...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Analysis
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onConnectGitHub} className="h-11">
            <Github className="h-4 w-4 mr-2" />
            Sync Repositories
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-11 text-muted-foreground"
          >
            <Clock className="h-4 w-4 mr-2" />
            Recent Analyses
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
