import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { isTeamOwner } from "@/app/lib/server/teams";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, memberId } = await request.json();

    if (!accessToken || !memberId) {
      return NextResponse.json({ error: "Missing accessToken or memberId." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const memberLookupRes = await supabaseFetch(
      env,
      `team_members?id=eq.${memberId}&select=id,team_id,user_id,role`,
      { accessToken },
    );

    if (!memberLookupRes.ok) {
      const text = await memberLookupRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await memberLookupRes.json();
    const member = rows?.[0];
    if (!member?.team_id) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const canManageTeam = await isTeamOwner(accessToken, userId, member.team_id);
    if (!canManageTeam) {
      return NextResponse.json({ error: "Only team owners can remove members." }, { status: 403 });
    }

    if (member.role === "owner") {
      return NextResponse.json({ error: "Owners cannot be removed from their team." }, { status: 400 });
    }

    const res = await supabaseFetch(env, `team_members?id=eq.${memberId}`, {
      method: "DELETE",
      accessToken,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
