import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

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

    const [ownedRes, memberRes] = await Promise.all([
      supabaseFetch(env, `teams?owner_id=eq.${userId}&select=id,name,slug,owner_id,created_at`, {
        accessToken,
      }),
      supabaseFetch(
        env,
        `team_members?user_id=eq.${userId}&select=team_id,role,teams(id,name,slug,owner_id,created_at)`,
        { accessToken },
      ),
    ]);

    if (!ownedRes.ok) {
      const text = await ownedRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    if (!memberRes.ok) {
      const text = await memberRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const owned = (await ownedRes.json()) as Array<any>;
    const memberRows = (await memberRes.json()) as Array<{ teams?: any; role?: string }>;

    const teams = new Map<string, any>();
    for (const row of owned) {
      teams.set(row.id, { ...row, role: "owner" });
    }
    for (const row of memberRows) {
      if (row.teams?.id && !teams.has(row.teams.id)) {
        teams.set(row.teams.id, { ...row.teams, role: row.role ?? "member" });
      }
    }

    return NextResponse.json({ teams: Array.from(teams.values()) });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
