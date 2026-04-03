import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { getAccessibleTeamIds } from "@/app/lib/server/teams";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);

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
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
