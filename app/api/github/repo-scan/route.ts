import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { logActivity } from "@/app/lib/server/activity";
import { createNotification } from "@/app/lib/server/notifications";
import { purgeUserData } from "@/app/lib/server/retention";
import { runGitHubScanWithToken } from "@/app/services/githubScanner";

export const runtime = "nodejs";

type ErrorWithStatus = Error & { status?: number };
type MistralResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function POST(request: Request) {
  const body = await request.json();
  const providerToken = (body?.providerToken as string | null | undefined) ?? undefined;
  const repoFullName = body?.repo as string | undefined;
  const { accessToken, userId } = requireRequestAuth(request);

  if (!repoFullName) {
    return NextResponse.json(
      { error: "Missing repo" },
      { status: 400 }
    );
  }

  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!mistralKey) {
    return NextResponse.json({ error: "MISTRAL_API_KEY is missing" }, { status: 500 });
  }

  try {
    const supabaseEnv = getSupabaseEnv();
    const scanResult = await runGitHubScanWithToken(
      `https://github.com/${repoFullName}`,
      { ai: false },
      providerToken,
    );
    const findings = scanResult.findings;
    const highestSeverity =
      findings.find((item) => item.severity === "critical")?.severity ??
      findings.find((item) => item.severity === "high")?.severity ??
      findings.find((item) => item.severity === "medium")?.severity ??
      findings.find((item) => item.severity === "low")?.severity ??
      "low";
    const score =
      findings.length > 0
        ? Math.round(
            findings.reduce((sum, item) => sum + item.score, 0) / findings.length,
          )
        : 0;

    const prompt = `You are summarizing real repository scan findings. Do not invent additional findings. Explain the highest-risk issues first and give direct fixes.\n\n${JSON.stringify(
      findings.slice(0, 50),
      null,
      2,
    )}`;

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Summarize only the provided findings in plain text. Do not invent vulnerabilities or files.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
      }),
    });

    if (!mistralRes.ok) {
      const text = await mistralRes.text();
      return NextResponse.json({ error: `Mistral API error: ${text}` }, { status: 500 });
    }

    const mistralJson = (await mistralRes.json()) as MistralResponse;
    const content = mistralJson?.choices?.[0]?.message?.content as string | undefined;
    let summary = "AI scan completed.";
    const severity = highestSeverity;
    const issues = findings.length;

    if (content) {
      summary = content.slice(0, 1200);
    }

    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      repo_id: null,
      repo: repoFullName,
      severity,
      issues,
      score,
      findings: {
        ai_summary: summary,
        list: findings,
      },
      created_at: now,
    };

    const insertRes = await supabaseFetch(supabaseEnv, "scan_history", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const inserted = await insertRes.json();

    const updateRepoRes = await supabaseFetch(
      supabaseEnv,
      `connected_repos?user_id=eq.${userId}&full_name=eq.${encodeURIComponent(repoFullName)}`,
      {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ last_scanned_at: now }),
      }
    );

    if (!updateRepoRes.ok) {
      const text = await updateRepoRes.text();
      return NextResponse.json({ error: `Failed to update repo: ${text}` }, { status: 500 });
    }

    await logActivity(supabaseEnv, accessToken, {
      actor_id: userId,
      action: "scan.completed",
      target_type: "repository",
      target_id: null,
      meta: { repo_url: repoFullName },
    });

    await deliverWebhooks(supabaseEnv, accessToken, {
      userId,
      event: "scan.completed",
      payload: {
        repo_url: repoFullName,
        total_findings: issues,
      },
    });

    await createNotification({
      env: supabaseEnv,
      accessToken,
      userId,
      type: "scan.completed",
      data: {
        repo_name: repoFullName,
        repo_url: repoFullName,
        severity,
        issues,
        score,
      },
    });

    await purgeUserData({
      env: supabaseEnv,
      accessToken,
      userId,
      days: 30,
    });

    return NextResponse.json({
      summary,
      severity,
      score,
      issues,
      scan: inserted?.[0] ?? null,
      findings,
    });
  } catch (err: unknown) {
    if (err instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const error = err as ErrorWithStatus;
    const status = Number(error?.status ?? 0);
    const message = String(error?.message ?? "Scan failed.");
    if (status === 409 && message.includes("Repository is empty")) {
      return NextResponse.json(
        { error: "GitHub repository is empty. Add at least one commit to scan." },
        { status: 409 }
      );
    }
    if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("requires authentication")) {
      return NextResponse.json(
        { error: "GitHub authorization required for private repositories." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
