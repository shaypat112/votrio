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
    const { reviewId, reason } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!reviewId || !reason) {
      return NextResponse.json(
        { error: "Missing reviewId or reason." },
        { status: 400 },
      );
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
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
