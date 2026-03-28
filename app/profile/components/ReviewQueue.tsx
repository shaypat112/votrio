"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PendingRepo = {
  id: string;
  name: string;
  repo_url: string;
  description: string | null;
  review_count: number;
  rating_avg: number;
  last_review_excerpt: string | null;
};

export default function ReviewQueue() {
  const supabase = useMemo(() => createClient(), []);
  const [repos, setRepos] = useState<PendingRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        if (mounted) {
          setError("Sign in to view pending reviews.");
          setLoading(false);
        }
        return;
      }

      const res = await fetch(`/api/repositories/pending?accessToken=${accessToken}`);
      if (!mounted) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Unable to load repositories.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setRepos((data?.repos ?? []) as PendingRepo[]);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading repositories...</p>;
  }

  if (error) {
    return <p className="text-sm text-zinc-500">{error}</p>;
  }

  if (repos.length === 0) {
    return <p className="text-sm text-zinc-500">No repositories left to review.</p>;
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
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span>{repo.review_count} reviews</span>
              <span>Avg rating {repo.rating_avg ?? 0}</span>
            </div>
            {repo.last_review_excerpt ? (
              <p className="text-xs text-zinc-400">“{repo.last_review_excerpt}”</p>
            ) : null}
            <div>
              <Button size="sm" asChild>
                <Link href={`/repositories/${repo.id}`}>Leave review</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
