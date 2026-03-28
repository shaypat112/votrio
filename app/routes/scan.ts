import { runGitHubScan, type ScanOptions, type Finding } from "@/app/services/githubScanner";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
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
}) {
  const env = getSupabaseEnv();
  const accessToken = input.accessToken;
  const userId = accessToken ? decodeUserId(accessToken) : null;

  const result = await runGitHubScan(input.repoUrl, input.options ?? {});
  const { total, severity, avgScore } = summarizeFindings(result.findings);

  let repoId: string | null = null;

  const repoRes = await supabaseFetch(
    env,
    `repositories?repo_url=eq.${encodeURIComponent(result.repoUrl)}&select=id`,
    { accessToken },
  );

  if (repoRes.ok) {
    const rows = await repoRes.json();
    repoId = rows?.[0]?.id ?? null;
  }

  if (!repoId && userId) {
    const insertRepoRes = await supabaseFetch(env, "repositories", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        owner_id: userId,
        repo_url: result.repoUrl,
        name: result.repoName,
        is_public: false,
        status: "private",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (insertRepoRes.ok) {
      const rows = await insertRepoRes.json();
      repoId = rows?.[0]?.id ?? null;
    }
  }

  const scanPayload: Record<string, unknown> = {
    repo: result.repoName,
    created_at: new Date().toISOString(),
    severity,
    issues: total,
    score: avgScore,
    findings: { list: result.findings },
  };

  if (userId) scanPayload.user_id = userId;
  if (repoId) scanPayload.repo_id = repoId;

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
      findings: { list: result.findings },
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
      target_id: repoId,
      meta: { repo_url: result.repoUrl },
    });

    await deliverWebhooks(env, accessToken, {
      userId,
      event: "scan.completed",
      payload: {
        repo_url: result.repoUrl,
        repo_id: repoId,
        total_findings: total,
      },
    });
  }

  return {
    repoUrl: result.repoUrl,
    totalFindings: total,
    findings: result.findings,
    scan: scanRows?.[0] ?? null,
  };
}
