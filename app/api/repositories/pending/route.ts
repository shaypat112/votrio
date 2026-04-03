import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  parsePagination,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type Repo = {
  id: string;
  owner_id: string;
  repo_url: string;
  name: string;
  description: string | null;
  tags: string[];
  review_count: number;
  rating_avg: number | null;
  last_review_excerpt: string | null;
  last_review_at: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { accessToken, userId } = requireRequestAuth(request);
    const { page, pageSize, offset } = parsePagination(searchParams, { page: 1, pageSize: 10 });

    const env = getSupabaseEnv();

    const reviewsRes = await supabaseFetch(
      env,
      `reviews?author_id=eq.${userId}&select=repo_id`,
      { accessToken },
    );

    if (!reviewsRes.ok) {
      const text = await reviewsRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const reviewed = (await reviewsRes.json()) as Array<{ repo_id: string }>;
    const reviewedIds = new Set(reviewed.map((row) => row.repo_id));

    const reposRes = await supabaseFetch(
      env,
      `repositories?is_public=eq.true&status=eq.published&select=id,repo_url,name,description,tags,review_count,rating_avg,last_review_excerpt,last_review_at,created_at,owner_id&order=created_at.desc&limit=100`,
      { accessToken },
    );

    if (!reposRes.ok) {
      const text = await reposRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

const repos = (await reposRes.json()) as Repo[];    const pending = repos.filter(
      (repo) => repo.owner_id !== userId && !reviewedIds.has(repo.id),
    );

    const paginated = pending.slice(offset, offset + pageSize);

    return NextResponse.json({ repos: paginated, page, pageSize, total: pending.length });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
