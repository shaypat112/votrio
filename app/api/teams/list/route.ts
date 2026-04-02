import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
};

type TeamMemberRow = {
  role?: string;
  teams?: TeamRow;
};

type CountRow = {
  team_id: string;
};

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

    const [ownedRes, memberRes, repoRes, environmentRes] = await Promise.all([
      supabaseFetch(env, `teams?owner_id=eq.${userId}&select=id,name,slug,owner_id,created_at`, {
        accessToken,
      }),
      supabaseFetch(
        env,
        `team_members?user_id=eq.${userId}&select=team_id,role,teams(id,name,slug,owner_id,created_at)`,
        { accessToken },
      ),
      supabaseFetch(env, "repositories?team_id=not.is.null&select=team_id", {
        accessToken,
      }),
      supabaseFetch(env, "team_environments?select=team_id", {
        accessToken,
      }),
    ]);

    if (!ownedRes.ok) {
      const text = await ownedRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    if (!memberRes.ok) {
      const text = await memberRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    if (!repoRes.ok) {
      const text = await repoRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    if (!environmentRes.ok) {
      const text = await environmentRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const owned = (await ownedRes.json()) as TeamRow[];
    const memberRows = (await memberRes.json()) as TeamMemberRow[];
    const repoRows = (await repoRes.json()) as CountRow[];
    const environmentRows = (await environmentRes.json()) as CountRow[];

    const repoCounts = repoRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.team_id] = (acc[row.team_id] ?? 0) + 1;
      return acc;
    }, {});

    const environmentCounts = environmentRows.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.team_id] = (acc[row.team_id] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const teams = new Map<
      string,
      TeamRow & { role: string; repo_count: number; environment_count: number }
    >();
    for (const row of owned) {
      teams.set(row.id, {
        ...row,
        role: "owner",
        repo_count: repoCounts[row.id] ?? 0,
        environment_count: environmentCounts[row.id] ?? 0,
      });
    }
    for (const row of memberRows) {
      if (row.teams?.id && !teams.has(row.teams.id)) {
        teams.set(row.teams.id, {
          ...row.teams,
          role: row.role ?? "member",
          repo_count: repoCounts[row.teams.id] ?? 0,
          environment_count: environmentCounts[row.teams.id] ?? 0,
        });
      }
    }

    return NextResponse.json({ teams: Array.from(teams.values()) });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
