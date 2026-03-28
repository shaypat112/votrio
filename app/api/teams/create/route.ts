import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, name } = await request.json();

    if (!accessToken || !name) {
      return NextResponse.json({ error: "Missing accessToken or name." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const slug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const res = await supabaseFetch(env, "teams", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        slug,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await res.json();
    const team = rows?.[0];

    if (team?.id) {
      await supabaseFetch(env, "team_members", {
        method: "POST",
        accessToken,
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          team_id: team.id,
          user_id: userId,
          role: "owner",
          created_at: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json({ team });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
