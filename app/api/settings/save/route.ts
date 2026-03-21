import { NextResponse } from "next/server";

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
  const settings = body?.settings as Record<string, unknown> | undefined;

  if (!accessToken || !settings) {
    return NextResponse.json({ error: "Missing accessToken or settings." }, { status: 400 });
  }

  const userId = decodeUserId(accessToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid access token." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env vars are missing." }, { status: 500 });
  }

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
      full_name: settings.fullName ?? null,
      username: settings.username ?? null,
      avatar_url: settings.avatarUrl ?? null,
    }),
  });

  if (!profileUpsertRes.ok) {
    const text = await profileUpsertRes.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const payload = {
    user_id: userId,
    data: settings,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/user_settings`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const saved = await res.json();
  return NextResponse.json({ settings: saved?.[0]?.data ?? settings });
}
