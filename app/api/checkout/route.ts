import type Stripe from "stripe";
import { offerByKey } from "@/lib/cal";
import { formatSlot } from "@/lib/format";
import type { Lang } from "@/lib/routes";
import { getStripe } from "@/lib/stripe";

// Cart checkout: turns the cart into a Stripe Checkout Session shown
// embedded in the cart page (nothing leaves the site). Every price comes
// from OFFERS; the browser only says which offers and how many.

type IncomingItem = { key?: unknown; qty?: unknown; booking?: { uid?: unknown; start?: unknown } };

const MAX_LINES = 20;

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

// Stripe metadata values are capped at 500 characters: split the order summary.
function chunks(text: string, size = 490) {
  const out: Record<string, string> = {};
  for (let i = 0; i * size < text.length && i < 10; i++) out[`items_${i + 1}`] = text.slice(i * size, (i + 1) * size);
  return out;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return bad("checkout_unavailable", 503);

  let body: { lang?: unknown; items?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad("bad_request");
  }
  const lang: Lang = body.lang === "en" ? "en" : "fr";
  const incoming = Array.isArray(body.items) ? (body.items as IncomingItem[]).slice(0, MAX_LINES) : [];
  if (!incoming.length) return bad("empty_cart");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const summary: string[] = [];
  for (const item of incoming) {
    const offer = typeof item?.key === "string" ? offerByKey(item.key) : undefined;
    if (!offer) return bad("unknown_item");

    let name: string = offer[lang].title;
    let qty = 1;
    let bookingUid = "";
    if (offer.kind === "session") {
      const uid = item.booking?.uid;
      const start = item.booking?.start;
      if (typeof uid !== "string" || typeof start !== "string" || Number.isNaN(Date.parse(start))) {
        return bad("session_without_booking");
      }
      name += ` — ${formatSlot(start, lang)}`;
      bookingUid = uid.slice(0, 64);
    } else {
      qty = Math.max(1, Math.min(20, Math.floor(Number(item.qty)) || 1));
    }

    lineItems.push({
      quantity: qty,
      price_data: { currency: "eur", unit_amount: offer.price, product_data: { name } },
    });
    summary.push(`${offer.key}x${qty}${bookingUid ? `@${bookingUid}` : ""}`);
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    redirect_on_completion: "never",
    mode: "payment",
    locale: lang,
    line_items: lineItems,
    metadata: { lang, ...chunks(summary.join(" ")) },
  });

  return Response.json({ clientSecret: session.client_secret, id: session.id });
}

// Status of a finished checkout, for the confirmation shown in the cart page.
export async function GET(request: Request) {
  const stripe = getStripe();
  if (!stripe) return bad("checkout_unavailable", 503);
  const id = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!id.startsWith("cs_")) return bad("bad_session_id");
  const session = await stripe.checkout.sessions.retrieve(id);
  return Response.json({ status: session.status, paymentStatus: session.payment_status });
}
