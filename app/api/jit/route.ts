import { NextResponse } from "next/server";

import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
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
    const { accessToken, userId } = requireRequestAuth(request);

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
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const {
      repoId,
      resourceType,
      accessType,
      durationMinutes,
      reason,
    } = await request.json();

    if (
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
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
