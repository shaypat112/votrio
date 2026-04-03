import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { logActivity } from "@/app/lib/server/activity";
import { isTeamOwner } from "@/app/lib/server/teams";

export const runtime = "nodejs";

function validateRepoUrl(url: string) {
  const pattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;
  return pattern.test(url.trim());
}

function extractRepoName(url: string) {
  const trimmed = url.replace(/\/$/, "");
  const parts = trimmed.split("/");
  return parts.slice(-2).join("/");
}

export async function POST(request: Request) {
  try {
    const { repoUrl, description, tags, teamId, environmentId } =
      await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl." }, { status: 400 });
    }

    if (!validateRepoUrl(repoUrl)) {
      return NextResponse.json({ error: "Invalid GitHub repository URL." }, { status: 400 });
    }

    const env = getSupabaseEnv();
    const normalizedUrl = repoUrl.trim();
    const name = extractRepoName(normalizedUrl);
    const normalizedTeamId =
      typeof teamId === "string" && teamId.trim() ? teamId.trim() : null;
    const normalizedEnvironmentId =
      typeof environmentId === "string" && environmentId.trim()
        ? environmentId.trim()
        : null;

    if (normalizedTeamId) {
      const canManageTeam = await isTeamOwner(accessToken, userId, normalizedTeamId);
      if (!canManageTeam) {
        return NextResponse.json(
          { error: "Only team owners can submit repositories for a team." },
          { status: 403 },
        );
      }
    }

    if (normalizedTeamId && normalizedEnvironmentId) {
      const environmentRes = await supabaseFetch(
        env,
        `team_environments?id=eq.${normalizedEnvironmentId}&team_id=eq.${normalizedTeamId}&select=id`,
        { accessToken },
      );

      if (!environmentRes.ok) {
        return NextResponse.json({ error: await environmentRes.text() }, { status: 500 });
      }

      const environments = await environmentRes.json();
      if (!environments?.[0]?.id) {
        return NextResponse.json(
          { error: "Environment does not belong to the selected team." },
          { status: 400 },
        );
      }
    }

    const existingRes = await supabaseFetch(
      env,
      `repositories?repo_url=eq.${encodeURIComponent(normalizedUrl)}&select=*`,
      { accessToken },
    );

    if (!existingRes.ok) {
      const text = await existingRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const existing = await existingRes.json();
    let repo;

    if (existing?.length) {
      const repoId = existing[0].id;
      const updateRes = await supabaseFetch(env, `repositories?id=eq.${repoId}`, {
        method: "PATCH",
        accessToken,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          owner_id: existing[0].owner_id ?? userId,
          team_id: normalizedTeamId ?? existing[0].team_id ?? null,
          description: description ?? existing[0].description,
          tags: Array.isArray(tags) ? tags : existing[0].tags ?? [],
          updated_at: new Date().toISOString(),
        }),
      });

      if (!updateRes.ok) {
        const text = await updateRes.text();
        return NextResponse.json({ error: text }, { status: 500 });
      }

      const rows = await updateRes.json();
      repo = rows?.[0];
    } else {
      const insertRes = await supabaseFetch(env, "repositories", {
        method: "POST",
        accessToken,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          owner_id: userId,
          team_id: normalizedTeamId,
          repo_url: normalizedUrl,
          name,
          description: description ?? null,
          tags: Array.isArray(tags) ? tags : [],
          is_public: false,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });

      if (!insertRes.ok) {
        const text = await insertRes.text();
        return NextResponse.json({ error: text }, { status: 500 });
      }

      const rows = await insertRes.json();
      repo = rows?.[0];
    }

    if (repo?.id && normalizedTeamId && normalizedEnvironmentId) {
      await supabaseFetch(
        env,
        `team_environments?id=eq.${normalizedEnvironmentId}&team_id=eq.${normalizedTeamId}`,
        {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            repo_id: repo.id,
            updated_at: new Date().toISOString(),
          }),
        },
      );
    }

    await logActivity(env, accessToken, {
      actor_id: userId,
      action: "repository.submitted",
      target_type: "repository",
      target_id: repo?.id ?? null,
      meta: {
        repo_url: normalizedUrl,
        team_id: normalizedTeamId,
        environment_id: normalizedEnvironmentId,
      },
    });

    return NextResponse.json({ repo });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
