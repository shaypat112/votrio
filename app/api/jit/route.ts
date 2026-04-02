import { NextResponse } from "next/server";

import {
  decodeUserId,
  getSupabaseEnv,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import {
  buildSessionInsertPayload,
  fetchAccessibleRepository,
  fetchEnvironmentForRepository,
  mapJitSession,
} from "@/app/lib/server/jit";

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
    const res = await supabaseFetch(
      env,
      `jit_access_sessions?user_id=eq.${userId}&select=id,repo_id,resource_type,access_type,status,duration_minutes,reason,repo_name_snapshot,repo_url_snapshot,environment_name,environment_slug,environment_region,sandbox_runtime,branch_name,started_at,expires_at,last_synced_at&order=created_at.desc`,
      { accessToken },
    );

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    const rows = await res.json();
    return NextResponse.json({
      sessions: rows.map(mapJitSession),
    });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const {
      accessToken,
      repoId,
      resourceType,
      accessType,
      durationMinutes,
      reason,
    } = await request.json();

    if (
      !accessToken ||
      !repoId ||
      !resourceType ||
      !accessType ||
      !durationMinutes
    ) {
      return NextResponse.json(
        { error: "Missing required JIT session fields." },
        { status: 400 },
      );
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const repo = await fetchAccessibleRepository(accessToken, String(repoId));
    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found or not accessible." },
        { status: 404 },
      );
    }

    const environment = await fetchEnvironmentForRepository(accessToken, repo);
    const payload = buildSessionInsertPayload({
      userId,
      repo,
      environment,
      resourceType,
      accessType,
      durationMinutes,
      reason: typeof reason === "string" ? reason : "",
    });

    const env = getSupabaseEnv();
    const res = await supabaseFetch(env, "jit_access_sessions", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    const rows = await res.json();
    return NextResponse.json({ session: mapJitSession(rows?.[0]) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
