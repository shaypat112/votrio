import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const body = await request.json();
  const accessToken = body?.accessToken as string | undefined;
  const providerToken = body?.providerToken as string | undefined;

  if (!accessToken || !providerToken) {
    return NextResponse.json(
      { error: "Missing accessToken or providerToken" },
      { status: 400 }
    );
  }

  const userId = decodeUserId(accessToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid access token" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase env vars are missing" },
      { status: 500 }
    );
  }

  const ghRes = await fetch("https://api.github.com/user/repos?per_page=100", {
    headers: {
      Authorization: `Bearer ${providerToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!ghRes.ok) {
    const text = await ghRes.text();
    return NextResponse.json(
      { error: `GitHub API error: ${text}` },
      { status: ghRes.status }
    );
  }

  const repos = (await ghRes.json()) as Array<{
    id: number;
    full_name: string;
    private: boolean;
  }>;

  const payload = repos.map((repo) => ({
    user_id: userId,
    full_name: repo.full_name,
    private: repo.private,
    last_scanned_at: null,
  }));

  const profileUpsertRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: userId,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!profileUpsertRes.ok) {
    const text = await profileUpsertRes.text();
    return NextResponse.json(
      { error: `Failed to ensure profile: ${text}` },
      { status: 500 }
    );
  }

  const deleteRes = await fetch(
    `${supabaseUrl}/rest/v1/connected_repos?user_id=eq.${userId}`,
    {
      method: "DELETE",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!deleteRes.ok) {
    const text = await deleteRes.text();
    return NextResponse.json(
      { error: `Failed to clear repos: ${text}` },
      { status: 500 }
    );
  }

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/connected_repos`, {
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
    return NextResponse.json(
      { error: `Failed to store repos: ${text}` },
      { status: 500 }
    );
  }

  const stored = await insertRes.json();
  return NextResponse.json({ repos: stored });
}
