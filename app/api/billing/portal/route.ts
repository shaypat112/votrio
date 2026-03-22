import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {

  const session = await stripe.billingPortal.sessions.create({
    customer: "stripe_customer_id",
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
  });

  return NextResponse.json({
    url: session.url,
  });
}