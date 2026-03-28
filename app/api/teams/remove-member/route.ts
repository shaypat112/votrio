import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, memberId } = await request.json();

    if (!accessToken || !memberId) {
      return NextResponse.json({ error: "Missing accessToken or memberId." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const res = await supabaseFetch(env, `team_members?id=eq.${memberId}`, {
      method: "DELETE",
      accessToken,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
