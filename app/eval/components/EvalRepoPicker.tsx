"use client";

import { Github, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  loading,
  onSelectRepo,
  onConnectGitHub,
  onRun,
}: {
  repos: ConnectedRepo[];
  selectedRepoId: string;
  loading: boolean;
  onSelectRepo: (repoId: string) => void;
  onConnectGitHub: () => void;
  onRun: () => void;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Repository Scope</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Choose a connected repository
          </p>
          <Select value={selectedRepoId} onValueChange={onSelectRepo}>
            <SelectTrigger className="h-12 bg-background">
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
          <p className="text-xs text-muted-foreground">
            Eval uses the same repo-connected flow as scans and JIT access.
          </p>
        </div>

        {repos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p>No repositories connected yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onConnectGitHub}
              className="mt-3"
            >
              <Github className="h-4 w-4" />
              Connect GitHub
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={onRun} disabled={loading || !selectedRepoId} className="h-11 px-6">
              <Play className="h-4 w-4" />
              {loading ? "Mapping..." : "Open 3D Map"}
            </Button>
            <Button variant="outline" onClick={onConnectGitHub} className="h-11">
              <Github className="h-4 w-4" />
              Sync Repositories
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
