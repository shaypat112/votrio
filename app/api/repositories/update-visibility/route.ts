import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { logActivity } from "@/app/lib/server/activity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { repoId, isPublic } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId." }, { status: 400 });
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
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
