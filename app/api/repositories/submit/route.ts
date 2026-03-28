import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { logActivity } from "@/app/lib/server/activity";

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
    const { accessToken, repoUrl, description, tags } = await request.json();

    if (!accessToken || !repoUrl) {
      return NextResponse.json({ error: "Missing accessToken or repoUrl." }, { status: 400 });
    }

    if (!validateRepoUrl(repoUrl)) {
      return NextResponse.json({ error: "Invalid GitHub repository URL." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const normalizedUrl = repoUrl.trim();
    const name = extractRepoName(normalizedUrl);

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

    await logActivity(env, accessToken, {
      actor_id: userId,
      action: "repository.submitted",
      target_type: "repository",
      target_id: repo?.id ?? null,
      meta: { repo_url: normalizedUrl },
    });

    return NextResponse.json({ repo });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
