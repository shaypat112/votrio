import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, reviewId, reason } = await request.json();

    if (!accessToken || !reviewId || !reason) {
      return NextResponse.json(
        { error: "Missing accessToken, reviewId, or reason." },
        { status: 400 },
      );
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();

    const res = await supabaseFetch(env, "review_flags", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        review_id: reviewId,
        reporter_id: userId,
        reason,
        created_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await res.json();
    return NextResponse.json({ flag: rows?.[0] });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
