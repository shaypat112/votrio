import { NextResponse } from "next/server";
import { stripe, getStripeConfig } from "@/app/lib/stripe";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const priceId = (body?.priceId as string | undefined) ?? getStripeConfig().pricePro;
    const { accessToken, userId } = requireRequestAuth(request);

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
    let customerId = customerRows?.[0]?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { user_id: userId },
      });
      customerId = customer.id;

      await supabaseFetch(env, "billing_customers", {
        method: "POST",
        accessToken,
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/profile?tab=billing&success=true`,
      cancel_url: `${siteUrl}/profile?tab=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: getErrorMessage(error, "Checkout failed.") },
      { status: 500 },
    );
  }
}
