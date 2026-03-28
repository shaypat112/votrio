import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY ?? "";

export const stripe = new Stripe(secretKey || "sk_test_placeholder", {
  apiVersion: "2026-02-25.clover",
});

export function getStripeConfig() {
  return {
    secretKey,
    pricePro: process.env.STRIPE_PRICE_PRO ?? "price_test_pro",
    priceTeam: process.env.STRIPE_PRICE_TEAM ?? "price_test_team",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  };
}
