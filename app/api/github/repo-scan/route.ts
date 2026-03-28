import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_EXT = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".cs", ".php"];

function decodeUserId(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf-8"
      )
    );
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text);
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

export async function POST(request: Request) {
  const body = await request.json();
  const accessToken = body?.accessToken as string | undefined;
  const providerToken = (body?.providerToken as string | null | undefined) ?? undefined;
  const repoFullName = body?.repo as string | undefined;

  if (!accessToken || !repoFullName) {
    return NextResponse.json(
      { error: "Missing accessToken or repo" },
      { status: 400 }
    );
  }

  const userId = decodeUserId(accessToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid access token" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env vars are missing" }, { status: 500 });
  }
  if (!mistralKey) {
    return NextResponse.json({ error: "MISTRAL_API_KEY is missing" }, { status: 500 });
  }

  try {
    const repo = await fetchJson(`https://api.github.com/repos/${repoFullName}`, providerToken);
    const branch = repo.default_branch;

    const tree = await fetchJson(
      `https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`,
      providerToken
    );

    const candidates = (tree.tree ?? [])
      .filter((item: any) => item.type === "blob" && ALLOWED_EXT.some((ext) => item.path.endsWith(ext)))
      .slice(0, 6);

    const files: Array<{ path: string; content: string }> = [];

    for (const item of candidates) {
      const file = await fetchJson(
        `https://api.github.com/repos/${repoFullName}/contents/${item.path}`,
        providerToken
      );
      if (file?.content) {
        const decoded = Buffer.from(file.content, "base64").toString("utf-8");
        files.push({ path: item.path, content: decoded.slice(0, 2000) });
      }
    }

    const prompt = `Analyze the following repository snippets for security risks and refactoring suggestions. Return JSON: {summary, severity, score, issues}.\n\n${files
      .map((f) => `FILE: ${f.path}\n${f.content}`)
      .join("\n\n")}`;

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
          { role: "system", content: "Return JSON only." },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
      }),
    });

    if (!mistralRes.ok) {
      const text = await mistralRes.text();
      return NextResponse.json({ error: `Mistral API error: ${text}` }, { status: 500 });
    }

    const mistralJson = await mistralRes.json();
    const content = mistralJson?.choices?.[0]?.message?.content as string | undefined;
    let summary = "AI scan completed.";
    let severity = "medium";
    let score = 60;
    let issues = 1;

    try {
      if (content) {
        const parsed = JSON.parse(content);
        summary = parsed.summary ?? summary;
        severity = parsed.severity ?? severity;
        score = parsed.score ?? score;
        if (Array.isArray(parsed.issues)) {
          issues = parsed.issues.length;
        } else {
          issues = parsed.issues ?? issues;
        }
      }
    } catch {
      if (content) {
        summary = content.slice(0, 600);
      }
    }

    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      repo: repoFullName,
      severity,
      issues,
      score,
      findings: {
        ai_summary: summary,
        files: files.map((f) => ({ path: f.path })),
      },
      created_at: now,
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/scan_history`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const inserted = await insertRes.json();

    const updateRepoRes = await fetch(
      `${supabaseUrl}/rest/v1/connected_repos?user_id=eq.${userId}&full_name=eq.${encodeURIComponent(
        repoFullName
      )}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ last_scanned_at: now }),
      }
    );

    if (!updateRepoRes.ok) {
      const text = await updateRepoRes.text();
      return NextResponse.json({ error: `Failed to update repo: ${text}` }, { status: 500 });
    }

    return NextResponse.json({
      summary,
      severity,
      score,
      issues,
      scan: inserted?.[0] ?? null,
    });
  } catch (err: any) {
    const status = Number(err?.status ?? 0);
    const message = String(err?.message ?? "Scan failed.");
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
