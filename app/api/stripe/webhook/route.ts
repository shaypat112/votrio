import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/app/lib/stripe";
import { getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const env = getSupabaseEnv();
  const adminHeaders = serviceRoleKey
    ? {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      }
    : null;

  const updateBilling = async (payload: Record<string, unknown>) => {
    if (!adminHeaders) return;
    await fetch(`${env.url}/rest/v1/billing_customers`, {
      method: "POST",
      headers: {
        ...adminHeaders,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const priceId = session?.metadata?.price_id ?? null;

        await updateBilling({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: "active",
          price_id: priceId,
          updated_at: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const status = subscription.status;
        const periodEnd =
          typeof (subscription as Stripe.Subscription & { current_period_end?: number })
            .current_period_end === "number"
            ? new Date(
                (subscription as Stripe.Subscription & { current_period_end?: number })
                  .current_period_end! * 1000,
              ).toISOString()
            : null;

        await updateBilling({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status,
          price_id: priceId,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
