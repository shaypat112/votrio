import { NextResponse } from "next/server";
import { stripe, getStripeConfig } from "@/app/lib/stripe";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = body?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const { secretKey, siteUrl } = getStripeConfig();
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
    }

    const env = getSupabaseEnv();
    const customerRes = await supabaseFetch(
      env,
      `billing_customers?user_id=eq.${userId}&select=stripe_customer_id`,
      { accessToken },
    );
    const customerRows = customerRes.ok ? await customerRes.json() : [];
    const customerId = customerRows?.[0]?.stripe_customer_id as string | undefined;

    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer found." }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/profile?tab=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Portal failed." }, { status: 500 });
  }
}
