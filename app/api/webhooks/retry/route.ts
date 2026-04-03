import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";
import { retryDeliveries } from "@/app/lib/server/webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);

    const env = getSupabaseEnv();
    const result = await retryDeliveries(env, accessToken, userId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
