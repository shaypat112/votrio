import { NextResponse } from "next/server";

import {
  extractSelectedTeamId,
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { mapJitSession } from "@/app/lib/server/jit";

type JitAction = "start" | "extend" | "revoke";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ session: string }> },
) {
  try {
    const { session } = await params;
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);

    const env = getSupabaseEnv();
    const teamFilter = selectedTeamId
      ? `team_id=eq.${selectedTeamId}`
      : "team_id=is.null";
    const res = await supabaseFetch(
      env,
      `jit_access_sessions?id=eq.${session}&user_id=eq.${userId}&${teamFilter}&select=id,repo_id,resource_type,access_type,status,duration_minutes,reason,repo_name_snapshot,repo_url_snapshot,environment_name,environment_slug,environment_region,sandbox_runtime,branch_name,started_at,expires_at,last_synced_at&limit=1`,
      { accessToken },
    );

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    const rows = await res.json();
    if (!rows?.length) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ session: mapJitSession(rows[0]) });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ session: string }> },
) {
  try {
    const { session } = await params;
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);
    const { action, minutes } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: "Missing action." },
        { status: 400 },
      );
    }

    const env = getSupabaseEnv();
    const teamFilter = selectedTeamId
      ? `team_id=eq.${selectedTeamId}`
      : "team_id=is.null";
    const existingRes = await supabaseFetch(
      env,
      `jit_access_sessions?id=eq.${session}&user_id=eq.${userId}&${teamFilter}&select=id,expires_at,status,duration_minutes&limit=1`,
      { accessToken },
    );

    if (!existingRes.ok) {
      return NextResponse.json({ error: await existingRes.text() }, { status: 500 });
    }

    const existingRows = await existingRes.json();
    const current = existingRows?.[0];
    if (!current) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const now = new Date();
    let payload: Record<string, unknown>;

    if ((action as JitAction) === "start") {
      payload = {
        status: "active",
        expires_at: new Date(
          now.getTime() + Number(current.duration_minutes ?? 15) * 60000,
        ).toISOString(),
        started_at: now.toISOString(),
        last_synced_at: now.toISOString(),
        updated_at: now.toISOString(),
        revoked_at: null,
      };
    } else if ((action as JitAction) === "extend") {
      const nextMinutes = Math.max(15, Number(minutes ?? 30));
      payload = {
        status: "active",
        expires_at: new Date(now.getTime() + nextMinutes * 60000).toISOString(),
        last_synced_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
    } else if ((action as JitAction) === "revoke") {
      const deleteRes = await supabaseFetch(
        env,
        `jit_access_sessions?id=eq.${session}&user_id=eq.${userId}&${teamFilter}`,
        {
          method: "DELETE",
          accessToken,
        },
      );

      if (!deleteRes.ok) {
        return NextResponse.json({ error: await deleteRes.text() }, { status: 500 });
      }

      return NextResponse.json({ deleted: true, sessionId: session });
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const updateRes = await supabaseFetch(
      env,
      `jit_access_sessions?id=eq.${session}&user_id=eq.${userId}&${teamFilter}`,
      {
        method: "PATCH",
        accessToken,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      },
    );

    if (!updateRes.ok) {
      return NextResponse.json({ error: await updateRes.text() }, { status: 500 });
    }

    const rows = await updateRes.json();
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
