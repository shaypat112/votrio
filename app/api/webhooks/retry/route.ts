import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv } from "@/app/lib/server/supabaseRest";
import { retryDeliveries } from "@/app/lib/server/webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const result = await retryDeliveries(env, accessToken, userId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
