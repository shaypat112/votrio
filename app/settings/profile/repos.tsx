"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useSettings } from "./context";
import { SectionCard } from "./primitives";

type Repo = {
  id: string;
  repo_url: string;
  name: string;
  description: string | null;
  is_public: boolean;
  status: string;
  review_count: number;
  rating_avg: number;
};

export function ReposSection() {
  const { accessToken, setError } = useSettings();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const load = async () => {
      setLoading(true);
      const res = await fetch(
        `/api/repositories/mine?accessToken=${accessToken}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRepos(data?.repos ?? []);
      }
      setLoading(false);
    };
    load();
  }, [accessToken]);

  const updateVisibility = async (repoId: string, isPublic: boolean) => {
    if (!accessToken) return;

    const res = await fetch("/api/repositories/update-visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, repoId, isPublic }),
    });

    if (res.ok) {
      const data = await res.json();
      const updated = data?.repo as Repo | undefined;
      if (updated) {
        setRepos((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to update visibility.");
    }
  };

  return (
    <SectionCard
      title="Repository visibility"
      description="Control which of your repos are public."
    >
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories…
        </div>
      ) : repos.length === 0 ? (
        <p className="py-4 text-sm text-zinc-500">
          No repositories submitted yet.
        </p>
      ) : (
        <div className="space-y-2">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {repo.name}
                </p>
                <p className="truncate text-xs text-zinc-600">
                  {repo.repo_url}
                </p>
              </div>
              <button
                onClick={() => updateVisibility(repo.id, !repo.is_public)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  repo.is_public
                    ? "bg-card text-foreground hover:bg-muted"
                    : "border border-border text-zinc-400 hover:border-border hover:text-zinc-200",
                )}
              >
                {repo.is_public ? "Public" : "Private"}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
