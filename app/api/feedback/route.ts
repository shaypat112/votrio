import { NextResponse } from "next/server";

import {
  getSupabaseEnv,
  RequestAuthError,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { logServerError, logServerInfo } from "@/app/lib/server/logger";

export const runtime = "nodejs";

const CATEGORIES = new Set(["scanning", "bug", "feature", "other"]);

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const details = typeof body?.details === "string" ? body.details.trim() : "";
    const category = typeof body?.category === "string" ? body.category : "other";

    if (message.length < 10 || message.length > 2000) {
      return NextResponse.json(
        { error: "Feedback must be between 10 and 2,000 characters." },
        { status: 400 },
      );
    }
    if (details.length > 4000) {
      return NextResponse.json({ error: "Additional details must be 4,000 characters or fewer." }, { status: 400 });
    }
    if (!CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Select a valid feedback category." }, { status: 400 });
    }

    const response = await supabaseFetch(getSupabaseEnv(), "site_feedback", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        category,
        message,
        details: details || null,
      }),
    });
    if (!response.ok) throw new Error(`Supabase feedback insert failed (${response.status}).`);

    logServerInfo("feedback.submitted", { category });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logServerError("feedback.submit_failed", error);
    return NextResponse.json({ error: "Unable to submit feedback right now." }, { status: 500 });
  }
}
