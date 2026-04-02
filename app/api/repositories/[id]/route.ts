import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const env = getSupabaseEnv();
    const { id } = await context.params;
    const repoId = id;

    const res = await supabaseFetch(
      env,
      `repositories?id=eq.${repoId}&select=id,repo_url,name,description,tags,is_public,status,review_count,rating_avg,last_review_excerpt,last_review_at,created_at,owner_id,team_id`,
      { accessToken: undefined },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await res.json();
    const repo = rows?.[0];

    if (!repo) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    return NextResponse.json({ repo });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
