import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  isValidHttpsUrl,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { webhookUrl } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Missing webhookUrl." },
        { status: 400 },
      );
    }

    if (!isValidHttpsUrl(webhookUrl)) {
      return NextResponse.json({ error: "Invalid webhook URL." }, { status: 400 });
    }

    const payload = {
      event: "webhook.test",
      user_id: userId,
      status: "ok",
      message: "Votrio webhook test delivery",
      created_at: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "votrio-webhooks",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Webhook request failed", details: text }, { status: 500 });
    }

    const env = getSupabaseEnv();
    await supabaseFetch(env, "activity_log", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: userId,
        action: "webhook.test",
        target_type: "webhook",
        meta: { url: webhookUrl },
        created_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
