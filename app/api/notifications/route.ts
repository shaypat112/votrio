import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, parsePagination, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken") ?? undefined;

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const { page, pageSize, offset } = parsePagination(searchParams, { page: 1, pageSize: 10 });
    const env = getSupabaseEnv();

    const res = await supabaseFetch(
      env,
      `notifications?user_id=eq.${userId}&select=id,type,data,read_at,created_at&order=created_at.desc&limit=${pageSize}&offset=${offset}`,
      { accessToken },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const notifications = await res.json();
    return NextResponse.json({ notifications, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, notificationIds, markAll } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const now = new Date().toISOString();

    if (markAll) {
      const res = await supabaseFetch(env, `notifications?user_id=eq.${userId}`, {
        method: "PATCH",
        accessToken,
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ read_at: now }),
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: "Missing notificationIds." }, { status: 400 });
    }

    const filter = notificationIds.map((id: string) => `id.eq.${id}`).join(",");
    const res = await supabaseFetch(env, `notifications?or=(${filter})`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: now }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
