import { NextResponse } from "next/server";
import {
  RequestAuthError,
  extractSelectedTeamId,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: {
    ai_summary?: string;
    team_id?: string | null;
  } | null;
};

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);
    const env = getSupabaseEnv();

    const res = await supabaseFetch(
      env,
      `scan_history?user_id=eq.${userId}&select=repo,created_at,severity,issues,score,findings&order=created_at.desc&limit=50`,
      { accessToken },
    );

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    const rows = (await res.json()) as ScanRow[];
    const scans = rows.filter((row) => {
      const teamId = row.findings?.team_id ?? null;
      return selectedTeamId ? teamId === selectedTeamId : teamId === null;
    });

    return NextResponse.json({ scans });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
