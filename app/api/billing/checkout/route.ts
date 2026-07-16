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
    const planId = (body?.planId as string) || "pro";
    const billingCycle = (body?.billingCycle as string) || "monthly";
    const { accessToken, userId } = requireRequestAuth(request);

    const { secretKey, siteUrl, pricePro, pricePremium } = getStripeConfig();
    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 500 },
      );
    }

    // Map plan IDs to Stripe price IDs
    const priceMap: Record<string, string> = {
      pro: pricePro || "",
      team: priceTeam || "",
      premium: pricePremium || "",
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan ID or Stripe not configured" }, { status: 400 });
    }

    const env = getSupabaseEnv();

    const customerRes = await supabaseFetch(
      env,
      `billing_customers?user_id=eq.${userId}&select=stripe_customer_id`,
      { accessToken },
    );

    const customerRows = customerRes.ok ? await customerRes.json() : [];
    let customerId = customerRows?.[0]?.stripe_customer_id as
      string | undefined;

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

    // Special deal for Premium first month
    let subscriptionData: any = {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/settings?section=billing&success=true`,
      cancel_url: `${siteUrl}/settings/pricing`,
    };

    // Add coupon for special offers
    if (planId === "premium" && billingCycle === "monthly") {
      // You could create a Stripe coupon for the $5.99 first month deal
      // subscriptionData.discounts = [{ coupon: "your_coupon_id" }];
    }

    const session = await stripe.checkout.sessions.create(subscriptionData);

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
