import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { scope } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

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
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
