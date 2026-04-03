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
    const { searchParams } = new URL(request.url);
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId." }, { status: 400 });
    }

    const accessibleTeamIds = await getAccessibleTeamIds(accessToken, userId);
    if (!accessibleTeamIds.includes(teamId)) {
      return NextResponse.json({ error: "You do not have access to this team." }, { status: 403 });
    }

    const env = getSupabaseEnv();
    const res = await supabaseFetch(
      env,
      `team_members?team_id=eq.${teamId}&select=id,role,user_id,profiles(full_name,username,avatar_url)`,
      { accessToken },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const members = await res.json();
    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
