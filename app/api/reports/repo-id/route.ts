import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken") ?? undefined;
    const repoId = searchParams.get("repoId");

    if (!accessToken || !repoId) {
      return NextResponse.json({ error: "Missing accessToken or repoId." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();

    const res = await supabaseFetch(
      env,
      `scan_history?user_id=eq.${userId}&repo_id=eq.${repoId}&select=repo,created_at,severity,issues,score,findings&order=created_at.desc&limit=50`,
      { accessToken },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const scans = await res.json();
    return NextResponse.json({ scans });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
