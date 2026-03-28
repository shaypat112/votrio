import { NextResponse } from "next/server";
import { getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const env = getSupabaseEnv();
    const repoId = params.id;

    const res = await supabaseFetch(
      env,
      `repositories?id=eq.${repoId}&select=id,repo_url,name,description,tags,is_public,status,review_count,rating_avg,last_review_excerpt,last_review_at,created_at,owner_id`,
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
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
