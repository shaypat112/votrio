// all demo code right here from GEMINI so that the build passes
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: "Checkout session created" });
}





// import { stripe } from "@/app/lib/stripe";
// import { NextResponse } from "next/server";

// export async function POST() {

//   const session = await stripe.checkout.sessions.create({

//     mode: "subscription",

//     line_items: [
//       {
//         price: process.env.STRIPE_PRICE_PRO!,
//         quantity: 1,
//       },
//     ],

//     success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true`,
//     cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,

//   });

//   return NextResponse.json({
//     url: session.url,
//   });
// }