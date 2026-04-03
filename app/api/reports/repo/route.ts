import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { accessToken, userId } = requireRequestAuth(request);
    const repo = searchParams.get("repo");

    if (!repo) {
      return NextResponse.json({ error: "Missing repo." }, { status: 400 });
    }

    const env = getSupabaseEnv();

    const res = await supabaseFetch(
      env,
      `scan_history?user_id=eq.${userId}&repo=eq.${encodeURIComponent(repo)}&select=repo,created_at,severity,issues,score,findings&order=created_at.desc&limit=20`,
      { accessToken },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const scans = await res.json();
    return NextResponse.json({ scans });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
