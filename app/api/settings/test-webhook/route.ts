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

function isValidWebhookUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, webhookUrl } = await request.json();

    if (!accessToken || !webhookUrl) {
      return NextResponse.json(
        { error: "Missing accessToken or webhookUrl." },
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

    if (!isValidWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { error: "Invalid webhook URL." },
        { status: 400 }
      );
    }

    const payload = {
      event: "scan.test",
      user_id: userId,
      status: "ok",
      message: "Votrio webhook test delivery",
      created_at: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "votrio-webhooks",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Webhook request failed", details: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}