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
    const repoIdsParam = searchParams.get("repoIds") ?? "";

    if (!repoIdsParam) {
      return NextResponse.json({ error: "Missing repoIds." }, { status: 400 });
    }

    const repoIds = repoIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (repoIds.length === 0) {
      return NextResponse.json({ scans: [] });
    }

    const env = getSupabaseEnv();
    const inList = repoIds.map((id) => `"${id}"`).join(",");

    const res = await supabaseFetch(
      env,
      `scan_history?user_id=eq.${userId}&repo_id=in.(${inList})&select=repo_id,repo,created_at,severity,issues,score&order=created_at.desc&limit=200`,
      { accessToken },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = (await res.json()) as Array<{
      repo_id: string;
      repo: string;
      created_at: string;
      severity: string;
      issues: number;
      score: number;
    }>;

    const latestByRepo = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const existing = latestByRepo.get(row.repo_id);
      if (!existing) {
        latestByRepo.set(row.repo_id, row);
        continue;
      }
      if (new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
        latestByRepo.set(row.repo_id, row);
      }
    }

    return NextResponse.json({ scans: Array.from(latestByRepo.values()) });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
