import { NextResponse } from "next/server";

import {
  extractSelectedTeamId,
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import {
  buildSessionInsertPayload,
  mapJitSession,
} from "@/app/lib/server/jit";

export const runtime = "nodejs";

type ConnectedRepoRow = {
  id: string;
  full_name: string;
};

type RepositoryRow = {
  id: string;
  name: string;
  repo_url: string;
  team_id: string | null;
};

function extractRepoName(repoUrl: string) {
  const trimmed = repoUrl.replace(/\/$/, "");
  const parts = trimmed.split("/");
  return parts.slice(-2).join("/");
}

async function ensureRepositoryForJit(input: {
  accessToken: string;
  userId: string;
  teamId: string | null;
  repoFullName: string;
  repoUrl: string;
}) {
  const env = getSupabaseEnv();
  const normalizedUrl = input.repoUrl.trim();
  const name = extractRepoName(normalizedUrl);
  const encodedUrl = encodeURIComponent(normalizedUrl);
  const existingRes = await supabaseFetch(
    env,
    `repositories?repo_url=eq.${encodedUrl}&select=id,name,repo_url,team_id&limit=1`,
    { accessToken: input.accessToken },
  );

  if (!existingRes.ok) {
    const details = await existingRes.text();
    console.error("jit.ensureRepository.lookup_failed", {
      repoUrl: normalizedUrl,
      repoFullName: input.repoFullName,
      userId: input.userId,
      teamId: input.teamId,
      details,
    });
    throw new Error("Unable to load repository record for this JIT session.");
  }

  const existingRows = (await existingRes.json()) as RepositoryRow[];
  const existing = existingRows[0] ?? null;
  if (existing) {
    if (!existing.team_id && input.teamId) {
      const patchRes = await supabaseFetch(
        env,
        `repositories?id=eq.${existing.id}`,
        {
          method: "PATCH",
          accessToken: input.accessToken,
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            team_id: input.teamId,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      if (patchRes.ok) {
        const patchedRows = (await patchRes.json()) as RepositoryRow[];
        return patchedRows[0] ?? existing;
      }
    }

    return existing;
  }

  const now = new Date().toISOString();
  const insertPayload = {
    owner_id: input.userId,
    team_id: input.teamId,
    repo_url: normalizedUrl,
    name,
    description: null,
    tags: [],
    is_public: false,
    status: "pending",
    created_at: now,
    updated_at: now,
  };

  const insertRes = await supabaseFetch(env, "repositories", {
    method: "POST",
    accessToken: input.accessToken,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(insertPayload),
  });

  if (!insertRes.ok) {
    const details = await insertRes.text();
    console.error("jit.ensureRepository.insert_failed", {
      repoUrl: normalizedUrl,
      repoFullName: input.repoFullName,
      userId: input.userId,
      teamId: input.teamId,
      insertPayload,
      details,
    });
    throw new Error("Unable to create repository record for this JIT session.");
  }

  const insertedRows = (await insertRes.json()) as RepositoryRow[];
  const inserted = insertedRows[0] ?? null;
  if (!inserted?.id) {
    console.error("jit.ensureRepository.insert_missing_id", {
      repoUrl: normalizedUrl,
      repoFullName: input.repoFullName,
      userId: input.userId,
      teamId: input.teamId,
      insertedRows,
    });
    throw new Error("Repository record was created without an id.");
  }

  return inserted;
}

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);

    const env = getSupabaseEnv();
    const teamFilter = selectedTeamId
      ? `team_id=eq.${selectedTeamId}`
      : "team_id=is.null";
    const res = await supabaseFetch(
      env,
      `jit_access_sessions?user_id=eq.${userId}&${teamFilter}&select=id,repo_id,resource_type,access_type,status,duration_minutes,reason,repo_name_snapshot,repo_url_snapshot,environment_name,environment_slug,environment_region,sandbox_runtime,branch_name,started_at,expires_at,last_synced_at&order=created_at.desc`,
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
    const selectedTeamId = extractSelectedTeamId(request);
    const env = getSupabaseEnv();
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

    const repoLookupRes = await supabaseFetch(
      env,
      `connected_repos?id=eq.${repoId}&user_id=eq.${userId}&select=id,full_name&limit=1`,
      { accessToken },
    );

    if (!repoLookupRes.ok) {
      return NextResponse.json({ error: await repoLookupRes.text() }, { status: 500 });
    }

    const repoRows = await repoLookupRes.json();
    const repo = repoRows?.[0] as ConnectedRepoRow | undefined;

    if (!repo) {
      console.warn("jit.create.invalid_connected_repo", {
        connectedRepoId: repoId,
        userId,
        teamId: selectedTeamId,
      });
      return NextResponse.json(
        { error: "Select a valid connected repository for this session." },
        { status: 400 },
      );
    }

    const repoUrl = `https://github.com/${repo.full_name}`;
    const repository = await ensureRepositoryForJit({
      accessToken,
      userId,
      teamId: selectedTeamId,
      repoFullName: repo.full_name,
      repoUrl,
    });

    const payload = buildSessionInsertPayload({
      userId,
      teamId: selectedTeamId,
      repo: repository,
      resourceType,
      accessType,
      durationMinutes,
      reason: typeof reason === "string" ? reason : "",
    });

    const res = await supabaseFetch(env, "jit_access_sessions", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error("jit.create.insert_failed", {
        connectedRepoId: repoId,
        repositoryId: repository.id,
        repoUrl,
        userId,
        teamId: selectedTeamId,
        details,
      });
      return NextResponse.json({ error: details }, { status: 500 });
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
