import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, scope } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const target = scope ?? "all";

    if (target === "all" || target === "scan_history") {
      const res = await supabaseFetch(env, `scan_history?user_id=eq.${userId}`, {
        method: "DELETE",
        accessToken,
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text }, { status: 500 });
      }
    }

    if (target === "all" || target === "notifications") {
      const res = await supabaseFetch(env, `notifications?user_id=eq.${userId}`, {
        method: "DELETE",
        accessToken,
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
