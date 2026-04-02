"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type RepoRow = {
  id: string;
  name: string;
  repo_url: string;
  description: string | null;
  is_public: boolean;
  status: string;
};

export default function MyRepositories() {
  const supabase = useMemo(() => createClient(), []);
  const [repos, setRepos] = useState<RepoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        if (mounted) {
          setError("Sign in to view your repositories.");
          setLoading(false);
        }
        return;
      }

      const res = await fetch(`/api/repositories/mine?accessToken=${accessToken}`);
      if (!mounted) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Unable to load repositories.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setRepos((data?.repos ?? []) as RepoRow[]);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-zinc-500">{error}</p>;
  }

  if (repos.length === 0) {
    return <p className="text-sm text-zinc-500">No repositories submitted yet.</p>;
  }

  return (
    <div className="space-y-3">
      {repos.map((repo) => (
        <Card key={repo.id}>
          <CardContent className="p-4 flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">{repo.name}</p>
              <p className="text-xs text-zinc-500">{repo.repo_url}</p>
            </div>
            {repo.description ? (
              <p className="text-xs text-zinc-400">{repo.description}</p>
            ) : null}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{repo.is_public ? "Public" : "Private"}</span>
              <span>·</span>
              <span>{repo.status}</span>
            </div>
            <div>
              <Button size="sm" asChild>
                <Link href={`/repositories/${repo.id}`}>View repository</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
