import { getStripe } from "@/lib/stripe";

// Stripe calls this when an order is paid (endpoint to register in the Stripe
// dashboard, event checkout.session.completed; its signing secret goes in
// STRIPE_WEBHOOK_SECRET).
//
// For now the studio fulfils paid orders by hand from the Stripe dashboard:
// it sends gift-voucher and card codes, and confirms dated bookings in Cal.
// The order summary is in the session metadata (items_1, items_2, …:
// "<offer key>x<qty>[@<Cal booking uid>]"). Automatic fulfilment goes here.
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return Response.json({ error: "webhook_unavailable" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "missing_signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "bad_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // No personal data in the logs: the session id finds the order in Stripe.
    console.log("rūsc order paid", session.id, JSON.stringify(session.metadata ?? {}));
  }
  return Response.json({ received: true });
}
