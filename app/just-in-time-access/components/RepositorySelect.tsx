"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RepositorySummary } from "../types";

type RepositoryApiRecord = {
  id: string;
  name?: string | null;
  repo_url: string;
};

export default function RepositorySelect({
  accessToken,
  value,
  onChange,
}: {
  accessToken?: string | null;
  value?: string | null;
  onChange: (repo: RepositorySummary | null) => void;
}) {
  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;
    fetch(
      `/api/repositories/mine?accessToken=${encodeURIComponent(accessToken)}`,
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!mounted) return;
        setRepos(
          ((data?.repos ?? []) as RepositoryApiRecord[]).map((r) => ({
            id: r.id,
            name: r.name || r.repo_url,
            repoUrl: r.repo_url,
          })),
        );
      })
      .catch(() => {
        if (!mounted) return;
        setRepos([]);
      })
      .finally(() => mounted && setHasFetched(true));

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const loading = Boolean(accessToken) && !hasFetched;

  return (
    <div>
      <label className="text-sm font-medium text-foreground">
        Repository (optional)
      </label>
      {/* Use a non-empty sentinel for the "none" option because Select.Item
          requires a non-empty value. Map the sentinel back to null for callers. */}
      <Select
        value={value ?? "__none"}
        onValueChange={(v) =>
          onChange(v === "__none" ? null : repos.find((repo) => repo.id === v) ?? null)
        }
      >
        <SelectTrigger className="h-10 w-full bg-background">
          <SelectValue
            placeholder={
              loading
                ? "Loading repositories..."
                : "Select repository (optional)"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">None</SelectItem>
          {repos.map((repo) => (
            <SelectItem key={repo.id} value={repo.id}>
              {repo.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-xs text-muted-foreground">
        Select the GitHub repository this sandbox session should be tied to.
      </p>
    </div>
  );
}
