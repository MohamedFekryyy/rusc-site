import Stripe from "stripe";

// Stripe, for the cart checkout (server only). It stays off until the
// studio's Stripe account is connected: STRIPE_SECRET_KEY in Vercel's
// environment variables (see AGENTS.md, "Payments").
let client: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    client = key ? new Stripe(key) : null;
  }
  return client;
}
