import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { logActivity } from "@/app/lib/server/activity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, repoId, isPublic } = await request.json();

    if (!accessToken || !repoId) {
      return NextResponse.json({ error: "Missing accessToken or repoId." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();

    const updateRes = await supabaseFetch(env, `repositories?id=eq.${repoId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        is_public: Boolean(isPublic),
        status: Boolean(isPublic) ? "published" : "private",
        updated_at: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await updateRes.json();
    const repo = rows?.[0];

    if (Boolean(isPublic)) {
      await deliverWebhooks(env, accessToken, {
        userId,
        event: "repository.published",
        payload: {
          repository_id: repo?.id,
          repo_url: repo?.repo_url,
          name: repo?.name,
        },
      });
    }

    await logActivity(env, accessToken, {
      actor_id: userId,
      action: Boolean(isPublic) ? "repository.published" : "repository.unpublished",
      target_type: "repository",
      target_id: repo?.id ?? null,
      meta: { repo_url: repo?.repo_url, is_public: Boolean(isPublic) },
    });

    return NextResponse.json({ repo });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
