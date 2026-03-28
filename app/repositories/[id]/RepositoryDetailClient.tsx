"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RepoDetail = {
  id: string;
  name: string;
  repo_url: string;
  description: string | null;
  tags: string[];
  review_count: number;
  rating_avg: number;
  last_review_excerpt: string | null;
};

type Review = {
  id: string;
  repo_id: string;
  author_id: string;
  rating: number;
  title: string | null;
  body: string;
  version: number;
  created_at: string;
  edited_at: string | null;
  profiles?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
};

export default function RepositoryDetailClient({ repoId }: { repoId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [repo, setRepo] = useState<RepoDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ rating: "5", title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async (nextPage = 1) => {
    setLoading(true);
    setError(null);

    const [repoRes, reviewsRes] = await Promise.all([
      fetch(`/api/repositories/${repoId}`),
      fetch(`/api/reviews?repoId=${repoId}&page=${nextPage}&pageSize=5`),
    ]);

    if (!repoRes.ok || !reviewsRes.ok) {
      const repoErr = await repoRes.json().catch(() => ({}));
      const reviewsErr = await reviewsRes.json().catch(() => ({}));
      setError(repoErr?.error ?? reviewsErr?.error ?? "Unable to load repository.");
      setLoading(false);
      return;
    }

    const repoData = await repoRes.json();
    const reviewsData = await reviewsRes.json();
    setRepo(repoData?.repo ?? null);
    setReviews((reviewsData?.reviews ?? []) as Review[]);
    setPage(nextPage);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      if (mounted) {
        setCurrentUserId(userData.user?.id ?? null);
      }
      await load(1);
      if (!sessionData.session?.access_token && mounted) {
        setError(null);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [repoId, supabase]);

  const submitReview = async () => {
    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please sign in to leave a review.");
      setSubmitting(false);
      return;
    }

    const payload = {
      accessToken,
      repoId,
      rating: Number(form.rating),
      title: form.title || null,
      body: form.body,
    };

    const res = await fetch("/api/reviews", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, reviewId: editingId } : payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to submit review.");
      setSubmitting(false);
      return;
    }

    setForm({ rating: "5", title: "", body: "" });
    setEditingId(null);
    await load(1);
    setSubmitting(false);
  };

  const editReview = (review: Review) => {
    setEditingId(review.id);
    setForm({
      rating: String(review.rating),
      title: review.title ?? "",
      body: review.body,
    });
  };

  const deleteReview = async (reviewId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please sign in to delete a review.");
      return;
    }

    const res = await fetch("/api/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, reviewId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to delete review.");
      return;
    }

    await load(page);
  };

  const flagReview = async (reviewId: string) => {
    const reason = window.prompt("Why are you reporting this review?");
    if (!reason) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please sign in to report a review.");
      return;
    }

    const res = await fetch("/api/reviews/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, reviewId, reason }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to report review.");
      return;
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading repository...</p>;
  }

  if (error && !repo) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-400">{error}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/repositories">Back to repositories</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Repository</p>
          <h1 className="text-2xl font-semibold text-white">{repo?.name}</h1>
          <p className="text-sm text-zinc-400">{repo?.repo_url}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/repositories">All repositories</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-zinc-300">{repo?.description ?? "No description yet."}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>{repo?.review_count ?? 0} reviews</span>
            <span>Avg rating {repo?.rating_avg ?? 0}</span>
          </div>
          {repo?.tags?.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              {repo.tags.map((tagItem) => (
                <span key={tagItem} className="rounded-full border border-zinc-800 px-2 py-0.5">
                  {tagItem}
                </span>
              ))}
            </div>
          ) : null}
          {repo?.last_review_excerpt ? (
            <p className="text-xs text-zinc-400">“{repo.last_review_excerpt}”</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Leave a review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rating</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Review</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              rows={4}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={submitReview} disabled={submitting || !form.body.trim()}>
              {editingId ? "Update review" : "Submit review"}
            </Button>
            {editingId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm({ rating: "5", title: "", body: "" });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Recent reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-zinc-500">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {review.title ?? "Untitled review"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {review.profiles?.full_name ?? review.profiles?.username ?? "Reviewer"}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400">Rating {review.rating}</span>
                </div>
                <p className="text-sm text-zinc-300">{review.body}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  {review.edited_at ? <span>Edited</span> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.author_id === currentUserId ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => editReview(review)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteReview(review.id)}>
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => flagReview(review.id)}>
                      Report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => load(Math.max(1, page - 1))}>
            Previous
          </Button>
          <Button size="sm" variant="outline" onClick={() => load(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
