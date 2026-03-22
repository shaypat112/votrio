import { NextResponse } from "next/server";

function decodeUserId(token: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf-8")
    );
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing accessToken." },
        { status: 400 }
      );
    }

    const userId = decodeUserId(accessToken);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid access token." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase environment variables missing." },
        { status: 500 }
      );
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}&select=*`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Database request failed", details: text },
        { status: 500 }
      );
    }

    const rows = await res.json();

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        settings: {},
      });
    }

    const row = rows[0];

    const settings = {
      emailNotifications: row.email_alerts ?? true,
      scanDepth: row.scan_depth ?? 3,
      ignoredPaths: row.ignored_paths ?? "",
    };

    return NextResponse.json({ settings });

  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}