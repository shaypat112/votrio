import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { getAccessibleTeamIds } from "@/app/lib/server/teams";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken") ?? undefined;

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const accessibleTeamIds = await getAccessibleTeamIds(accessToken, userId);
    const teamFilter = accessibleTeamIds.length
      ? `,team_id.in.(${accessibleTeamIds.join(",")})`
      : "";
    const res = await supabaseFetch(
      env,
      `repositories?or=(owner_id.eq.${userId}${teamFilter})&select=id,repo_url,name,description,tags,is_public,status,review_count,rating_avg,created_at,team_id&order=created_at.desc`,
      { accessToken },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const repos = await res.json();
    return NextResponse.json({ repos });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
