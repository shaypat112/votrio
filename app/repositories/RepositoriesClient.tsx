"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_reviewed", label: "Most reviewed" },
  { value: "highest_rated", label: "Highest rated" },
];

type PublicRepo = {
  id: string;
  name: string;
  repo_url: string;
  description: string | null;
  tags: string[];
  review_count: number;
  rating_avg: number;
  last_review_excerpt: string | null;
  created_at: string;
};

export default function RepositoriesClient() {
  const [repos, setRepos] = useState<PublicRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const loadRepos = async (nextPage = 1, nextSort = sort, nextSearch = search, nextTag = tag) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      sort: nextSort,
      page: String(nextPage),
      pageSize: "9",
    });

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextTag && nextTag !== "all") {
      params.set("tag", nextTag);
    }

    const res = await fetch(`/api/repositories/public?${params.toString()}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to load repositories.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRepos((data?.repos ?? []) as PublicRepo[]);
    setPage(nextPage);
    setLoading(false);
  };

  useEffect(() => {
    loadRepos(1, sort, search, tag);
  }, [sort, tag]);

  const availableTags = Array.from(
    new Set(repos.flatMap((repo) => repo.tags ?? [])),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Public repositories</p>
          <h1 className="text-2xl font-semibold text-white">Explore community reviews</h1>
          <p className="text-sm text-zinc-400">
            Browse published repositories, see ratings, and leave your own feedback.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/submit-repo">Submit repo</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <Input
            placeholder="Search repositories"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadRepos(1, sort, search, tag)}
          >
            Search
          </Button>
          <div className="w-full sm:w-44">
            <Select value={tag} onValueChange={(value) => setTag(value)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">
                  All tags
                </SelectItem>
                {availableTags.map((item) => (
                  <SelectItem key={item} value={item} className="text-sm">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Select value={sort} onValueChange={(value) => setSort(value)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-sm">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading repositories...</p>
      ) : repos.length === 0 ? (
        <p className="text-sm text-zinc-500">No public repositories yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <Card key={repo.id} className="bg-zinc-950/40 border-zinc-800">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base text-white">{repo.name}</CardTitle>
                <p className="text-xs text-zinc-500">{repo.repo_url}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-400">
                  {repo.description ?? "No description yet."}
                </p>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{repo.review_count} reviews</span>
                  <span>Avg {repo.rating_avg ?? 0}</span>
                </div>
                {repo.tags?.length ? (
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    {repo.tags.map((tagItem) => (
                      <span key={tagItem} className="rounded-full border border-zinc-800 px-2 py-0.5">
                        {tagItem}
                      </span>
                    ))}
                  </div>
                ) : null}
                {repo.last_review_excerpt ? (
                  <p className="text-xs text-zinc-400">“{repo.last_review_excerpt}”</p>
                ) : null}
                <Button size="sm" asChild>
                  <Link href={`/repositories/${repo.id}`}>View details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => loadRepos(Math.max(1, page - 1), sort, search, tag)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button size="sm" variant="outline" onClick={() => loadRepos(page + 1, sort, search, tag)}>
          Next
        </Button>
      </div>
    </div>
  );
}
