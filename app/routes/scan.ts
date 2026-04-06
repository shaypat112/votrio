import { runGitHubScan, type ScanOptions, type Finding } from "@/app/services/githubScanner";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { createNotification } from "@/app/lib/server/notifications";
import { purgeUserData } from "@/app/lib/server/retention";
import { logActivity } from "@/app/lib/server/activity";

function summarizeFindings(findings: Finding[]) {
  const total = findings.length;
  const maxScore = findings.reduce((max, item) => Math.max(max, item.score), 0);
  const severity = findings.find((item) => item.score === maxScore)?.severity ?? "low";
  const avgScore = total > 0
    ? Math.round(findings.reduce((sum, item) => sum + item.score, 0) / total)
    : 0;
  return { total, severity, avgScore };
}

export async function handleGitHubScan(input: {
  repoUrl: string;
  options?: ScanOptions;
  accessToken?: string;
  teamId?: string | null;
}) {
  const env = getSupabaseEnv();
  const accessToken: any = input.accessToken;
  const userId = accessToken ? decodeUserId(accessToken) : null;

  const result = await runGitHubScan(input.repoUrl, input.options ?? {});
  const { total, severity, avgScore } = summarizeFindings(result.findings);

  const scanPayload: Record<string, unknown> = {
    repo: result.repoName,
    created_at: new Date().toISOString(),
    severity,
    issues: total,
    score: avgScore,
    findings: { list: result.findings, team_id: input.teamId ?? null },
  };

  if (userId && accessToken) scanPayload.user_id = userId;

  let scanInsertRes = await supabaseFetch(env, "scan_history", {
    method: "POST",
    accessToken,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(scanPayload),
  });

  if (!scanInsertRes.ok) {
    const fallbackPayload = {
      repo: result.repoName,
      created_at: new Date().toISOString(),
      severity,
      issues: total,
      score: avgScore,
      findings: { list: result.findings, team_id: input.teamId ?? null },
    };
    scanInsertRes = await supabaseFetch(env, "scan_history", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(fallbackPayload),
    });
  }

  const scanRows = scanInsertRes.ok ? await scanInsertRes.json() : [];

  if (userId) {
    await logActivity(env, accessToken, {
      actor_id: userId,
      action: "scan.completed",
      target_type: "repository",
      target_id: null,
      meta: { repo_url: result.repoUrl },
    });

    await deliverWebhooks(env, accessToken, {
      userId,
      event: "scan.completed",
      payload: {
        repo_url: result.repoUrl,
        total_findings: total,
      },
    });

    await createNotification({
      env,
      accessToken,
      userId,
      type: "scan.completed",
      data: {
        repo_name: result.repoName,
        repo_url: result.repoUrl,
        severity,
        issues: total,
        score: avgScore,
      },
    });

    await purgeUserData({
      env,
      accessToken,
      userId,
      days: 30,
    });
  }

  return {
    repoUrl: result.repoUrl,
    totalFindings: total,
    findings: result.findings,
    scan: scanRows?.[0] ?? null,
  };
}
