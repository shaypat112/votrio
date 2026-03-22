// import { stripe } from "@/app/lib/stripe";
// import { NextResponse } from "next/server";
// import Stripe from "stripe";

// export const runtime = "nodejs";

// export async function POST(request: Request) {
//   const body = await request.text();

//   const signature = request.headers.get("stripe-signature");

//   if (!signature) {
//     return NextResponse.json(
//       { error: "Missing Stripe signature" },
//       { status: 400 }
//     );
//   }

//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET!
//     );
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: `Webhook Error: ${err.message}` },
//       { status: 400 }
//     );
//   }

//   try {
//     switch (event.type) {
//       case "checkout.session.completed": {
//         const session = event.data.object as Stripe.Checkout.Session;

//         const customerId = session.customer as string;
//         const subscriptionId = session.subscription as string;

//         console.log("New subscription:", customerId);

//         break;
//       }

//       case "invoice.paid": {
//         const invoice = event.data.object as Stripe.Invoice;

//         console.log("Invoice paid:", invoice.customer);

//         break;
//       }

//       case "customer.subscription.updated": {
//         const subscription = event.data.object as Stripe.Subscription;

//         console.log("Subscription updated:", subscription.id);

//         break;
//       }

//       case "customer.subscription.deleted": {
//         const subscription = event.data.object as Stripe.Subscription;

//         console.log("Subscription canceled:", subscription.id);

//         break;
//       }

//       default:
//         console.log(`Unhandled event type ${event.type}`);
//     }

//     return NextResponse.json({ received: true });

//   } catch (err: any) {
//     return NextResponse.json(
//       { error: "Webhook handler failed." },
//       { status: 500 }
//     );
//   }
// }