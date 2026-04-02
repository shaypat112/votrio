import { NextResponse } from "next/server";
import {
  decodeUserId,
  getSupabaseEnv,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { isTeamOwner } from "@/app/lib/server/teams";

export const runtime = "nodejs";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken") ?? undefined;
    const teamId = searchParams.get("teamId");

    if (!accessToken || !teamId) {
      return NextResponse.json(
        { error: "Missing accessToken or teamId." },
        { status: 400 },
      );
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const res = await supabaseFetch(
      env,
      `team_environments?team_id=eq.${teamId}&select=id,team_id,repo_id,name,slug,provider,github_owner,metadata,created_at,updated_at&order=created_at.desc`,
      { accessToken },
    );

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    return NextResponse.json({ environments: await res.json() });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const {
      accessToken,
      teamId,
      name,
      githubOwner,
      repoId,
      provider,
      metadata,
    } = await request.json();

    if (!accessToken || !teamId || !name) {
      return NextResponse.json(
        { error: "Missing accessToken, teamId, or name." },
        { status: 400 },
      );
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const canManage = await isTeamOwner(accessToken, userId, String(teamId));
    if (!canManage) {
      return NextResponse.json(
        { error: "Only team owners can create environments." },
        { status: 403 },
      );
    }

    const env = getSupabaseEnv();
    const slug = slugify(String(name));
    const res = await supabaseFetch(env, "team_environments", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        team_id: teamId,
        repo_id: repoId ?? null,
        name,
        slug,
        provider: provider ?? "github",
        github_owner: githubOwner ?? null,
        metadata: metadata ?? {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    const rows = await res.json();
    return NextResponse.json({ environment: rows?.[0] ?? null });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
