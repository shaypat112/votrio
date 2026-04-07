"use client";

import { GitCompareArrows, Github, Play, Sparkles } from "lucide-react";
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
import type { ConnectedRepo } from "@/app/profile/components/RepoTable";

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
  return (
    <Card className="overflow-hidden border-[color:var(--eval-border)] bg-[linear-gradient(180deg,var(--eval-bg-elevated),var(--eval-bg))] text-[color:var(--eval-text)] shadow-[0_0_50px_color-mix(in_oklab,var(--eval-accent)_12%,transparent)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-[color:var(--eval-accent-strong)]" />
          Repository Scope
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-[color:var(--eval-border)] bg-[color:var(--eval-accent-soft)] p-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--eval-text)]">Primary sector</p>
              <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
                This is the main repository that anchors the graph.
              </p>
            </div>
            <Select value={selectedRepoId} onValueChange={onSelectRepo}>
              <SelectTrigger className="h-12 border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)]">
                <SelectValue placeholder="Select a connected repository" />
              </SelectTrigger>
              <SelectContent>
                {repos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={manualRepoUrl}
              onChange={(event) => onManualRepoUrlChange(event.target.value)}
              placeholder="https://github.com/owner/repo"
              className="h-12 border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] placeholder:text-[color:var(--eval-text-muted)]"
            />
          </div>

          <div className="space-y-4 rounded-3xl border border-[color:var(--eval-border)] bg-[color:var(--eval-compare-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[color:var(--eval-text)]">
                  Compare sector
                </p>
                <p className="mt-1 text-xs text-[color:var(--eval-text-muted)]">
                  Attach a second repo to compare architecture or connect flows.
                </p>
              </div>
              <GitCompareArrows className="mt-1 h-4 w-4 text-[color:var(--eval-compare)]" />
            </div>
            <Select value={selectedCompareRepoId} onValueChange={onSelectCompareRepo}>
              <SelectTrigger className="h-12 border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)]">
                <SelectValue placeholder="Optional compare repository" />
              </SelectTrigger>
              <SelectContent>
                {repos
                  .filter((repo) => repo.id !== selectedRepoId)
                  .map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              value={manualCompareRepoUrl}
              onChange={(event) =>
                onManualCompareRepoUrlChange(event.target.value)
              }
              placeholder="https://github.com/owner/second-repo"
              className="h-12 border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] placeholder:text-[color:var(--eval-text-muted)]"
            />
          </div>
        </div>

        {repos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--eval-border)] bg-[color:var(--eval-panel-soft)] p-4 text-sm text-[color:var(--eval-text-muted)]">
            <p>No repositories connected yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onConnectGitHub}
              className="mt-3 border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] hover:bg-[color:var(--eval-panel-soft)]"
            >
              <Github className="h-4 w-4" />
              Connect GitHub
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onRun}
            disabled={loading || (!selectedRepoId && !manualRepoUrl.trim())}
            className="h-11 bg-[color:var(--eval-accent)] px-6 text-[color:var(--primary-foreground)] hover:bg-[color:var(--eval-accent-strong)]"
          >
            <Play className="h-4 w-4" />
            {loading ? "Mapping workspace..." : "Open 3D Workspace"}
          </Button>
          <Button
            variant="outline"
            onClick={onConnectGitHub}
            className="h-11 border-[color:var(--eval-border)] bg-[color:var(--eval-panel)] text-[color:var(--eval-text)] hover:bg-[color:var(--eval-panel-soft)]"
          >
            <Github className="h-4 w-4" />
            Sync Repositories
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
