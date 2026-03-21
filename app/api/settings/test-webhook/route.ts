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
  const webhookUrl = body?.webhookUrl as string | undefined;

  if (!accessToken || !webhookUrl) {
    return NextResponse.json({ error: "Missing accessToken or webhookUrl." }, { status: 400 });
  }

  const userId = decodeUserId(accessToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid access token." }, { status: 400 });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "scan.test",
        user_id: userId,
        status: "ok",
        message: "Votrio webhook test delivery.",
        created_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
