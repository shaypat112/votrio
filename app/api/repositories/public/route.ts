import { NextResponse } from "next/server";
import { getSupabaseEnv, parsePagination, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "newest";
    const search = searchParams.get("search")?.trim();
    const tag = searchParams.get("tag")?.trim();
    const { page, pageSize, offset } = parsePagination(searchParams, { page: 1, pageSize: 12 });

    let order = "created_at.desc";
    if (sort === "highest_rated") {
      order = "rating_avg.desc,review_count.desc";
    } else if (sort === "most_reviewed") {
      order = "review_count.desc,created_at.desc";
    }

    const env = getSupabaseEnv();
    const filters: string[] = [
      "is_public=eq.true",
      "status=eq.published",
    ];

    if (tag) {
      filters.push(`tags=cs.{${encodeURIComponent(tag)}}`);
    }

    if (search) {
      const q = encodeURIComponent(`%${search}%`);
      filters.push(`or=(name.ilike.${q},description.ilike.${q},repo_url.ilike.${q})`);
    }

    const res = await supabaseFetch(
      env,
      `repositories?${filters.join("&")}&select=id,repo_url,name,description,tags,review_count,rating_avg,last_review_excerpt,last_review_at,created_at,owner_id&order=${order}&limit=${pageSize}&offset=${offset}`,
      { accessToken: undefined },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const repos = await res.json();
    return NextResponse.json({ repos, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
