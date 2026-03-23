// gemini  code right here
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: "Checkout session created" });
}





// import { stripe } from "./lib/stripe";
// import { NextResponse } from "next/server";

// export async function POST() {

//   const session = await stripe.billingPortal.sessions.create({
//     customer: "stripe_customer_id",
//     return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
//   });
// // 
//   return NextResponse.json({
//     url: session.url,
//   });
// }

// // set up your STRIPE API KEy for building here and fix the red erors in this code